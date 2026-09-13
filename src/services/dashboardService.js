import supabase from '../supabase/supabase';
import {getTeamMemberSession} from './teamMemberService';

const bookingsTable = 'patient_bookings_1789315000000';
const doctorsTable = 'doctors_1789298737910';
const consultationsTable = 'consultations_1789302054187';
const locationsTable = 'business_locations_1789300875912';
const vacationFunction = 'get_active_doctor_vacations_1789321000000';

const BOOKINGS_CACHE_TTL = 15000;

let bookingsCache = {
  key: '',
  data: null,
  expiresAt: 0
};

let bookingsRequest = null;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createLookup(rows) {
  return new Map((rows || []).map((row) => [row.id, row]));
}

function getCacheKey() {
  const member = getTeamMemberSession();
  return member?.member_id ? `member:${member.member_id}` : 'owner';
}

function invalidateDashboardBookings() {
  bookingsCache = {
    key: '',
    data: null,
    expiresAt: 0
  };
}

async function addDoctorVacations(doctors) {
  return Promise.all(
    (doctors || []).map(async (doctor) => {
      const {data, error} = await supabase.rpc(vacationFunction, {
        doctor_id_value: doctor.id
      });

      if (error) {
        throw error;
      }

      return {
        ...doctor,
        vacations: data || []
      };
    })
  );
}

async function listOwnerBookings() {
  const {data, error} = await supabase
    .from(bookingsTable)
    .select('*')
    .order('booking_date')
    .order('booking_time');

  if (error) {
    throw error;
  }

  const bookings = data || [];
  const doctorIds = [
    ...new Set(bookings.map((booking) => booking.doctor_id).filter(Boolean))
  ];
  const consultationIds = [
    ...new Set(
      bookings.map((booking) => booking.consultation_id).filter(Boolean)
    )
  ];
  const locationIds = [
    ...new Set(bookings.map((booking) => booking.location_id).filter(Boolean))
  ];

  const [doctorResult, consultationResult, locationResult] = await Promise.all([
    doctorIds.length
      ? supabase
          .from(doctorsTable)
          .select('id,doctor_name,speciality,available_days,selected_time_slots')
          .in('id', doctorIds)
      : {data: [], error: null},
    consultationIds.length
      ? supabase
          .from(consultationsTable)
          .select('id,consultation_name,consultation_fees_inr')
          .in('id', consultationIds)
      : {data: [], error: null},
    locationIds.length
      ? supabase
          .from(locationsTable)
          .select('id,location_name,address,contact_number')
          .in('id', locationIds)
      : {data: [], error: null}
  ]);

  const relatedError =
    doctorResult.error ||
    consultationResult.error ||
    locationResult.error;

  if (relatedError) {
    throw relatedError;
  }

  const doctors = await addDoctorVacations(doctorResult.data);
  const doctorLookup = createLookup(doctors);
  const consultationLookup = createLookup(consultationResult.data);
  const locationLookup = createLookup(locationResult.data);

  return bookings.map((booking) => ({
    ...booking,
    doctor: doctorLookup.get(booking.doctor_id),
    consultation: consultationLookup.get(booking.consultation_id),
    location: locationLookup.get(booking.location_id)
  }));
}

async function listTeamMemberBookings(memberId) {
  const {data, error} = await supabase.rpc(
    'get_team_member_bookings_1789330000000',
    {
      member_id_value: memberId
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

export async function listDashboardBookings({force = false} = {}) {
  const cacheKey = getCacheKey();
  const cacheIsValid =
    !force &&
    bookingsCache.key === cacheKey &&
    bookingsCache.data &&
    bookingsCache.expiresAt > Date.now();

  if (cacheIsValid) {
    return bookingsCache.data;
  }

  if (bookingsRequest && bookingsRequest.key === cacheKey && !force) {
    return bookingsRequest.promise;
  }

  const member = getTeamMemberSession();
  const promise = (
    member?.member_id
      ? listTeamMemberBookings(member.member_id)
      : listOwnerBookings()
  )
    .then((data) => {
      bookingsCache = {
        key: cacheKey,
        data,
        expiresAt: Date.now() + BOOKINGS_CACHE_TTL
      };

      return data;
    })
    .finally(() => {
      if (bookingsRequest?.key === cacheKey) {
        bookingsRequest = null;
      }
    });

  bookingsRequest = {
    key: cacheKey,
    promise
  };

  return promise;
}

export async function updateDashboardBookingStatus(bookingId, status) {
  const member = getTeamMemberSession();

  if (member?.member_id) {
    const {data, error} = await supabase.rpc(
      'update_team_member_booking_status_1789330000000',
      {
        member_id_value: member.member_id,
        booking_id_value: bookingId,
        status_value: status
      }
    );

    if (error) {
      throw error;
    }

    invalidateDashboardBookings();
    return data;
  }

  const {data, error} = await supabase
    .from(bookingsTable)
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  invalidateDashboardBookings();
  return data;
}

export function cancelDashboardBooking(bookingId) {
  return updateDashboardBookingStatus(bookingId, 'cancelled');
}

export function markBookingVisited(bookingId) {
  return updateDashboardBookingStatus(bookingId, 'visited');
}

export function markBookingNoShow(bookingId) {
  return updateDashboardBookingStatus(bookingId, 'no_show');
}

export async function rescheduleDashboardBooking(
  bookingId,
  bookingDate,
  bookingTime
) {
  const member = getTeamMemberSession();

  if (member?.member_id) {
    const {data, error} = await supabase.rpc(
      'update_team_member_booking_status_1789330000000',
      {
        member_id_value: member.member_id,
        booking_id_value: bookingId,
        status_value: 'rescheduled'
      }
    );

    if (error) {
      throw error;
    }

    invalidateDashboardBookings();
    return data;
  }

  const {data, error} = await supabase
    .from(bookingsTable)
    .update({
      status: 'rescheduled',
      booking_date: bookingDate,
      booking_time: bookingTime,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  invalidateDashboardBookings();
  return data;
}

export function getDashboardMetrics(bookings) {
  const today = getTodayKey();
  const upcomingBookings = bookings.filter(
    (booking) =>
      booking.booking_date >= today && booking.status !== 'cancelled'
  );
  const todaysBookings = upcomingBookings.filter(
    (booking) => booking.booking_date === today
  );
  const confirmedBookings = upcomingBookings.filter(
    (booking) => booking.status === 'confirmed'
  );
  const rescheduledBookings = upcomingBookings.filter(
    (booking) => booking.status === 'rescheduled'
  );
  const visitedBookings = bookings.filter(
    (booking) => booking.status === 'visited'
  );
  const noShowBookings = bookings.filter(
    (booking) => booking.status === 'no_show'
  );
  const revenue = upcomingBookings.reduce(
    (total, booking) =>
      total + Number(booking.consultation?.consultation_fees_inr || 0),
    0
  );

  return {
    todaysBookings,
    todayCount: todaysBookings.length,
    upcomingCount: upcomingBookings.length,
    confirmedCount: confirmedBookings.length,
    rescheduledCount: rescheduledBookings.length,
    visitedCount: visitedBookings.length,
    noShowCount: noShowBookings.length,
    revenue
  };
}

export function subscribeToDashboardBookings(onChange) {
  return supabase
    .channel(`dashboard-bookings-live-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: bookingsTable
      },
      () => {
        invalidateDashboardBookings();
        onChange();
      }
    )
    .subscribe();
}

export function unsubscribeFromDashboardBookings(channel) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}