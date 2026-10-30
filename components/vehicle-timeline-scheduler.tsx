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
  Filter,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Send,
  MapPin,
  Fuel,
  Navigation,
} from 'lucide-react'
import type { Trip, Vehicle } from '@/lib/store'
import { useStore, ymd, fmtDate, fmtTime, STATUS_LABEL, calculateEstimatedFuel } from '@/lib/store'
import type { Account } from '@/lib/accounts'
import { Pill, btnPrimary, btnGhost, inputCls, useToast } from './ui-bits'
import { ModalPortal } from './modal-portal'
import { TimeInput24h } from './time-input-24h'
import { TripRouteMap } from './route-map'

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
  const { db, rescheduleTrip, cancelTrip } = useStore()
  const notify = useToast()
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

  // Inspect Modal State
  const [inspectingTrip, setInspectingTrip] = useState<Trip | null>(null)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Reschedule Form State
  const [rescheduleData, setRescheduleData] = useState<{
    date: string
    estDeparture: string
    estReturn: string
    plate: string
    driverId: string
    adminNote: string
    isOtherVehicle: boolean
    otherVehicleName: string
  }>({
    date: '',
    estDeparture: '08:00',
    estReturn: '17:00',
    plate: '',
    driverId: '',
    adminNote: '',
    isOtherVehicle: false,
    otherVehicleName: '',
  })

  // Handle open inspect modal
  const handleOpenInspect = (trip: Trip) => {
    setInspectingTrip(trip)
    setIsRescheduling(false)
    setIsCanceling(false)
    setCancelReason('')
    setRescheduleData({
      date: trip.date || ymd(),
      estDeparture: trip.estDeparture || '08:00',
      estReturn: trip.estReturn || '17:00',
      plate: trip.plate || '',
      driverId: trip.driverId || '',
      adminNote: trip.adminNote || '',
      isOtherVehicle: !!trip.isOtherVehicle,
      otherVehicleName: trip.otherVehicleName || '',
    })
    onBlockClick?.(trip)
  }

  // Handle submit Reschedule
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectingTrip) return

    const targetPlate = rescheduleData.isOtherVehicle
      ? rescheduleData.otherVehicleName.trim()
      : rescheduleData.plate

    if (!targetPlate) {
      notify('Armada / Plat kendaraan wajib dipilih!', 'error')
      return
    }

    if (!rescheduleData.estDeparture) {
      notify('Jam mulai wajib ditentukan!', 'error')
      return
    }

    setIsSubmittingAction(true)
    try {
      const res = await rescheduleTrip(inspectingTrip.id, {
        date: rescheduleData.date,
        estDeparture: rescheduleData.estDeparture,
        estReturn: rescheduleData.estReturn || undefined,
        plate: targetPlate,
        driverId: rescheduleData.driverId || undefined,
        adminNote: rescheduleData.adminNote,
        isOtherVehicle: rescheduleData.isOtherVehicle,
        otherVehicleName: rescheduleData.isOtherVehicle ? rescheduleData.otherVehicleName.trim() : undefined,
      })

      if (res.success) {
        notify('Jadwal berhasil di-reschedule! Notifikasi otomatis [UPDATE JADWAL] telah dikirimkan ke Pemohon, Driver, dan Approver sebagai tembusan.')
        setInspectingTrip(null)
        setIsRescheduling(false)
      } else {
        notify(res.error || 'Gagal mereschedule jadwal.', 'error')
      }
    } catch (err: any) {
      notify(err?.message || 'Terjadi kesalahan saat reschedule.', 'error')
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Handle submit Cancel
  const handleCancelSubmit = async () => {
    if (!inspectingTrip) return
    setIsSubmittingAction(true)
    try {
      const res = await cancelTrip(inspectingTrip.id, cancelReason)
      if (res.success) {
        notify(`Jadwal ${inspectingTrip.id} berhasil dibatalkan dan dihapus. Slot armada kembali bebas.`)
        setInspectingTrip(null)
        setIsCanceling(false)
      } else {
        notify(res.error || 'Gagal membatalkan jadwal.', 'error')
      }
    } catch (err: any) {
      notify(err?.message || 'Terjadi kesalahan saat membatalkan.', 'error')
    } finally {
      setIsSubmittingAction(false)
    }
  }

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
  // Daily: 48 kolom per 30 menit (00:00 s/d 23:30) agar slot lebih longgar dan teks blok terbaca jelas
  const dailyColumns = useMemo(() => {
    const cols = []
    for (let slot = 0; slot < 48; slot++) {
      const h = Math.floor(slot / 2)
      const m = (slot % 2) * 30
      cols.push({
        index: slot,
        label: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        startMin: slot * 30,
        endMin: (slot + 1) * 30,
        isHourStart: m === 0,
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
      // Setiap unit adalah 30 menit
      const startTotalMins = minUnit * 30
      const endTotalMins = (maxUnit + 1) * 30
      const sH = Math.floor(startTotalMins / 60)
      const sM = startTotalMins % 60
      startTime = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`

      if (endTotalMins >= 1440) {
        endTime = '23:59'
      } else {
        const eH = Math.floor(endTotalMins / 60)
        const eM = endTotalMins % 60
        endTime = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`
      }
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

  // Horizontal scroll handler untuk navigasi grid waktu (tersedia di bagian atas dan bawah)
  const handleScrollGrid = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    const scrollAmount = 350
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

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

        {/* Legend & Top Scroll Buttons */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Tombol Scroll Waktu BAGIAN ATAS */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => handleScrollGrid('left')}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition"
              title="Geser waktu ke kiri"
            >
              <ChevronLeft size={13} />
              <span>Kiri</span>
            </button>
            <span className="text-[10px] text-slate-500 font-semibold px-1">Geser Jam</span>
            <button
              type="button"
              onClick={() => handleScrollGrid('right')}
              className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition"
              title="Geser waktu ke kanan"
            >
              <span>Kanan</span>
              <ChevronRight size={13} />
            </button>
          </div>
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
                      className={`w-[76px] shrink-0 text-center font-mono text-[11px] border-l border-slate-300 py-2.5 first:border-l-0 ${
                        col.isHourStart
                          ? 'bg-slate-100 text-slate-900 font-extrabold'
                          : 'bg-slate-50/80 text-slate-600 font-medium'
                      }`}
                    >
                      <span className={col.isHourStart ? 'text-slate-900' : 'text-slate-500 text-[10px]'}>
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

                  const unitWidthPx = viewMode === 'daily' ? 76 : viewMode === 'weekly' ? 144 : 48
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
                                onClick={() => handleOpenInspect(trip)}
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
                                onClick={() => handleOpenInspect(trip)}
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
                                  onClick={() => handleOpenInspect(trip)}
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

                          const startTotalMins = dragMinUnit * 30
                          const endTotalMins = (dragMaxUnit + 1) * 30
                          const sH = Math.floor(startTotalMins / 60)
                          const sM = startTotalMins % 60
                          const eH = Math.min(24, Math.floor(endTotalMins / 60))
                          const eM = endTotalMins >= 1440 ? 0 : endTotalMins % 60

                          const timeRangeText = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')} – ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`

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
                                  ? timeRangeText
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

        {/* Tombol Scroll Waktu BAGIAN BAWAH */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/90 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleScrollGrid('left')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
            >
              <ChevronLeft size={14} />
              <span>Geser Kiri</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-500">
              Navigasi Rentang Waktu (30 Menit)
            </span>
            <button
              type="button"
              onClick={() => handleScrollGrid('right')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 transition active:scale-95"
            >
              <span>Geser Kanan</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="text-[10px] text-slate-400 italic">
            Tips: Anda juga dapat scroll horizontal langsung menggunakan mouse atau touchpad
          </span>
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

            {hoveredTrip.plate && (() => {
              const vObj = db.vehicles.find((v) => v.plate.toUpperCase() === hoveredTrip.plate?.toUpperCase())
              const fCalc = calculateEstimatedFuel(hoveredTrip.distance_km, vObj)
              return (
                <div className="space-y-0.5">
                  <p><span className="text-[#93a097]">Kendaraan:</span> <span className="font-bold text-slate-800">{hoveredTrip.plate}</span> {vObj?.type ? `(${vObj.type})` : ''}</p>
                  {hoveredTrip.distance_km ? (
                    <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1">
                      <Fuel size={11} className="text-amber-600" />
                      Est. BBM: {fCalc.liters} Liter ({hoveredTrip.distance_km} KM @ {fCalc.efficiency} km/L)
                    </p>
                  ) : null}
                </div>
              )
            })()}
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

      {/* MODAL INSPECT / DETAIL PENJADWALAN */}
      {inspectingTrip && (
        <ModalPortal
          onClose={() => {
            setInspectingTrip(null)
            setIsRescheduling(false)
            setIsCanceling(false)
          }}
        >
          <div className="light-modal-scope relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-300 overflow-hidden max-h-[88vh] flex flex-col animate-in zoom-in-95 duration-150 text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {isRescheduling
                        ? 'Reschedule Jadwal Perjalanan'
                        : isCanceling
                        ? 'Konfirmasi Pembatalan Jadwal'
                        : 'Detail Blok Penjadwalan'}
                    </h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      {inspectingTrip.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Status: <strong className="text-slate-800">{STATUS_LABEL[inspectingTrip.status] || inspectingTrip.status}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInspectingTrip(null)
                  setIsRescheduling(false)
                  setIsCanceling(false)
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 bg-white">
              {/* VIEW MODE: DETAIL INFO */}
              {!isRescheduling && !isCanceling && (
                <>
                  {/* Status Banner */}
                  <div className={`rounded-xl p-3.5 border text-xs flex items-start gap-2.5 ${
                    inspectingTrip.status === 'WAITING_POOL_SPV'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : inspectingTrip.status === 'READY'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : inspectingTrip.status === 'ON_TRIP'
                      ? 'bg-blue-50 border-blue-200 text-blue-900'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <div className="space-y-0.5 leading-relaxed">
                      <p className="font-bold">
                        {inspectingTrip.status === 'WAITING_POOL_SPV'
                          ? 'Menunggu Persetujuan Tahap 2 (SPV Kendaraan – Pak Hayu)'
                          : inspectingTrip.status === 'READY'
                          ? 'Telah Disetujui Tahap 2 (Siap Berangkat)'
                          : inspectingTrip.status === 'ON_TRIP'
                          ? 'Kendaraan Sedang Beroperasi di Lapangan'
                          : inspectingTrip.status === 'DONE'
                          ? 'Perjalanan Telah Selesai'
                          : `Status: ${STATUS_LABEL[inspectingTrip.status] || inspectingTrip.status}`}
                      </p>
                      <p className="text-[11px] text-amber-800/90 font-medium">
                        {isAdmin
                          ? 'Sebagai Admin, Anda dapat melakukan Reschedule atau Membatalkan (Hapus) penjadwalan ini.'
                          : 'Informasi detail jadwal armada dan supir.'}
                      </p>
                    </div>
                  </div>

                  {/* Trip Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Kendaraan &amp; Plat
                      </span>
                      {(() => {
                        const targetPlate = inspectingTrip.plate || inspectingTrip.otherVehicleName
                        const matchedVehicle = targetPlate ? db.vehicles.find((v) => v.plate.toUpperCase() === targetPlate.toUpperCase()) : null
                        const vehicleType = matchedVehicle?.type || (inspectingTrip.isOtherVehicle ? (inspectingTrip.otherVehicleName || 'Mobil Luar') : null)
                        const fuelCalc = calculateEstimatedFuel(inspectingTrip.distance_km, matchedVehicle)

                        return (
                          <div>
                            <div className="flex items-baseline gap-2">
                              <p className="font-mono font-black text-slate-900 text-sm">
                                {targetPlate || '—'}
                              </p>
                              {vehicleType && (
                                <span className="text-[11px] font-bold text-emerald-800">
                                  {vehicleType}
                                </span>
                              )}
                            </div>

                            {/* Informasi Estimasi Jarak & Konsumsi BBM */}
                            <div className="mt-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-md font-bold">
                                <Fuel size={12} className="text-amber-600 shrink-0" />
                                Est. BBM: {fuelCalc.liters > 0 ? `${fuelCalc.liters} Liter` : '—'}
                              </span>
                              {inspectingTrip.distance_km ? (
                                <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                                  {inspectingTrip.distance_km} KM
                                </span>
                              ) : null}
                              <span className="text-slate-500 font-medium">
                                (~{fuelCalc.efficiency} km/L)
                              </span>
                            </div>

                            {inspectingTrip.isOtherVehicle && (
                              <span className="inline-block mt-1.5 text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                Mobil Luar / Rental
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Driver Ditugaskan
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {db.drivers.find((d) => d.id === inspectingTrip.driverId)?.name || inspectingTrip.driverId || 'Belum Ditugaskan'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Tanggal &amp; Waktu Rencana
                      </span>
                      <p className="font-semibold text-slate-900">
                        {fmtDate(inspectingTrip.date)}
                      </p>
                      <p className="font-mono font-bold text-emerald-700 mt-0.5">
                        {inspectingTrip.estDeparture} – {inspectingTrip.estReturn || '—'} WIB
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Pemohon &amp; Dept
                      </span>
                      <p className="font-bold text-slate-900">{inspectingTrip.requesterName}</p>
                      <p className="text-slate-600 text-[11px] font-medium">{inspectingTrip.dept || '—'}</p>
                    </div>
                  </div>

                  {/* Route & Purpose */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Rute Perjalanan
                        </span>
                        {inspectingTrip.distance_km ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-md">
                            <Navigation size={12} className="text-emerald-700" />
                            Total: {inspectingTrip.distance_km} KM {inspectingTrip.returnToOrigin !== false ? 'PP' : '(Sekali Jalan)'}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 font-medium text-slate-800">
                        <MapPin size={14} className="text-emerald-600 shrink-0" />
                        <span className="text-slate-700">{inspectingTrip.origin || 'PT. JAI'}</span>
                        <span className="text-slate-400">➔</span>
                        <strong className="text-slate-900">{inspectingTrip.destination}</strong>
                      </div>

                      {/* Detail Multi-Drop Destinations jika lebih dari 1 */}
                      {Array.isArray(inspectingTrip.destinations) && inspectingTrip.destinations.length > 1 && (
                        <div className="mt-2 pl-5 space-y-1 border-l-2 border-emerald-300">
                          {inspectingTrip.destinations.map((dest, idx) => (
                            <p key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                              <span>Titik {idx + 1}: <strong>{dest}</strong></span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Preview Rute Map Interaktif Leaflet */}
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <MapPin size={13} className="text-emerald-700" />
                          Visualisasi Peta Rute &amp; Lintasan
                        </span>
                        {inspectingTrip.estimated_duration_minutes ? (
                          <span className="text-[10px] font-semibold text-slate-500">
                            Est. Waktu: ~{inspectingTrip.estimated_duration_minutes} Menit
                          </span>
                        ) : null}
                      </div>
                      <div className="rounded-xl overflow-hidden border border-slate-300 shadow-inner">
                        <TripRouteMap
                          destinations={inspectingTrip.destinations}
                          destination={inspectingTrip.destination}
                          height={220}
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Keperluan / Tujuan
                      </span>
                      <p className="text-slate-900 font-semibold">
                        {inspectingTrip.purpose || '—'}
                      </p>
                    </div>

                    {inspectingTrip.adminNote && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Catatan Admin
                        </span>
                        <p className="text-slate-800 bg-white border border-slate-200 p-2.5 rounded-lg text-xs leading-relaxed font-medium">
                          {inspectingTrip.adminNote}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* FORM MODE: RESCHEDULE */}
              {isRescheduling && (
                <form id="reschedule-form" onSubmit={handleRescheduleSubmit} className="space-y-4">
                  <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-950 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-sky-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Standar Post-Approval Edge Case:</strong> Penjadwalan ulang ini adalah <strong>penyesuaian operasional logistik</strong>. Begitu disimpan, sistem otomatis mengirim notifikasi <strong>[UPDATE JADWAL]</strong> kepada Pemohon, Driver, dan Approver Tahap 1 & 2 (sebagai tembusan/CC). <em>Approver tidak perlu menekan tombol approve lagi.</em>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Tanggal Baru <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={rescheduleData.date}
                        onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Kendaraan / Armada <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={rescheduleData.isOtherVehicle ? '__OTHER__' : rescheduleData.plate}
                        onChange={(e) => {
                          if (e.target.value === '__OTHER__') {
                            setRescheduleData({ ...rescheduleData, isOtherVehicle: true, plate: '' })
                          } else {
                            setRescheduleData({ ...rescheduleData, isOtherVehicle: false, plate: e.target.value })
                          }
                        }}
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      >
                        <optgroup label="Armada Operasional (Standby / Aktif)">
                          {vehicles
                            .filter((v) => (v.status || 'Active') === 'Active')
                            .map((v) => (
                              <option key={v.plate} value={v.plate}>
                                {v.plate} - {v.type} ({v.category || 'Operasional'})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Opsi Lainnya">
                          <option value="__OTHER__">+ Mobil Rental / Eksternal</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {rescheduleData.isOtherVehicle && (
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Nama Mobil / Plat Eksternal <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Avanza Rental (B 1234 XYZ)"
                        value={rescheduleData.otherVehicleName}
                        onChange={(e) => setRescheduleData({ ...rescheduleData, otherVehicleName: e.target.value })}
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Jam Berangkat (Start) <span className="text-red-500">*</span>
                      </label>
                      <TimeInput24h
                        required
                        value={rescheduleData.estDeparture}
                        onChange={(val) => setRescheduleData({ ...rescheduleData, estDeparture: val })}
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Jam Selesai (Return)
                      </label>
                      <TimeInput24h
                        value={rescheduleData.estReturn}
                        onChange={(val) => setRescheduleData({ ...rescheduleData, estReturn: val })}
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Driver Ditugaskan
                    </label>
                    <select
                      value={rescheduleData.driverId}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, driverId: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Pilih Driver (Atau Biarkan Kosong) --</option>
                      {db.drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} {d.defaultPlate ? `(${d.defaultPlate})` : ''} {d.onLeave ? '[SEDANG CUTI]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Catatan Perubahan / Reschedule
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Digeser ke jam 10:00 karena ada agenda meeting mendadak..."
                      value={rescheduleData.adminNote}
                      onChange={(e) => setRescheduleData({ ...rescheduleData, adminNote: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-emerald-600"
                    />
                  </div>
                </form>
              )}

              {/* CONFIRMATION MODE: CANCEL */}
              {isCanceling && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-xs text-red-900 flex items-start gap-3">
                    <div className="size-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold">
                      <Trash2 size={18} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-red-800">
                        Yakin ingin membatalkan &amp; menghapus jadwal ini?
                      </p>
                      <p className="text-red-700 leading-relaxed text-[11px]">
                        Tindakan ini akan <strong>menghapus blok jadwal</strong> dari kalender, membebaskan kembali unit armada dan supir yang bersangkutan, serta menyinkronkan status pembatalan ke server database.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Alasan Pembatalan (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Contoh: Agenda user dibatalkan / dialihkan ke meeting online..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5 shrink-0">
              {!isRescheduling && !isCanceling ? (
                <>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsRescheduling(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition"
                        >
                          <RefreshCw size={13} />
                          Reschedule Jadwal
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCanceling(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition"
                        >
                          <Trash2 size={13} />
                          Cancel / Hapus
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectingTrip(null)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    Tutup
                  </button>
                </>
              ) : isRescheduling ? (
                <>
                  <button
                    type="button"
                    disabled={isSubmittingAction}
                    onClick={() => setIsRescheduling(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    form="reschedule-form"
                    disabled={isSubmittingAction}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <Send size={13} />
                    {isSubmittingAction ? 'Menyimpan & Mengirim Notifikasi...' : 'Simpan [UPDATE JADWAL]'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={isSubmittingAction}
                    onClick={() => setIsCanceling(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingAction}
                    onClick={handleCancelSubmit}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-red-700 transition disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    {isSubmittingAction ? 'Menghapus...' : 'Ya, Batalkan Jadwal Ini'}
                  </button>
                </>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
