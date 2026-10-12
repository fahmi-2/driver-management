import { supabase } from './supabase'
import type { Trip, Vehicle, Driver, Passenger } from './store'
import type { Account } from './accounts'

// --- ACCOUNTS SYNC ---
export async function fetchAccountsFromSupabase(): Promise<Account[] | null> {
  try {
    const { data, error } = await supabase.from('accounts').select('*')
    if (error || !data) return null
    return data.map((row: any) => ({
      username: row.username,
      password: row.password_hash,
      name: row.name,
      role: row.role,
      dept: row.department_name,
      nik: row.nik,
      driverId: row.driver_id,
      title: row.title,
      avatar: row.avatar_url,
    }))
  } catch (err) {
    console.error('Error fetching accounts from Supabase:', err)
    return null
  }
}

export async function upsertAccountToSupabase(acc: Account): Promise<boolean> {
  try {
    const { error } = await supabase.from('accounts').upsert({
      username: acc.username,
      password_hash: acc.password,
      name: acc.name,
      nik: acc.nik || null,
      role: acc.role,
      department_name: acc.dept || null,
      driver_id: acc.driverId || null,
      title: acc.title,
      avatar_url: acc.avatar || null,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      console.warn('Upsert account error:', error.message)
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to upsert account to Supabase:', err)
    return false
  }
}

export async function deleteAccountFromSupabase(username: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('accounts').delete().eq('username', username)
    return !error
  } catch (err) {
    console.error('Failed to delete account from Supabase:', err)
    return false
  }
}

// --- VEHICLES SYNC ---
export async function fetchVehiclesFromSupabase(): Promise<Vehicle[] | null> {
  try {
    const { data, error } = await supabase.from('vehicles').select('*')
    if (error || !data || data.length === 0) return null
    return data.map((v: any) => ({
      plate: v.plate,
      type: v.type,
      capacity: v.capacity,
      status: v.status,
      category: v.category,
    }))
  } catch (err) {
    console.error('Error fetching vehicles from Supabase:', err)
    return null
  }
}

export async function upsertVehicleToSupabase(v: Vehicle): Promise<boolean> {
  try {
    const { error } = await supabase.from('vehicles').upsert({
      plate: v.plate,
      type: v.type,
      capacity: v.capacity || 7,
      status: v.status || 'Active',
      category: v.category || 'Mobil Operasional',
      updated_at: new Date().toISOString(),
    })
    return !error
  } catch (err) {
    console.error('Failed to upsert vehicle to Supabase:', err)
    return false
  }
}

export async function deleteVehicleFromSupabase(plate: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('vehicles').delete().eq('plate', plate)
    return !error
  } catch (err) {
    console.error('Failed to delete vehicle from Supabase:', err)
    return false
  }
}

// --- DRIVERS SYNC ---
export async function fetchDriversFromSupabase(): Promise<Driver[] | null> {
  try {
    const { data, error } = await supabase.from('drivers').select('*')
    if (error || !data || data.length === 0) return null
    return data.map((d: any) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      simType: d.sim_type,
      shift: d.shift,
      defaultPlate: d.default_plate,
      onLeave: d.on_leave,
    }))
  } catch (err) {
    console.error('Error fetching drivers from Supabase:', err)
    return null
  }
}

export async function upsertDriverToSupabase(d: Driver): Promise<boolean> {
  try {
    const { error } = await supabase.from('drivers').upsert({
      id: d.id,
      name: d.name,
      phone: d.phone || null,
      sim_type: d.simType || 'SIM A',
      shift: d.shift || 'General (08:00 - 17:00)',
      default_plate: d.defaultPlate || null,
      on_leave: d.onLeave,
      updated_at: new Date().toISOString(),
    })
    return !error
  } catch (err) {
    console.error('Failed to upsert driver to Supabase:', err)
    return false
  }
}

export async function deleteDriverFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('drivers').delete().eq('id', id)
    return !error
  } catch (err) {
    console.error('Failed to delete driver from Supabase:', err)
    return false
  }
}

