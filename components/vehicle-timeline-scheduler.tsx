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
import { useStore, ymd, fmtDate, fmtTime } from '@/lib/store'
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
  const { db } = useStore()
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
  const isInteractive = interactive ?? (user.role === 'admin' || user.role === 'admin_lobby')
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
  const isAdmin = user.role === 'admin' || user.role === 'admin_lobby'

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
    const map = new Map<string, any[]>()
    vehicles.forEach((v) => map.set(v.plate, []))

    if (viewMode === 'daily') {
      const dayTrips = bookings.filter((t) => t.date === currentDate && t.status !== 'REJECTED')
      dayTrips.forEach((trip) => {
        if (!trip.plate) return

        // 1. Plan coordinates
        const pStart = timeToMin(trip.estDeparture) ?? 480
        const rawPEnd = trip.estReturn ? timeToMin(trip.estReturn) : pStart + (trip.estimated_duration_minutes || 120)
        let pEnd = rawPEnd ?? pStart + 60
        if (pEnd <= pStart) pEnd = pStart + 60
        const planLeftPct = (pStart / 1440) * 100
        const planWidthPct = Math.max(2.0, ((pEnd - pStart) / 1440) * 100)
        const planTimeLabel = `${minToTime(pStart)} - ${minToTime(pEnd)}`

        // 2. Actual coordinates (jika ada eksekusi lapangan: timeGo terisi)
        let hasActual = false
        let actualLeftPct = 0
        let actualWidthPct = 0
        let actualTimeLabel = ''
        let isDelayed = false
        let delayMins = 0

        if (trip.timeGo) {
          hasActual = true
          const aStart = isoToMin(trip.timeGo) ?? pStart
          const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
          const rawAEnd = trip.timeBack
            ? isoToMin(trip.timeBack)
            : trip.status === 'ON_TRIP'
            ? nowMin
            : trip.durationMin
            ? aStart + trip.durationMin
            : aStart + 60
          let aEnd = rawAEnd ?? aStart + 60
          if (aEnd <= aStart) aEnd = aStart + 30

          actualLeftPct = (aStart / 1440) * 100
          actualWidthPct = Math.max(2.2, ((aEnd - aStart) / 1440) * 100)
          actualTimeLabel = `${fmtTime(trip.timeGo)} - ${trip.timeBack ? fmtTime(trip.timeBack) : 'Sedang Berjalan'}`

          const actualDuration = aEnd - aStart
          const planDuration = pEnd - pStart
          if (actualDuration > planDuration) {
            isDelayed = true
            delayMins = actualDuration - planDuration
          }
        }

        const assignedDriver = trip.driverId ? db.drivers.find((d) => d.id === trip.driverId) : null

        const list = map.get(trip.plate) || []
        list.push({
          trip,
          planLeftPct,
          planWidthPct,
          planTimeLabel,
          hasActual,
          actualLeftPct,
          actualWidthPct,
          actualTimeLabel,
          isDelayed,
          delayMins,
          driverName: assignedDriver?.name,
        })
        map.set(trip.plate, list)

        // 3. Mobil Lain Block Logic:
        // Jika driver ditugaskan ke kendaraan yang BUKAN kendaraan default-nya,
        // sistem otomatis membuat blocked schedule pada baris Mobil Default-nya.
        const isUsingOtherCar = !!trip.isOtherVehicle || (!!assignedDriver?.defaultPlate && assignedDriver.defaultPlate !== trip.plate)
        const defaultPlateToBlock = trip.blockedDefaultPlate || (isUsingOtherCar && assignedDriver?.defaultPlate ? assignedDriver.defaultPlate : null)

        if (defaultPlateToBlock && map.has(defaultPlateToBlock)) {
          const blockedList = map.get(defaultPlateToBlock) || []
          blockedList.push({
            trip: {
              ...trip,
              purpose: trip.blockedReason || `Driver sedang bertugas di ${trip.plate || trip.otherVehicleName || 'Mobil Luar'}`,
            },
            planLeftPct,
            planWidthPct,
            planTimeLabel,
            hasActual: false,
            isBlockedDefault: true,
            blockedCarName: trip.isOtherVehicle ? (trip.otherVehicleName || 'Mobil Luar') : trip.plate,
            driverName: assignedDriver?.name || 'Driver',
          })
          map.set(defaultPlateToBlock, blockedList)
        }
      })
    } else if (viewMode === 'weekly') {
      const weekDates = new Set(weeklyColumns.map((c) => c.date))
      const weekTrips = bookings.filter((t) => weekDates.has(t.date) && t.status !== 'REJECTED')
      weekTrips.forEach((trip) => {
        if (!trip.plate) return
        const colIdx = weeklyColumns.findIndex((c) => c.date === trip.date)
        if (colIdx === -1) return

        const pStart = timeToMin(trip.estDeparture) ?? 480
        const rawPEnd = trip.estReturn ? timeToMin(trip.estReturn) : null
        let pEnd = rawPEnd ?? pStart + 120
        if (pEnd <= pStart) pEnd = pStart + 60

        const dayWidthPct = 100 / 7
        const planLeftPct = colIdx * dayWidthPct + (pStart / 1440) * dayWidthPct
        const planWidthPct = Math.max(1.5, ((pEnd - pStart) / 1440) * dayWidthPct)

        let hasActual = false
        let actualLeftPct = 0
        let actualWidthPct = 0
        let actualTimeLabel = ''
        let isDelayed = false
        let delayMins = 0

        if (trip.timeGo) {
          hasActual = true
          const aStart = isoToMin(trip.timeGo) ?? pStart
          const rawAEnd = trip.timeBack ? isoToMin(trip.timeBack) : (aStart + (trip.durationMin || 60))
          let aEnd = rawAEnd ?? aStart + 60
          actualLeftPct = colIdx * dayWidthPct + (aStart / 1440) * dayWidthPct
          actualWidthPct = Math.max(1.8, ((aEnd - aStart) / 1440) * dayWidthPct)
          actualTimeLabel = `${fmtTime(trip.timeGo)} - ${trip.timeBack ? fmtTime(trip.timeBack) : 'Aktif'}`

          if (aEnd - aStart > pEnd - pStart) {
            isDelayed = true
            delayMins = (aEnd - aStart) - (pEnd - pStart)
          }
        }

        const assignedDriver = trip.driverId ? db.drivers.find((d) => d.id === trip.driverId) : null

        const list = map.get(trip.plate) || []
        list.push({
          trip,
          planLeftPct,
          planWidthPct,
          planTimeLabel: `${trip.date} (${minToTime(pStart)} - ${minToTime(pEnd)})`,
          hasActual,
          actualLeftPct,
          actualWidthPct,
          actualTimeLabel,
          isDelayed,
          delayMins,
          driverName: assignedDriver?.name,
        })
        map.set(trip.plate, list)

        const isUsingOtherCar = !!trip.isOtherVehicle || (!!assignedDriver?.defaultPlate && assignedDriver.defaultPlate !== trip.plate)
        const defaultPlateToBlock = trip.blockedDefaultPlate || (isUsingOtherCar && assignedDriver?.defaultPlate ? assignedDriver.defaultPlate : null)

        if (defaultPlateToBlock && map.has(defaultPlateToBlock)) {
          const blockedList = map.get(defaultPlateToBlock) || []
          blockedList.push({
            trip: {
              ...trip,
              purpose: trip.blockedReason || `Driver sedang bertugas di ${trip.plate || trip.otherVehicleName || 'Mobil Luar'}`,
            },
            planLeftPct,
            planWidthPct,
            planTimeLabel: `${trip.date} (${minToTime(pStart)} - ${minToTime(pEnd)})`,
            hasActual: false,
            isBlockedDefault: true,
            blockedCarName: trip.isOtherVehicle ? (trip.otherVehicleName || 'Mobil Luar') : trip.plate,
            driverName: assignedDriver?.name || 'Driver',
          })
          map.set(defaultPlateToBlock, blockedList)
        }
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
        const planLeftPct = colIdx * dayWidthPct + 0.1
        const planWidthPct = Math.max(1.2, dayWidthPct * 0.85)

        const assignedDriver = trip.driverId ? db.drivers.find((d) => d.id === trip.driverId) : null

        const list = map.get(trip.plate) || []
        list.push({
          trip,
          planLeftPct,
          planWidthPct,
          planTimeLabel: `${trip.date} (${trip.estDeparture || 'Trip'})`,
          hasActual: !!trip.timeGo,
          driverName: assignedDriver?.name,
        })
        map.set(trip.plate, list)
      })
    }

    return map
  }, [bookings, currentDate, db.drivers, monthlyColumns, vehicles, viewMode, weeklyColumns])

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
      // Setiap kolom berlabel "HH:00" adalah rentang 1 jam penuh dari HH:00 hingga (HH+1):00.
      // - Klik 1 kolom (misal kolom 01:00) => durasi 1 jam: 01:00 s/d 02:00.
      // - Drag dari kolom 01:00 s/d kolom 02:00 => mencakup jam 01:00 s/d 03:00 (seluruh slot jam 02 dilewati).
      const endHour = Math.min(24, maxUnit + 1)
      endTime = endHour >= 24 ? '23:59' : `${String(endHour).padStart(2, '0')}:00`
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

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const autoScrollAnimationRef = useRef<number | null>(null)
  const lastMousePosRef = useRef<{ clientX: number; clientY: number } | null>(null)

  // Auto-scroll logic saat dragging
  const updateUnitFromPoint = useCallback((clientX: number, clientY: number) => {
    if (!dragState.vehiclePlate) return
    const el = document.elementFromPoint(clientX, clientY)
    if (!el) return
    const cellEl = el.closest('[data-timeline-unit-index]') as HTMLElement | null
    if (cellEl && cellEl.dataset.plate === dragState.vehiclePlate) {
      const uIdx = parseInt(cellEl.dataset.timelineUnitIndex || '-1', 10)
      if (uIdx >= 0) {
        setDragState((prev) => {
          if (prev.currentUnit === uIdx) return prev
          return { ...prev, currentUnit: uIdx }
        })
      }
    }
  }, [dragState.vehiclePlate])

  useEffect(() => {
    if (!dragState.isDragging) {
      if (autoScrollAnimationRef.current) {
        cancelAnimationFrame(autoScrollAnimationRef.current)
        autoScrollAnimationRef.current = null
      }
      return
    }

    const checkAutoScroll = () => {
      const container = scrollContainerRef.current
      const mouse = lastMousePosRef.current

      if (container && mouse) {
        const rect = container.getBoundingClientRect()
        // Sticky vehicle column width is 220px
        const leftZone = rect.left + 220 + 60
        const rightZone = rect.right - 60

        let scrollSpeed = 0

        if (mouse.clientX > rightZone && mouse.clientX <= rect.right + 100) {
          // Scroll ke kanan
          const distance = Math.max(1, mouse.clientX - rightZone)
          scrollSpeed = Math.min(22, Math.round(distance / 2.5) + 3)
        } else if (mouse.clientX < leftZone && mouse.clientX >= rect.left + 180) {
          // Scroll ke kiri
          const distance = Math.max(1, leftZone - mouse.clientX)
          scrollSpeed = -Math.min(22, Math.round(distance / 2.5) + 3)
        }

        if (scrollSpeed !== 0) {
          container.scrollLeft += scrollSpeed
          // Update unit di bawah pointer setelah scroll berubah
          updateUnitFromPoint(mouse.clientX, mouse.clientY)
        }
      }

      autoScrollAnimationRef.current = requestAnimationFrame(checkAutoScroll)
    }

    autoScrollAnimationRef.current = requestAnimationFrame(checkAutoScroll)

    const handleGlobalMouseMove = (e: MouseEvent) => {
      lastMousePosRef.current = { clientX: e.clientX, clientY: e.clientY }
      updateUnitFromPoint(e.clientX, e.clientY)
    }

    const handleGlobalMouseUp = () => {
      handleMouseUp()
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      if (autoScrollAnimationRef.current) {
        cancelAnimationFrame(autoScrollAnimationRef.current)
        autoScrollAnimationRef.current = null
      }
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [dragState.isDragging, handleMouseUp, updateUnitFromPoint])

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
    <div className="timeline-calendar-wrapper relative select-none rounded-2xl border border-slate-300 bg-white p-5 shadow-xl text-slate-800">
      {/* Top Bar: Title, Mode Indicator, View Mode Switcher, Date Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Jadwal Timeline Kendaraan</h2>
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
          <div className="flex rounded-xl bg-slate-100 border border-slate-300 p-1 text-xs font-semibold">
            {(['daily', 'weekly', 'monthly'] as TimelineViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-[11px] capitalize transition-all ${
                  viewMode === mode
                    ? 'bg-white font-extrabold text-emerald-800 border border-slate-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 font-semibold'
                }`}
              >
                {mode === 'daily' ? 'Harian (24 Jam)' : mode === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 p-1 shadow-inner">
            <button
              onClick={() => navigateTimeline(-1)}
              className="flex size-7 items-center justify-center rounded-lg text-slate-700 hover:bg-white hover:text-slate-900 shadow-xs transition"
              title="Sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setCurrentDate(ymd())}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                currentDate === ymd() ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-700 hover:bg-white'
              }`}
            >
              Hari Ini
            </button>
            <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-900">
              <Calendar size={13} className="text-emerald-700" />
              <span className="whitespace-nowrap">{headerDateTitle}</span>
            </div>
            <button
              onClick={() => navigateTimeline(1)}
              className="flex size-7 items-center justify-center rounded-lg text-slate-700 hover:bg-white hover:text-slate-900 shadow-xs transition"
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
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Cari plat atau armada…"
              className="h-8 w-44 rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-[11px] font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-800 outline-none focus:border-emerald-600"
          >
            <option value="ALL">Semua Status Armada</option>
            <option value="Active">Hanya Aktif</option>
            <option value="Maintenance">Sedang Bengkel/Maintenance</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-[#2563eb] border border-blue-700 shadow-xs" />
            <span>Rencana (Solid Plan)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-emerald-500/50 border-2 border-emerald-500 backdrop-blur-xs" />
            <span>Realisasi (Actual Transparan)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-amber-500/40 border-2 border-dashed border-amber-500" />
            <span>Actual Terlambat</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded bg-slate-800 border-2 border-dashed border-red-500" />
            <span>Mobil Default Terblokir (Mobil Lain)</span>
          </span>
          {isInteractive && (
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded border border-blue-500 bg-blue-100" />
              <span>Drag Seleksi</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid Container with Frozen Vehicle Column & Scrollable Time Axis */}
      <div className="mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs" ref={gridRef}>
        <div className="overflow-x-auto pb-1" ref={scrollContainerRef}>
          <div className="min-w-max">
            {/* Header Row: Frozen Resources Header (Sticky Left) + Scrollable Time Axis */}
            <div className="flex border-b border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-800">
              {/* Sticky Frozen Vehicle Column Header */}
              <div className="sticky left-0 z-30 flex w-[220px] shrink-0 items-center gap-2 border-r border-slate-300 bg-slate-100 py-3 pl-3 pr-2 text-xs uppercase tracking-wider font-extrabold text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                <Truck size={14} className="text-emerald-700" />
                Kendaraan ({visibleVehicles.length})
              </div>

              {/* Time / Date Axis Columns */}
              <div className="flex shrink-0">
                {viewMode === 'daily' &&
                  dailyColumns.map((col) => (
                    <div
                      key={col.index}
                      className={`w-16 shrink-0 text-center font-mono text-[11px] border-l border-slate-300 py-3 first:border-l-0 ${
                        col.index % 2 === 0 ? 'bg-slate-100/90 text-slate-900 font-extrabold' : 'bg-slate-50 text-slate-700 font-bold'
                      }`}
                    >
                      <span>
                        {col.label}
                      </span>
                    </div>
                  ))}

                {viewMode === 'weekly' &&
                  weeklyColumns.map((col) => (
                    <div
                      key={col.index}
                      className={`w-36 shrink-0 text-center text-[11px] border-l border-slate-300 py-2.5 first:border-l-0 ${
                        col.isToday
                          ? 'bg-emerald-100 font-extrabold text-emerald-900 border-b-2 border-b-emerald-600'
                          : col.index % 2 === 0
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'bg-slate-50 text-slate-700 font-semibold'
                      }`}
                    >
                      <div>{col.label}</div>
                    </div>
                  ))}

                {viewMode === 'monthly' &&
                  monthlyColumns.map((col) => (
                    <div
                      key={col.index}
                      className={`w-12 shrink-0 text-center text-[11px] border-l border-slate-300 py-2 first:border-l-0 ${
                        col.isToday
                          ? 'bg-emerald-100 font-extrabold text-emerald-900 border-b-2 border-b-emerald-600'
                          : col.index % 2 === 0
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'bg-slate-50 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="font-mono">{col.label}</div>
                      <div className="text-[9px] font-bold text-slate-500">{col.weekday}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Vehicle Rows */}
            <div className="divide-y divide-slate-200 bg-white">
              {visibleVehicles.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-400/60">
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
                        isUnderMaintenance ? 'bg-red-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Sticky Frozen Vehicle Resource Column */}
                      <div className="sticky left-0 z-20 flex w-[220px] shrink-0 items-center justify-between border-r border-slate-300 bg-white py-3 pl-3 pr-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover/row:bg-slate-50">
                        <div className="overflow-hidden">
                          <p className="text-xs font-black text-slate-900 tracking-tight truncate font-mono">{v.plate}</p>
                          <p className="text-[11px] font-bold text-slate-700 truncate">{v.type}</p>
                          {v.dedicatedUser && (
                            <p className="text-[9px] font-bold text-purple-700 truncate mt-0.5">
                              User: {v.dedicatedUser}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold ${
                              isUnderMaintenance
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : v.category === 'Mobil Expat'
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : v.category === 'Mobil Sewa'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}
                          >
                            {isUnderMaintenance ? 'Maintenance' : v.category || 'Mobil Operasional'}
                          </span>
                        </div>
                      </div>

                      {/* Timeline Grid Body (Scrollable with columns) */}
                      <div
                        style={{ width: `${rowGridWidthPx}px` }}
                        className="relative h-14 shrink-0 flex items-center bg-white"
                      >
                        {/* Maintenance Banner */}
                        {isUnderMaintenance && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-100/70 text-[10px] font-bold text-red-700">
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
                                data-timeline-unit-index={unitIdx}
                                data-plate={v.plate}
                                style={{ width: `${unitWidthPx}px` }}
                                onMouseDown={(e) => !isUnderMaintenance && handleUnitMouseDown(v.plate, unitIdx, e)}
                                onMouseEnter={() => !isUnderMaintenance && handleUnitMouseEnter(v.plate, unitIdx)}
                                className={`shrink-0 h-full border-l border-slate-200 first:border-l-0 transition-colors ${
                                  unitIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                                } ${
                                  isInteractive && !isUnderMaintenance
                                    ? 'cursor-crosshair'
                                    : 'cursor-default'
                                } ${
                                  isDragSelected
                                    ? '!bg-blue-100 border-blue-400'
                                    : isInteractive && !isUnderMaintenance
                                    ? 'hover:bg-emerald-50'
                                    : ''
                                }`}
                              />
                            )
                          })}
                        </div>

                        {/* Render Booked Blocks (Plan vs Actual & Mobil Lain) */}
                        {bookingsList.map((item: any, itemIdx: number) => {
                          const {
                            trip,
                            planLeftPct,
                            planWidthPct,
                            planTimeLabel,
                            hasActual,
                            actualLeftPct,
                            actualWidthPct,
                            actualTimeLabel,
                            isDelayed,
                            delayMins,
                            isBlockedDefault,
                            blockedCarName,
                            driverName,
                          } = item

                          const isOwnTrip = trip.requesterUser === user.username
                          const canSeeDetails = isAdmin || isOwnTrip
                          const displayTitle = isBlockedDefault
                            ? trip.purpose || 'Mobil Default Terblokir'
                            : canSeeDetails
                            ? trip.purpose || trip.destination
                            : 'Booked'
                          const displaySub = isBlockedDefault
                            ? `Driver ${driverName} tugas di ${blockedCarName}`
                            : canSeeDetails
                            ? `${trip.guest} · ${trip.destination}`
                            : 'Operasional Lain'

                          // Jika ini blokir Mobil Default (karena supir bawa mobil lain)
                          if (isBlockedDefault) {
                            return (
                              <div
                                key={`${trip.id}-blocked-${itemIdx}`}
                                onClick={() => onBlockClick?.(trip)}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setHoverPos({ x: rect.left, y: rect.bottom + 4 })
                                  setHoveredTrip(trip)
                                }}
                                onMouseLeave={() => setHoveredTrip(null)}
                                style={{
                                  left: `${planLeftPct}%`,
                                  width: `${Math.max(planWidthPct, 2.5)}%`,
                                }}
                                className="absolute top-2 bottom-2 z-10 flex cursor-pointer flex-col justify-center overflow-hidden rounded-lg px-2.5 shadow-sm transition-all hover:z-30 hover:shadow-md bg-gradient-to-r from-slate-800 via-gray-900 to-slate-950 text-white border-2 border-dashed border-red-500 opacity-95 active:scale-[0.99]"
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="size-1.5 rounded-full bg-red-400 animate-pulse" />
                                  <p className="truncate text-[10px] font-bold tracking-tight uppercase text-red-200">
                                    [MOBIL LAIN] {displayTitle}
                                  </p>
                                </div>
                                <p className="truncate text-[9px] text-red-300 font-medium">
                                  {displaySub} ({planTimeLabel})
                                </p>
                              </div>
                            )
                          }

                          // Blok Reguler: Render Rencana (Solid) dan jika ada eksekusi, render Aktual (Transparan overlapping)
                          return (
                            <div key={`${trip.id}-group-${itemIdx}`} className="contents">
                              {/* 1. Solid Color Block (PLAN) */}
                              <div
                                onClick={() => onBlockClick?.(trip)}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  setHoverPos({ x: rect.left, y: rect.bottom + 4 })
                                  setHoveredTrip(trip)
                                }}
                                onMouseLeave={() => setHoveredTrip(null)}
                                style={{
                                  left: `${planLeftPct}%`,
                                  width: `${Math.max(planWidthPct, 2.5)}%`,
                                }}
                                className={`absolute top-2.5 bottom-2.5 z-10 flex cursor-pointer flex-col justify-center overflow-hidden rounded-lg px-2 shadow-sm transition-all hover:z-25 hover:shadow-md active:scale-[0.99] ${
                                  trip.status === 'WAITING_POOL_SPV'
                                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white ring-1 ring-amber-300/60 shadow-md'
                                    : trip.status === 'ON_TRIP'
                                    ? 'bg-gradient-to-r from-[#1d4ed8] to-[#1e40af] text-white shadow-xs'
                                    : trip.status === 'DONE'
                                    ? 'bg-gradient-to-r from-[#475569] to-[#334155] text-white'
                                    : 'bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white'
                                }`}
                              >
                                <div className="flex items-center gap-1 truncate">
                                  <span className="size-1.5 rounded-full bg-white/90" />
                                  <p className="truncate text-[9px] font-extrabold uppercase tracking-tight">
                                    [PLAN] {displayTitle}
                                  </p>
                                </div>
                                <p className="truncate text-[8.5px] opacity-90 font-medium">
                                  {planTimeLabel}
                                </p>
                              </div>

                              {/* 2. Transparent Color Block (ACTUAL) Overlapping the Plan Block */}
                              {hasActual && (
                                <div
                                  onClick={() => onBlockClick?.(trip)}
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setHoverPos({ x: rect.left, y: rect.bottom + 4 })
                                    setHoveredTrip(trip)
                                  }}
                                  onMouseLeave={() => setHoveredTrip(null)}
                                  style={{
                                    left: `${actualLeftPct}%`,
                                    width: `${Math.max(actualWidthPct, 2.5)}%`,
                                  }}
                                  className={`absolute top-1 bottom-1 z-20 flex cursor-pointer flex-col justify-center overflow-hidden rounded-lg px-2 shadow-md backdrop-blur-[2px] transition-all hover:z-30 hover:shadow-lg active:scale-[0.99] ${
                                    isDelayed
                                      ? 'bg-amber-500/40 border-2 border-dashed border-amber-400 text-amber-100 ring-1 ring-amber-400/50'
                                      : 'bg-emerald-500/45 border-2 border-emerald-400 text-white ring-1 ring-emerald-300/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-1 truncate">
                                    <span className={`size-1.5 rounded-full ${isDelayed ? 'bg-amber-300 animate-pulse' : 'bg-emerald-300'}`} />
                                    <p className="truncate text-[9.5px] font-black tracking-tight drop-shadow-xs">
                                      {isDelayed ? `⚠️ [ACTUAL DELAY +${delayMins}m]` : '[ACTUAL LAPANGAN]'}
                                    </p>
                                  </div>
                                  <p className="truncate text-[8.5px] font-bold drop-shadow-xs opacity-95">
                                    {actualTimeLabel}
                                  </p>
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* Drag Selection Overlay Feedback */}
                        {isVehicleDragging && dragMinUnit !== null && dragMaxUnit !== null && (() => {
                          const spanUnits = dragMaxUnit - dragMinUnit + 1
                          const endUnitDisplay = dragMaxUnit + 1

                          return (
                            <div
                              style={{
                                left: `${(dragMinUnit / totalUnits) * 100}%`,
                                width: `${(spanUnits / totalUnits) * 100}%`,
                              }}
                              className="pointer-events-none absolute top-1 bottom-1 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-[#2563eb] bg-[#dbeafe]/80 text-[#1e40af] shadow-md backdrop-blur-xs transition-all"
                            >
                              <span className="text-[10px] font-bold tracking-tight px-1.5 py-0.5 rounded bg-white/90 shadow-xs whitespace-nowrap">
                                {viewMode === 'daily'
                                  ? `${String(dragMinUnit).padStart(2, '0')}:00 – ${String(endUnitDisplay >= 24 ? 24 : endUnitDisplay).padStart(2, '0')}:00`
                                  : `${spanUnits} Periode Terpilih`}
                              </span>
                            </div>
                          )
                        })()}
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

          <div className="mt-2 space-y-1.5 text-[11px] text-[#63726a]">
            <p>
              <span className="text-[#93a097] font-semibold">📍 Rute:</span>{' '}
              <strong className="text-slate-800">{hoveredTrip.origin || 'PT. JAI'}</strong> ➔ <strong className="text-slate-800">{hoveredTrip.destination}</strong>
            </p>
            {(isAdmin || hoveredTrip.requesterUser === user.username) && (
              <>
                <p><span className="text-[#93a097]">Tamu/User:</span> {hoveredTrip.guest}</p>
                <p><span className="text-[#93a097]">Departemen:</span> {hoveredTrip.dept}</p>
              </>
            )}
            
            {/* Perbandingan Plan vs Actual */}
            <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 space-y-1 my-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-blue-700">📋 Rencana (Plan):</span>
                <span className="font-semibold text-slate-800">{hoveredTrip.estDeparture} – {hoveredTrip.estReturn || '—'} WIB</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-emerald-700">⏱️ Realisasi (Actual):</span>
                <span className="font-semibold text-slate-800">
                  {hoveredTrip.timeGo ? fmtTime(hoveredTrip.timeGo) : 'Belum Berangkat'} – {hoveredTrip.timeBack ? fmtTime(hoveredTrip.timeBack) : (hoveredTrip.status === 'ON_TRIP' ? 'Sedang Berjalan' : '—')} WIB
                </span>
              </div>
              {hoveredTrip.durationMin && hoveredTrip.estimated_duration_minutes && (
                <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-200">
                  <span className="text-slate-500">Durasi:</span>
                  <span className={`font-bold ${hoveredTrip.durationMin > hoveredTrip.estimated_duration_minutes ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {hoveredTrip.durationMin} mnt (Rencana: {hoveredTrip.estimated_duration_minutes} mnt)
                  </span>
                </div>
              )}
            </div>

            {/* Alasan Keterlambatan jika ada */}
            {hoveredTrip.delayReason && (
              <div className="rounded-lg bg-amber-50 p-2 border border-amber-300 text-amber-900 text-[10px]">
                <strong className="block text-amber-800 font-bold mb-0.5">⚠️ Alasan Keterlambatan:</strong>
                {hoveredTrip.delayReason}
              </div>
            )}

            {hoveredTrip.plate && (
              <p><span className="text-[#93a097]">Kendaraan:</span> <span className="font-bold text-slate-800">{hoveredTrip.plate}</span></p>
            )}
            {hoveredTrip.driverId && (
              <p><span className="text-[#93a097]">Supir Ditugaskan:</span> <span className="font-bold text-slate-800">{db.drivers.find(d => d.id === hoveredTrip.driverId)?.name || hoveredTrip.driverId}</span></p>
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
