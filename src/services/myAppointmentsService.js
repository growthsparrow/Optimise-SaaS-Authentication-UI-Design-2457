import supabase from '../supabase/supabase';

const BOOKINGS_TABLE = 'public_booking_requests_1789608000000';
const BOOKING_TYPES_TABLE = 'booking_types_1789450000000';
const BUSINESS_PAGES_TABLE = 'business_pages_1789493000000';

const appointmentSelect = `
  id,
  booking_id,
  form_response,
  booking_date,
  booking_time,
  status,
  created_at,
  updated_at,
  booking_type:${BOOKING_TYPES_TABLE} (
    booking_name,
    professional_name,
    professional_expertise,
    cost_inr,
    booking_type,
    location_name,
    address,
    google_maps_link,
    meeting_invite_link
  )
`;

function valueFromResponse(response, keys, fallback = '') {
  for (const key of keys) {
    if (response?.[key] !== undefined && response[key] !== '') {
      return response[key];
    }
  }

  return fallback;
}

function normalizeAppointment(row) {
  const response = row.form_response || {};
  const type = row.booking_type || {};

  return {
    ...row,
    clientName: valueFromResponse(
      response,
      ['name', 'full_name', 'full-name', 'client_name', 'patient_name'],
      'Client'
    ),
    clientEmail: valueFromResponse(response, ['email', 'email_address']),
    clientPhone: valueFromResponse(
      response,
      ['phone', 'phone_number', 'contact_number', 'mobile']
    ),
    appointmentName: type.booking_name || 'Appointment',
    professionalName: type.professional_name || 'Assigned professional',
    expertise: type.professional_expertise || '',
    fee: Number(type.cost_inr || 0),
    appointmentMode: type.booking_type || 'offline',
    locationName: type.location_name || '',
    address: type.address || '',
    mapLink: type.google_maps_link || '',
    meetingLink: type.meeting_invite_link || '',
    displayStatus: row.status || 'confirmed'
  };
}

export async function getBusinessCategory() {
  const { data, error } = await supabase
    .from(BUSINESS_PAGES_TABLE)
    .select('business_category')
    .maybeSingle();

  if (error) throw error;
  return data?.business_category || '';
}

export async function listMyAppointments() {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select(appointmentSelect)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeAppointment);
}

export async function updateMyAppointmentStatus(id, status) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(appointmentSelect)
    .single();

  if (error) throw error;
  return normalizeAppointment(data);
}

export async function rescheduleMyAppointment(id, date, time) {
  const { data, error } = await supabase.rpc(
    'reschedule_public_booking_request_1789615000000',
    {
      booking_id_value: id,
      booking_date_value: date,
      booking_time_value: time
    }
  );

  if (error) throw error;

  const updated = data?.[0];
  if (!updated) return null;

  const current = await supabase
    .from(BOOKINGS_TABLE)
    .select(appointmentSelect)
    .eq('id', id)
    .single();

  if (current.error) throw current.error;
  return normalizeAppointment(current.data);
}