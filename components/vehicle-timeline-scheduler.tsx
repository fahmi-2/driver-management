'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Truck,
  X,
  User,
  Check,
  AlertCircle,
  Eye,
  CalendarDays,
  Sparkles,
  Search,
  Filter
} from 'lucide-react'
import type { Trip, Vehicle } from '@/lib/store'
import { useStore, ymd, fmtDate } from '@/lib/store'
import type { Account } from '@/lib/accounts'
import { Pill, btnPrimary, btnGhost, inputCls, useToast } from './ui-bits'

export type TimelineViewMode = 'daily' | 'weekly' | 'monthly'

export type TimelineSelection = {
  selectedVehiclePlate: string
  startTime: string // HH:mm
  endTime: string // HH:mm
  date: string // YYYY-MM-DD
}

interface VehicleTimelineSchedulerProps {
  vehicles: Vehicle[]
  bookings: Trip[]
  user: Account
  interactive?: boolean // If false, View-Only mode (Universal Dashboard)
  selectedPendingTrip?: Trip | null // Connected pending request in Scheduling Center
  onTimeSelect?: (selection: TimelineSelection) => void
  onBlockClick?: (trip: Trip) => void
  viewMode?: TimelineViewMode
  onViewModeChange?: (mode: TimelineViewMode) => void
}

function minToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function timeToMin(timeStr?: string): number | null {
  if (!timeStr) return null
  const [h, m] = timeStr.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

function isoToMin(iso?: string): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.getHours() * 60 + d.getMinutes()
}

