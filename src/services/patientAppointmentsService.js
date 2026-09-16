import supabase from '../supabase/supabase';

const BOOKING_TABLE = 'patient_bookings_1789315000000';
const DOCTOR_TABLE = 'doctors_1789298737910';
const CONSULTATION_TABLE = 'consultations_1789302054187';
const LOCATION_TABLE = 'business_locations_1789300875912';

const ownerBookingSelect = `
  id,
  booking_id,
  patient_name,
  phone_number,
  email,
  gender,
  age,
  location_id,
  doctor_id,
  consultation_id,
  booking_date,
  booking_time,
  status,
  created_at,
  updated_at,
  doctor:${DOCTOR_TABLE} (
    doctor_name,
    speciality
  ),
  consultation:${CONSULTATION_TABLE} (
    consultation_name,
    consultation_fees_inr
  ),
  location:${LOCATION_TABLE} (
    location_name,
    address,
    google_maps_link
  )
`;

function normalizeStatus(status) {
  return status === 'visited' ? 'completed' : status || 'confirmed';
}

function normalizeAppointment(row) {
  return {
    ...row,
    status: normalizeStatus(row.status),
    clientName: row.patient_name || 'Patient',
    appointmentType: row.consultation?.consultation_name || 'Consultation',
    doctorName: row.doctor?.doctor_name || 'Assigned doctor',
    speciality: row.doctor?.speciality || '',
    locationName: row.location?.location_name || 'Location unavailable',
    address: row.location?.address || '',
    mapLink: row.location?.google_maps_link || ''
  };
}

export async function listPatientAppointments() {
  const { data, error } = await supabase
    .from(BOOKING_TABLE)
    .select(ownerBookingSelect)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeAppointment);
}

export async function updatePatientAppointmentStatus(id, status) {
  const databaseStatus = status === 'completed' ? 'completed' : status;

  const { data, error } = await supabase
    .from(BOOKING_TABLE)
    .update({
      status: databaseStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(ownerBookingSelect)
    .single();

  if (error) throw error;
  return normalizeAppointment(data);
}

export async function reschedulePatientAppointment(id, date, time) {
  const { data, error } = await supabase.rpc(
    'reschedule_patient_booking_owner_1789620000000',
    {
      booking_id_value: id,
      booking_date_value: date,
      booking_time_value: time
    }
  );

  if (error) throw error;
  return normalizeAppointment(data?.[0] || {});
}