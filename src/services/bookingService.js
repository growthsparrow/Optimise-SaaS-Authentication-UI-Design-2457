import supabase from '../supabase/supabase';

const locationsTable = 'business_locations_1789300875912';
const doctorsTable = 'doctors_1789298737910';
const consultationsTable = 'consultations_1789302054187';
const CACHE_TTL = 30000;

const locationsCache = {
  data: null,
  expiresAt: 0
};

const doctorsCache = new Map();
const consultationsCache = new Map();

async function listDoctorVacations(doctorId) {
  const {data, error} = await supabase.rpc(
    'get_active_doctor_vacations_1789321000000',
    {
      doctor_id_value: doctorId
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

function getCached(cache, key) {
  const entry = cache.get(key);

  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }

  return null;
}

function setCached(cache, key, data) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL
  });

  return data;
}

export async function listBookingLocations() {
  if (locationsCache.data && locationsCache.expiresAt > Date.now()) {
    return locationsCache.data;
  }

  const {data, error} = await supabase
    .from(locationsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .order('location_name');

  if (error) {
    throw error;
  }

  locationsCache.data = data || [];
  locationsCache.expiresAt = Date.now() + CACHE_TTL;
  return locationsCache.data;
}

export async function listBookingDoctors(locationId) {
  const cachedDoctors = getCached(doctorsCache, locationId);

  if (cachedDoctors) {
    return cachedDoctors;
  }

  const {data: locationConsultations, error: consultationError} =
    await supabase
      .from(consultationsTable)
      .select('doctor_ids')
      .eq('is_archived', false)
      .eq('is_available_for_booking', true)
      .contains('location_ids', [locationId]);

  if (consultationError) {
    throw consultationError;
  }

  const doctorIds = [
    ...new Set(
      (locationConsultations || []).flatMap(
        (consultation) => consultation.doctor_ids || []
      )
    )
  ];

  if (!doctorIds.length) {
    return setCached(doctorsCache, locationId, []);
  }

  const {data, error} = await supabase
    .from(doctorsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .in('id', doctorIds)
    .order('doctor_name');

  if (error) {
    throw error;
  }

  const doctors = await Promise.all(
    (data || []).map(async (doctor) => ({
      ...doctor,
      vacations: await listDoctorVacations(doctor.id)
    }))
  );

  return setCached(doctorsCache, locationId, doctors);
}

export async function listBookingConsultations(doctorId, locationId) {
  const cacheKey = `${doctorId}:${locationId || 'all'}`;
  const cachedConsultations = getCached(consultationsCache, cacheKey);

  if (cachedConsultations) {
    return cachedConsultations;
  }

  let query = supabase
    .from(consultationsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .contains('doctor_ids', [doctorId]);

  if (locationId) {
    query = query.contains('location_ids', [locationId]);
  }

  const {data, error} = await query.order('consultation_name');

  if (error) {
    throw error;
  }

  return setCached(consultationsCache, cacheKey, data || []);
}

export async function findFutureBookings(phoneNumber) {
  const {data, error} = await supabase.rpc(
    'find_future_patient_bookings_1789315000000',
    {
      patient_phone: phoneNumber
    }
  );

  if (error) {
    throw error;
  }

  return data || [];
}

export async function createBooking(values) {
  const {data, error} = await supabase.rpc(
    'create_patient_booking_1789315000000',
    {
      patient_name_value: values.patientName,
      phone_number_value: values.phoneNumber,
      email_value: values.email || '',
      gender_value: values.gender,
      age_value: Number(values.age),
      location_id_value: values.locationId,
      doctor_id_value: values.doctorId,
      consultation_id_value: values.consultationId,
      booking_date_value: values.bookingDate,
      booking_time_value: values.bookingTime
    }
  );

  if (error) {
    throw error;
  }

  return data?.[0];
}

export async function rescheduleBooking(
  bookingId,
  bookingDate,
  bookingTime,
  phoneNumber
) {
  const {data, error} = await supabase.rpc(
    'reschedule_patient_booking_1789315000000',
    {
      booking_id_value: bookingId,
      booking_date_value: bookingDate,
      booking_time_value: bookingTime,
      patient_phone_value: phoneNumber
    }
  );

  if (error) {
    throw error;
  }

  return data?.[0];
}