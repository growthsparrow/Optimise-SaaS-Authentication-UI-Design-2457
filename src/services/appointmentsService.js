import supabase from '../supabase/supabase';

const BOOKING_TABLE = 'public_booking_requests_1789608000000';
const TYPE_TABLE = 'booking_types_1789450000000';
const PAGE_TABLE = 'business_pages_1789493000000';

const bookingSelect = `
  id,
  booking_id,
  user_id,
  business_page_id,
  booking_type_id,
  form_response,
  booking_date,
  booking_time,
  status,
  created_at,
  updated_at,
  booking_type:${TYPE_TABLE} (
    booking_name,
    booking_type,
    location_name,
    address,
    google_maps_link,
    meeting_invite_link,
    professional_name
  ),
  business_page:${PAGE_TABLE} (
    business_name
  )
`;

function readClientName(response) {
  return response?.name
    || response?.full_name
    || response?.client_name
    || response?.patient_name
    || 'Client';
}

export function normalizeAppointment(row) {
  const response = row.form_response || {};
  const type = row.booking_type || {};
  const location = type.booking_type === 'online'
    ? type.meeting_invite_link
    : type.location_name || type.address;

  return {
    ...row,
    clientName: readClientName(response),
    email: response.email || response.email_address || '',
    appointmentType: type.booking_name || 'Appointment',
    location: location || 'Location not provided',
    meetingLink: type.meeting_invite_link || '',
    professionalName: type.professional_name || ''
  };
}

export async function listAppointments() {
  const { data, error } = await supabase
    .from(BOOKING_TABLE)
    .select(bookingSelect)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeAppointment);
}

export async function updateAppointmentStatus(id, status) {
  const { data, error } = await supabase
    .from(BOOKING_TABLE)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(bookingSelect)
    .single();

  if (error) throw error;
  return normalizeAppointment(data);
}

export async function rescheduleAppointment(id, date, time) {
  const { data, error } = await supabase.rpc(
    'reschedule_public_booking_request_1789615000000',
    {
      booking_id_value: id,
      booking_date_value: date,
      booking_time_value: time
    }
  );

  if (error) throw error;
  return data?.[0];
}

export function getAppointmentAnalytics(appointments) {
  return appointments.reduce((summary, appointment) => {
    const status = appointment.status || 'confirmed';
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, {
    total: 0,
    confirmed: 0,
    rescheduled: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0
  });
}