export function VehicleTimelineScheduler({
  vehicles,
  bookings,
  user,
  interactive,
  selectedPendingTrip,
  onTimeSelect,
  onBlockClick,
  viewMode: controlledViewMode,
  onViewModeChange,
}: VehicleTimelineSchedulerProps) {
  const [internalViewMode, setInternalViewMode] = useState<TimelineViewMode>('daily')
  const viewMode = controlledViewMode ?? internalViewMode
  const setViewMode = (m: TimelineViewMode) => {
    setInternalViewMode(m)
    onViewModeChange?.(m)
  }

  const [currentDate, setCurrentDate] = useState<string>(() => ymd())
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Maintenance'>('ALL')

  // Drag selection state (Only active in Interactive mode)
  const isInteractive = interactive ?? user.role === 'admin'
  const [dragState, setDragState] = useState<{
    isDragging: boolean
    vehiclePlate: string | null
    startUnit: number | null
    currentUnit: number | null
  }>({
    isDragging: false,
    vehiclePlate: null,
    startUnit: null,
    currentUnit: null,
  })

  const [hoveredTrip, setHoveredTrip] = useState<Trip | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const isAdmin = user.role === 'admin'

  // Filter vehicles by search and status
  const visibleVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        v.plate.toLowerCase().includes(searchFilter.toLowerCase()) ||
        v.type.toLowerCase().includes(searchFilter.toLowerCase())
      const matchStatus = statusFilter === 'ALL' || (v.status || 'Active') === statusFilter
      return matchSearch && matchStatus
    })
  }, [vehicles, searchFilter, statusFilter])

  // --- TIME COLUMNS CONFIGURATION ---
  // Daily: 24 Hours (00:00 to 24:00, 24 1-hour columns or 48 30-min columns)
  // We use 24 hours with 1-hour primary segments (24 cols)
  const dailyColumns = useMemo(() => {
    const cols = []
    for (let h = 0; h < 24; h++) {
      cols.push({
        index: h,
        label: `${String(h).padStart(2, '0')}:00`,
        startMin: h * 60,
        endMin: (h + 1) * 60,
      })
    }
    return cols
  }, [])

  // Weekly: 7 Days around current date
  const weeklyColumns = useMemo(() => {
    const cols = []
    const base = new Date(currentDate + 'T00:00:00')
    // Get start of week (Monday)
    const dayOfWeek = base.getDay() || 7 // 1 (Mon) - 7 (Sun)
    const startOfWeek = new Date(base)
    startOfWeek.setDate(base.getDate() - (dayOfWeek - 1))

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      const dayStr = ymd(d)
      cols.push({
        index: i,
        date: dayStr,
        label: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'numeric' }),
        fullDate: dayStr,
        isToday: dayStr === ymd(),
      })
    }
    return cols
  }, [currentDate])

  // Monthly: Days of current month
  const monthlyColumns = useMemo(() => {
    const cols = []
    const [y, m] = currentDate.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayDate = new Date(`${dayStr}T00:00:00`)
      cols.push({
        index: d - 1,
        date: dayStr,
        dayNum: d,
        label: `${d}`,
        weekday: dayDate.toLocaleDateString('id-ID', { weekday: 'narrow' }),
        fullDate: dayStr,
        isToday: dayStr === ymd(),
      })
    }
    return cols
  }, [currentDate])

  // Map trips to vehicle plate and coordinates based on viewMode
  const vehicleBookingsMap = useMemo(() => {
    const map = new Map<string, { trip: Trip; leftPct: number; widthPct: number; timeLabel: string }[]>()
    vehicles.forEach((v) => map.set(v.plate, []))

    if (viewMode === 'daily') {
      const dayTrips = bookings.filter((t) => t.date === currentDate && t.status !== 'REJECTED')
      dayTrips.forEach((trip) => {
        if (!trip.plate) return
        let sMin = trip.timeGo ? isoToMin(trip.timeGo) : timeToMin(trip.estDeparture)
        let eMin = trip.timeBack
          ? isoToMin(trip.timeBack)
          : trip.estReturn
          ? timeToMin(trip.estReturn)
          : trip.durationMin && sMin
          ? sMin + trip.durationMin
          : sMin
          ? sMin + 90
          : null

        if (sMin == null) return
        if (eMin == null || eMin <= sMin) eMin = sMin + 60

        // In 24h timeline (0 to 1440 mins)
        const leftPct = (sMin / 1440) * 100
        const widthPct = Math.max(1.8, ((eMin - sMin) / 1440) * 100)

        const list = map.get(trip.plate) || []
        list.push({
          trip,
          leftPct,
          widthPct,
          timeLabel: `${minToTime(sMin)} - ${minToTime(eMin)}`,
        })
        map.set(trip.plate, list)
      })
    } else if (viewMode === 'weekly') {
      const weekDates = new Set(weeklyColumns.map((c) => c.date))
      const weekTrips = bookings.filter((t) => weekDates.has(t.date) && t.status !== 'REJECTED')
      weekTrips.forEach((trip) => {
        if (!trip.plate) return
        const colIdx = weeklyColumns.findIndex((c) => c.date === trip.date)
        if (colIdx === -1) return

        const rawSMin = trip.timeGo ? isoToMin(trip.timeGo) : timeToMin(trip.estDeparture)
        const sMin = rawSMin ?? 480
        const rawEMin = trip.timeBack ? isoToMin(trip.timeBack) : trip.estReturn ? timeToMin(trip.estReturn) : null
        let eMin = rawEMin ?? (sMin + 120)
        if (eMin <= sMin) eMin = sMin + 60

        // Placement inside the 7-day grid: each day is 100/7 %
        const dayWidthPct = 100 / 7
        const leftPct = colIdx * dayWidthPct + (sMin / 1440) * dayWidthPct
        const widthPct = Math.max(1.5, ((eMin - sMin) / 1440) * dayWidthPct)

        const list = map.get(trip.plate) || []
        list.push({
          trip,
          leftPct,
          widthPct,
          timeLabel: `${trip.date} (${minToTime(sMin)} - ${minToTime(eMin)})`,
        })
        map.set(trip.plate, list)
      })
    } else if (viewMode === 'monthly') {
      const [y, m] = currentDate.split('-').map(Number)
      const daysCount = monthlyColumns.length
      const monthPrefix = `${y}-${String(m).padStart(2, '0')}`
      const monthTrips = bookings.filter((t) => t.date.startsWith(monthPrefix) && t.status !== 'REJECTED')

      monthTrips.forEach((trip) => {
        if (!trip.plate) return
        const dayNum = parseInt(trip.date.split('-')[2], 10)
        if (isNaN(dayNum) || dayNum < 1 || dayNum > daysCount) return

        const colIdx = dayNum - 1
        const dayWidthPct = 100 / daysCount
        const leftPct = colIdx * dayWidthPct + 0.1
        const widthPct = Math.max(1.2, dayWidthPct * 0.85)

        const list = map.get(trip.plate) || []
        list.push({
          trip,
          leftPct,
          widthPct,
          timeLabel: `${trip.date} (${trip.estDeparture || 'Trip'})`,
        })
        map.set(trip.plate, list)
      })
    }

    return map
  }, [bookings, currentDate, monthlyColumns, vehicles, viewMode, weeklyColumns])

  // --- DRAG TO SELECT LOGIC ---
  const handleUnitMouseDown = (plate: string, unitIndex: number, e: React.MouseEvent) => {
    if (!isInteractive || e.button !== 0) return
    e.preventDefault()

    setDragState({
      isDragging: true,
      vehiclePlate: plate,
      startUnit: unitIndex,
      currentUnit: unitIndex,
    })
  }

  const handleUnitMouseEnter = (plate: string, unitIndex: number) => {
    if (!isInteractive || !dragState.isDragging || dragState.vehiclePlate !== plate) return
    setDragState((prev) => ({
      ...prev,
      currentUnit: unitIndex,
    }))
  }

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.vehiclePlate || dragState.startUnit === null || dragState.currentUnit === null) {
      setDragState({ isDragging: false, vehiclePlate: null, startUnit: null, currentUnit: null })
      return
    }

    const minUnit = Math.min(dragState.startUnit, dragState.currentUnit)
    const maxUnit = Math.max(dragState.startUnit, dragState.currentUnit)
    const selectedVehiclePlate = dragState.vehiclePlate

    setDragState({ isDragging: false, vehiclePlate: null, startUnit: null, currentUnit: null })

    let startTime = '08:00'
    let endTime = '10:00'
    let targetDate = currentDate

    if (viewMode === 'daily') {
      startTime = `${String(minUnit).padStart(2, '0')}:00`
      const endHour = Math.min(24, maxUnit + 1)
      endTime = endHour === 24 ? '23:59' : `${String(endHour).padStart(2, '0')}:00`
    } else if (viewMode === 'weekly') {
      targetDate = weeklyColumns[minUnit]?.date || currentDate
      startTime = selectedPendingTrip?.estDeparture || '08:00'
      const startMin = timeToMin(startTime) || 480
      endTime = minToTime(startMin + 120)
    } else if (viewMode === 'monthly') {
      targetDate = monthlyColumns[minUnit]?.date || currentDate
      startTime = selectedPendingTrip?.estDeparture || '08:00'
      const startMin = timeToMin(startTime) || 480
      endTime = minToTime(startMin + 120)
    }

    if (onTimeSelect) {
      onTimeSelect({
        selectedVehiclePlate,
        startTime,
        endTime,
        date: targetDate,
      })
    }
  }, [currentDate, dragState, monthlyColumns, onTimeSelect, selectedPendingTrip?.estDeparture, viewMode, weeklyColumns])

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (dragState.isDragging) handleMouseUp()
    }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [dragState.isDragging, handleMouseUp])

  // Navigation handlers
  const navigateTimeline = (offset: number) => {
    const d = new Date(currentDate + 'T00:00:00')
    if (viewMode === 'daily') {
      d.setDate(d.getDate() + offset)
    } else if (viewMode === 'weekly') {
      d.setDate(d.getDate() + offset * 7)
    } else if (viewMode === 'monthly') {
      d.setMonth(d.getMonth() + offset)
    }
    setCurrentDate(ymd(d))
  }

  // Date Header Title
  const headerDateTitle = useMemo(() => {
    const d = new Date(currentDate + 'T00:00:00')
    if (viewMode === 'daily') {
      return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    } else if (viewMode === 'weekly') {
      const first = weeklyColumns[0]?.fullDate
      const last = weeklyColumns[6]?.fullDate
      return `${first ? fmtDate(first) : ''} – ${last ? fmtDate(last) : ''}`
    } else {
      return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    }
  }, [currentDate, viewMode, weeklyColumns])

  return (
    <div className="timeline-calendar-light relative select-none rounded-2xl border border-slate-300 bg-white p-5 shadow-lg">
      {/* Top Bar: Title, Mode Indicator, View Mode Switcher, Date Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf1ee] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-[#10251c]">Jadwal Timeline Kendaraan</h2>
            {isInteractive ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#dff4e8] px-2.5 py-0.5 text-[10px] font-bold text-[#075b3d] shadow-xs">
                <span className="size-1.5 animate-pulse rounded-full bg-[#075b3d]" />
                Interactive Mode (Admin Utama)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f1f5f2] px-2.5 py-0.5 text-[10px] font-semibold text-[#62736b]">
                <Eye size={11} className="text-[#075b3d]" />
                View-Only Monitoring
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-[#708078]">
            {isInteractive
              ? selectedPendingTrip
                ? `Pilih slot kendaraan untuk menugaskan pengajuan: ${selectedPendingTrip.destination} (${selectedPendingTrip.guest})`
                : 'Klik & drag pada baris kendaraan untuk mengalokasikan armada secara langsung.'
              : 'Kalender timeline armada 24 jam real-time. Memantau ketersediaan seluruh kendaraan.'}
          </p>
        </div>

        {/* View Mode Selector (Daily / Weekly / Monthly) + Navigation */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-[#f0f4f1] p-1 text-xs font-semibold">
            {(['daily', 'weekly', 'monthly'] as TimelineViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-[11px] capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-white font-bold text-[#075b3d] shadow-xs'
                    : 'text-[#62736b] hover:text-[#10251c]'
                }`}
              >
                {mode === 'daily' ? 'Harian (24 Jam)' : mode === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 rounded-xl border border-[#dce7df] bg-[#f8faf9] p-1 shadow-inner">
            <button
              onClick={() => navigateTimeline(-1)}
              className="flex size-7 items-center justify-center rounded-lg text-[#63726a] hover:bg-white hover:shadow-xs transition"
              title="Sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setCurrentDate(ymd())}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                currentDate === ymd() ? 'bg-[#075b3d] text-white shadow-xs' : 'text-[#63726a] hover:bg-white'
              }`}
            >
              Hari Ini
            </button>
            <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[#10251c]">
              <Calendar size={13} className="text-[#075b3d]" />
              <span className="whitespace-nowrap">{headerDateTitle}</span>
            </div>
            <button
              onClick={() => navigateTimeline(1)}
              className="flex size-7 items-center justify-center rounded-lg text-[#63726a] hover:bg-white hover:shadow-xs transition"
              title="Berikutnya"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Subheader Row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-[#93a097]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cari plat atau armada…"
              className="h-8 w-44 rounded-lg border border-[#dce7df] bg-[#fafcfb] pl-8 pr-2 text-[11px] outline-none focus:border-[#075b3d]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 rounded-lg border border-[#dce7df] bg-[#fafcfb] px-2 text-[11px] outline-none focus:border-[#075b3d]"
          >
            <option value="ALL">Semua Status Armada</option>
            <option value="Active">Hanya Aktif</option>
            <option value="Maintenance">Sedang Bengkel/Maintenance</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-[#63726a]">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-gradient-to-r from-[#2563eb] to-[#1d4ed8]" />
            <span>Terjadwal / On-Trip</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded bg-[#475569]" />
            <span>Selesai</span>
          </span>
          {isInteractive && (
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded border border-blue-400 bg-blue-100" />
              <span>Drag Seleksi</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid Container with Frozen Vehicle Column & Scrollable Time Axis */}
      <div className="mt-4 overflow-hidden rounded-xl border border-[#edf1ee]" ref={gridRef}>
        <div className="overflow-x-auto pb-1">
          <div className="min-w-max">
            {/* Header Row: Frozen Resources Header (Sticky Left) + Scrollable Time Axis */}
            <div className="flex border-b border-[#edf1ee] bg-[#f8faf9] text-[11px] font-bold text-[#62736b]">
              {/* Sticky Frozen Vehicle Column Header */}
              <div className="sticky left-0 z-30 flex w-[210px] shrink-0 items-center gap-2 border-r border-[#edf1ee] bg-[#f8faf9] py-3 pl-3 pr-2 text-xs uppercase tracking-wider text-[#9aa7a0] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)]">
                <Truck size={14} className="text-[#075b3d]" />
                Kendaraan ({visibleVehicles.length})
              </div>

              {/* Time / Date Axis Columns */}
              <div className="flex shrink-0">
                {viewMode === 'daily' &&
                  dailyColumns.map((col) => (
                    <div
                      key={col.index}
                      className="w-16 shrink-0 text-center font-mono text-[10px] text-[#718279] border-l border-[#edf1ee] py-3 first:border-l-0"
                    >
                      <span className={col.index % 2 === 0 ? 'font-bold text-[#1a382c]' : 'text-[#87968e]'}>
                        {col.label}
                      </span>
                    </div>
                  ))}

                {viewMode === 'weekly' &&
                  weeklyColumns.map((col) => (
                    <div
                      key={col.index}
                      className={`w-36 shrink-0 text-center text-[10px] border-l border-[#edf1ee] py-2.5 first:border-l-0 ${
                        col.isToday ? 'bg-[#eef8f3] font-bold text-[#075b3d]' : 'text-[#62736b]'
                      }`}
                    >
                      <div>{col.label}</div>
                    </div>
                  ))}

                {viewMode === 'monthly' &&
                  monthlyColumns.map((col) => (
                    <div
                      key={col.index}
                      className={`w-12 shrink-0 text-center text-[10px] border-l border-[#edf1ee] py-2 first:border-l-0 ${
                        col.isToday ? 'bg-[#eef8f3] font-bold text-[#075b3d]' : 'text-[#62736b]'
                      }`}
                    >
                      <div className="font-mono">{col.label}</div>
                      <div className="text-[9px] text-[#93a097]">{col.weekday}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Vehicle Rows */}
            <div className="divide-y divide-[#edf1ee] bg-white">
              {visibleVehicles.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#9aa7a0]">
                  Tidak ada kendaraan yang sesuai filter.
                </div>
              ) : (
                visibleVehicles.map((v) => {
                  const bookingsList = vehicleBookingsMap.get(v.plate) || []
                  const isUnderMaintenance = v.status === 'Maintenance'
                  const isVehicleDragging = isInteractive && dragState.isDragging && dragState.vehiclePlate === v.plate
                  const dragMinUnit = isVehicleDragging && dragState.startUnit !== null && dragState.currentUnit !== null
                    ? Math.min(dragState.startUnit, dragState.currentUnit)
                    : null
                  const dragMaxUnit = isVehicleDragging && dragState.startUnit !== null && dragState.currentUnit !== null
                    ? Math.max(dragState.startUnit, dragState.currentUnit)
                    : null

                  const totalUnits =
                    viewMode === 'daily'
                      ? dailyColumns.length
                      : viewMode === 'weekly'
                      ? weeklyColumns.length
                      : monthlyColumns.length

                  const unitWidthPx = viewMode === 'daily' ? 64 : viewMode === 'weekly' ? 144 : 48
                  const rowGridWidthPx = totalUnits * unitWidthPx

                  return (
                    <div
                      key={v.plate}
                      className={`flex items-center group/row transition-colors ${
                        isUnderMaintenance ? 'bg-[#fffbfa]' : 'hover:bg-[#fafcfb]'
                      }`}
                    >
                      {/* Sticky Frozen Vehicle Resource Column */}
                      <div className="sticky left-0 z-20 flex w-[210px] shrink-0 items-center justify-between border-r border-[#edf1ee] bg-white py-3 pl-3 pr-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] group-hover/row:bg-[#fafcfb]">
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-[#10251c] tracking-tight truncate">{v.plate}</p>
                          <p className="text-[10px] text-[#86958d] truncate">{v.type}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
                            isUnderMaintenance
                              ? 'bg-[#fee2e2] text-[#b91c1c]'
                              : 'bg-[#eaf4ee] text-[#0a6645]'
                          }`}
                        >
                          {v.status || 'Active'}
                        </span>
                      </div>

                      {/* Timeline Grid Body (Scrollable with columns) */}
                      <div
                        style={{ width: `${rowGridWidthPx}px` }}
                        className="relative h-14 shrink-0 flex items-center"
                      >
                        {/* Maintenance Banner */}
                        {isUnderMaintenance && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-stripes-red/10 text-[10px] font-bold text-red-600">
                            Unit Dalam Perbaikan / Servis Rutin
                          </div>
                        )}

                        {/* Interactive Grid Cells for Dragging */}
                        <div className="absolute inset-0 flex h-full w-full">
                          {Array.from({ length: totalUnits }).map((_, unitIdx) => {
                            const isDragSelected =
                              isVehicleDragging &&
                              dragMinUnit !== null &&
                              dragMaxUnit !== null &&
                              unitIdx >= dragMinUnit &&
                              unitIdx <= dragMaxUnit

                            return (
                              <div
                                key={unitIdx}
                                style={{ width: `${unitWidthPx}px` }}
                                onMouseDown={(e) => !isUnderMaintenance && handleUnitMouseDown(v.plate, unitIdx, e)}
                                onMouseEnter={() => !isUnderMaintenance && handleUnitMouseEnter(v.plate, unitIdx)}
                                className={`shrink-0 h-full border-l border-[#f1f5f2] first:border-l-0 transition-colors ${
                                  isInteractive && !isUnderMaintenance
                                    ? 'cursor-crosshair'
                                    : 'cursor-default'
                                } ${
                                  isDragSelected
                                    ? 'bg-blue-100/70 border-blue-300'
                                    : isInteractive && !isUnderMaintenance
                                    ? 'hover:bg-[#f0f8f3]/60'
                                    : ''
                                }`}
                              />
                            )
                          })}
                        </div>

                        {/* Render Booked Blocks */}
                        {bookingsList.map(({ trip, leftPct, widthPct, timeLabel }) => {
                          const isOwnTrip = trip.requesterUser === user.username
                          const canSeeDetails = isAdmin || isOwnTrip
                          const displayTitle = canSeeDetails
                            ? trip.purpose || trip.destination
                            : 'Booked'
                          const displaySub = canSeeDetails
                            ? `${trip.guest} · ${trip.destination}`
                            : 'Operasional Lain'

                          return (
                            <div
                              key={trip.id}
                              onClick={() => onBlockClick?.(trip)}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                setHoverPos({ x: rect.left, y: rect.bottom + 4 })
                                setHoveredTrip(trip)
                              }}
                              onMouseLeave={() => setHoveredTrip(null)}
                              style={{
                                left: `${leftPct}%`,
                                width: `${Math.max(widthPct, 2.5)}%`,
                              }}
                              className={`absolute top-2 bottom-2 z-10 flex cursor-pointer flex-col justify-center overflow-hidden rounded-lg px-2.5 shadow-sm transition-all hover:z-20 hover:shadow-md hover:ring-2 hover:ring-blue-400 active:scale-[0.99] ${
                                trip.status === 'ON_TRIP'
                                  ? 'bg-gradient-to-r from-[#1d4ed8] to-[#1e40af] text-white ring-1 ring-blue-600'
                                  : trip.status === 'DONE'
                                  ? 'bg-gradient-to-r from-[#475569] to-[#334155] text-white opacity-85'
                                  : 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                                <p className="truncate text-[10px] font-bold tracking-tight uppercase">
                                  {displayTitle}
                                </p>
                              </div>
                              <p className="truncate text-[9px] opacity-85 font-medium">
                                {displaySub} ({timeLabel})
                              </p>
                            </div>
                          )
                        })}

                        {/* Drag Selection Overlay Feedback */}
                        {isVehicleDragging && dragMinUnit !== null && dragMaxUnit !== null && (
                          <div
                            style={{
                              left: `${(dragMinUnit / totalUnits) * 100}%`,
                              width: `${((dragMaxUnit - dragMinUnit + 1) / totalUnits) * 100}%`,
                            }}
                            className="pointer-events-none absolute top-1 bottom-1 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-[#2563eb] bg-[#dbeafe]/80 text-[#1e40af] shadow-md backdrop-blur-xs transition-all"
                          >
                            <span className="text-[10px] font-bold tracking-tight px-1.5 py-0.5 rounded bg-white/90 shadow-xs">
                              {viewMode === 'daily'
                                ? `${String(dragMinUnit).padStart(2, '0')}:00 – ${String(dragMaxUnit + 1).padStart(2, '0')}:00`
                                : `${dragMaxUnit - dragMinUnit + 1} Periode Terpilih`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip Hover */}
      {hoveredTrip && hoverPos && (
        <div
          style={{ top: `${hoverPos.y}px`, left: `${Math.min(hoverPos.x, window.innerWidth - 300)}px` }}
          className="fixed z-50 w-72 rounded-xl border border-[#dce7df] bg-white p-3.5 shadow-xl pointer-events-none animate-in fade-in-50 zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b border-[#edf1ee] pb-1.5 mb-1.5">
            <span className="text-[10px] font-bold text-[#075b3d] uppercase tracking-wider">
              {hoveredTrip.id} · {hoveredTrip.category}
            </span>
            <span className="rounded-full bg-[#eef5f0] px-2 py-0.5 text-[9px] font-bold text-[#087348]">
              {hoveredTrip.status}
            </span>
          </div>

          <p className="text-xs font-bold text-[#10251c]">
            {isAdmin || hoveredTrip.requesterUser === user.username
              ? hoveredTrip.purpose || hoveredTrip.destination
              : 'Kendaraan Sedang Bertugas'}
          </p>

          <div className="mt-2 space-y-1 text-[11px] text-[#63726a]">
            {(isAdmin || hoveredTrip.requesterUser === user.username) && (
              <>
                <p><span className="text-[#93a097]">Tamu/User:</span> {hoveredTrip.guest}</p>
                <p><span className="text-[#93a097]">Tujuan:</span> {hoveredTrip.destination}</p>
                <p><span className="text-[#93a097]">Departemen:</span> {hoveredTrip.dept}</p>
              </>
            )}
            <p>
              <span className="text-[#93a097]">Tanggal & Jam:</span> {hoveredTrip.date} ({hoveredTrip.estDeparture} {hoveredTrip.estReturn ? `– ${hoveredTrip.estReturn}` : ''} WIB)
            </p>
            {hoveredTrip.plate && (
              <p><span className="text-[#93a097]">Kendaraan:</span> {hoveredTrip.plate}</p>
            )}
            {hoveredTrip.adminNote && (
              <p className="rounded-md bg-[#f7faf8] p-1 text-[10px] text-[#075b3d]">
                <strong>Catatan Admin:</strong> {hoveredTrip.adminNote}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