// --- TRIPS SYNC ---
export async function fetchTripsFromSupabase(): Promise<Trip[] | null> {
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_passengers(*)')
      .order('created_at', { ascending: false })

    if (error || !data) return null

    return data.map((t: any) => {
      const passengers: Passenger[] = (t.trip_passengers || []).map((p: any) => ({
        name: p.name,
        nik: p.nik,
        dept: p.dept,
      }))

      return {
        id: t.id,
        date: t.date,
        category: t.category,
        purpose: t.purpose,
        guest: t.guest,
        requesterUser: t.requester_username,
        requesterName: t.requester_name,
        requesterNik: t.requester_nik,
        dept: t.department_name,
        destination: t.destination,
        destinations: t.destinations || [],
        distance_km: t.distance_km != null ? Number(t.distance_km) : undefined,
        estimated_duration_minutes: t.estimated_duration_minutes != null ? Number(t.estimated_duration_minutes) : undefined,
        estDeparture: t.est_departure ? String(t.est_departure).slice(0, 5) : '08:00',
        estReturn: t.est_return ? String(t.est_return).slice(0, 5) : undefined,
        driverOnly: t.driver_only,
        isOtherVehicle: t.is_other_vehicle,
        otherVehicleName: t.other_vehicle_name,
        blockedDefaultPlate: t.blocked_default_plate,
        blockedReason: t.blocked_reason,
        plate: t.plate,
        driverId: t.driver_id,
        adminNote: t.admin_note,
        spvName: t.spv_name || `SPV ${t.department_name}`,
        spvAt: t.spv_at,
        spvNote: t.spv_note,
        poolSpvName: t.pool_spv_name,
        poolSpvAt: t.pool_spv_at,
        poolSpvNote: t.pool_spv_note,
        rejectReason: t.reject_reason,
        timeGo: t.time_go,
        securityGo: t.security_go,
        timeBack: t.time_back,
        securityBack: t.security_back,
        durationMin: t.duration_min,
        status: t.status,
        coupon: t.coupon,
        claimedAt: t.claimed_at,
        paidAt: t.paid_at,
        paidBy: t.paid_by,
        prNumber: t.pr_number,
        prCreatedAt: t.pr_created_at,
        prCreatedBy: t.pr_created_by,
        passengers,
      }
    })
  } catch (err) {
    console.error('Error fetching trips from Supabase:', err)
    return null
  }
}

export async function upsertTripToSupabase(trip: Trip): Promise<boolean> {
  try {
    const { error } = await supabase.from('trips').upsert({
      id: trip.id,
      date: trip.date,
      category: trip.category,
      purpose: trip.purpose,
      guest: trip.guest,
      requester_username: trip.requesterUser,
      requester_name: trip.requesterName,
      requester_nik: trip.requesterNik || null,
      department_name: trip.dept,
      destination: trip.destination,
      destinations: trip.destinations || [],
      distance_km: trip.distance_km != null ? trip.distance_km : null,
      estimated_duration_minutes: trip.estimated_duration_minutes != null ? trip.estimated_duration_minutes : null,
      est_departure: trip.estDeparture ? (trip.estDeparture.length === 5 ? `${trip.estDeparture}:00` : trip.estDeparture) : '08:00:00',
      est_return: trip.estReturn ? (trip.estReturn.length === 5 ? `${trip.estReturn}:00` : trip.estReturn) : null,
      driver_only: !!trip.driverOnly,
      is_other_vehicle: !!trip.isOtherVehicle,
      other_vehicle_name: trip.otherVehicleName || null,
      blocked_default_plate: trip.blockedDefaultPlate || null,
      blocked_reason: trip.blockedReason || null,
      plate: trip.plate || null,
      driver_id: trip.driverId || null,
      admin_note: trip.adminNote || null,
      spv_name: trip.spvName || null,
      spv_at: trip.spvAt || null,
      spv_note: trip.spvNote || null,
      pool_spv_name: trip.poolSpvName || null,
      pool_spv_at: trip.poolSpvAt || null,
      pool_spv_note: trip.poolSpvNote || null,
      reject_reason: trip.rejectReason || null,
      time_go: trip.timeGo || null,
      security_go: trip.securityGo || null,
      time_back: trip.timeBack || null,
      security_back: trip.securityBack || null,
      duration_min: trip.durationMin || null,
      status: trip.status,
      coupon: trip.coupon || 'NONE',
      claimed_at: trip.claimedAt || null,
      paid_at: trip.paidAt || null,
      paid_by: trip.paidBy || null,
      pr_number: trip.prNumber || null,
      pr_created_at: trip.prCreatedAt || null,
      pr_created_by: trip.prCreatedBy || null,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.warn('Trip upsert error in Supabase:', error.message)
      return false
    }

    // Upsert passengers jika ada
    if (trip.passengers && trip.passengers.length > 0) {
      // Hapus data penumpang lama trip ini lalu insert ulang
      await supabase.from('trip_passengers').delete().eq('trip_id', trip.id)
      await supabase.from('trip_passengers').insert(
        trip.passengers.map((p) => ({
          trip_id: trip.id,
          name: p.name,
          nik: p.nik || null,
          dept: p.dept,
        }))
      )
    }

    return true
  } catch (err) {
    console.error('Failed to upsert trip to Supabase:', err)
    return false
  }
}
