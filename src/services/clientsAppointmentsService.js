import supabase from '../supabase/supabase';

const BOOKING_TABLE = 'patient_bookings_1789315000000';
const DOCTOR_TABLE = 'doctors_1789298737910';
const CONSULTATION_TABLE = 'consultations_1789302054187';
const LOCATION_TABLE = 'business_locations_1789300875912';

const selectColumns = `
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
    google_maps_link,
    contact_number
  )
`;

export function normalizeClientAppointment(row) {
  return {
    ...row,
    displayStatus: row.status === 'visited' ? 'completed' : row.status || 'confirmed',
    clientName: row.patient_name || 'Client',
    appointmentType: row.consultation?.consultation_name || 'Appointment',
    professionalName: row.doctor?.doctor_name || 'Assigned professional',
    speciality: row.doctor?.speciality || '',
    locationName: row.location?.location_name || 'Location unavailable',
    address: row.location?.address || '',
    meetingLink: row.location?.google_maps_link || ''
  };
}

export async function listClientsAppointments() {
  const { data, error } = await supabase
    .from(BOOKING_TABLE)
    .select(selectColumns)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeClientAppointment);
}

export async function updateClientAppointmentStatus(id, status) {
  const { data, error } = await supabase
    .from(BOOKING_TABLE)
    .update({
      status: status === 'completed' ? 'visited' : status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(selectColumns)
    .single();

  if (error) throw error;
  return normalizeClientAppointment(data);
}

export async function rescheduleClientAppointment(id, date, time) {
  const { data, error } = await supabase.rpc(
    'reschedule_patient_booking_owner_1789620000000',
    {
      booking_id_value: id,
      booking_date_value: date,
      booking_time_value: time
    }
  );

  if (error) throw error;
  return normalizeClientAppointment(data?.[0] || {});
}

export function buildClientAppointmentAnalytics(items) {
  return items.reduce((result, item) => {
    result.total += 1;
    result[item.displayStatus] = (result[item.displayStatus] || 0) + 1;
    return result;
  }, {
    total: 0,
    confirmed: 0,
    rescheduled: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0
  });
}