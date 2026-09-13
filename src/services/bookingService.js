import supabase from '../supabase/supabase';

const locationsTable = 'business_locations_1789300875912';
const doctorsTable = 'doctors_1789298737910';
const consultationsTable = 'consultations_1789302054187';

export async function listBookingLocations() {
  const {data, error} = await supabase
    .from(locationsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .order('location_name');

  if (error) throw error;
  return data || [];
}

export async function listBookingDoctors(locationId) {
  const {data: locationConsultations, error: consultationError} = await supabase
    .from(consultationsTable)
    .select('doctor_ids')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .contains('location_ids', [locationId]);

  if (consultationError) throw consultationError;

  const doctorIds = [
    ...new Set(
      (locationConsultations || []).flatMap(
        (consultation) => consultation.doctor_ids || []
      )
    )
  ];

  if (!doctorIds.length) return [];

  const {data, error} = await supabase
    .from(doctorsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .in('id', doctorIds)
    .order('doctor_name');

  if (error) throw error;
  return data || [];
}

export async function listBookingConsultations(doctorId, locationId) {
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

  if (error) throw error;
  return data || [];
}

export async function findFutureBookings(phoneNumber) {
  const {data, error} = await supabase.rpc(
    'find_future_patient_bookings_1789315000000',
    {patient_phone: phoneNumber}
  );

  if (error) throw error;
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

  if (error) throw error;
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

  if (error) throw error;
  return data?.[0];
}