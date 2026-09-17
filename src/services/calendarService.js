import supabase from '../supabase/supabase';

const BOOKINGS_TABLE = 'public_booking_requests_1789608000000';
const BOOKING_TYPES_TABLE = 'booking_types_1789450000000';
const BUSINESS_PAGES_TABLE = 'business_pages_1789493000000';

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
  booking_type:${BOOKING_TYPES_TABLE} (
    booking_name,
    professional_name,
    booking_type,
    cost_inr,
    location_name,
    address,
    meeting_invite_link
  ),
  business_page:${BUSINESS_PAGES_TABLE} (
    business_name
  )
`;

const bookingColumns = `
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
  updated_at
`;

function getResponseValue(response, keys) {
  for (const key of keys) {
    const value = response?.[key];

    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }

  return '';
}

function normalizeAppointment(row) {
  const response = row.form_response || {};
  const bookingType = row.booking_type || {};
  const businessPage = row.business_page || {};
  const isOnline = bookingType.booking_type === 'online';

  return {
    ...row,
    patient_name: getResponseValue(response, [
      'patient_name',
      'patient-name',
      'client_name',
      'client-name',
      'full_name',
      'full-name',
      'name'
    ]) || 'Client',
    phone_number: getResponseValue(response, [
      'phone_number',
      'phone-number',
      'phone',
      'contact_number',
      'contact-number',
      'mobile'
    ]),
    email: getResponseValue(response, [
      'email',
      'email_address',
      'email-address'
    ]),
    booking_type_name: bookingType.booking_name || 'Appointment',
    booking_mode: isOnline ? 'Online' : 'Offline',
    professional_name: bookingType.professional_name || 'Professional not assigned',
    business_name: businessPage.business_name || '',
    consultation_fee: Number(bookingType.cost_inr || 0),
    location_name: isOnline
      ? 'Online appointment'
      : bookingType.location_name || 'Location not provided',
    address: isOnline ? '' : bookingType.address || '',
    meeting_link: isOnline ? bookingType.meeting_invite_link || '' : '',
    is_online: isOnline
  };
}

async function loadFallbackAppointments() {
  const { data: bookings, error: bookingsError } = await supabase
    .from(BOOKINGS_TABLE)
    .select(bookingColumns)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (bookingsError) throw bookingsError;

  const rows = bookings || [];
  const bookingTypeIds = [...new Set(rows.map((booking) => booking.booking_type_id).filter(Boolean))];
  const businessPageIds = [...new Set(rows.map((booking) => booking.business_page_id).filter(Boolean))];

  const [{ data: bookingTypes, error: bookingTypesError }, { data: businessPages, error: pagesError }] = await Promise.all([
    bookingTypeIds.length
      ? supabase.from(BOOKING_TYPES_TABLE).select('id,booking_name,professional_name,booking_type,cost_inr,location_name,address,meeting_invite_link').in('id', bookingTypeIds)
      : Promise.resolve({ data: [], error: null }),
    businessPageIds.length
      ? supabase.from(BUSINESS_PAGES_TABLE).select('id,business_name').in('id', businessPageIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (bookingTypesError) throw bookingTypesError;
  if (pagesError) throw pagesError;

  const bookingTypeById = new Map((bookingTypes || []).map((bookingType) => [bookingType.id, bookingType]));
  const businessPageById = new Map((businessPages || []).map((businessPage) => [businessPage.id, businessPage]));

  return rows.map((booking) => normalizeAppointment({
    ...booking,
    booking_type: bookingTypeById.get(booking.booking_type_id) || {},
    business_page: businessPageById.get(booking.business_page_id) || {}
  }));
}

export async function listCalendarAppointments() {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select(bookingSelect)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (!error) return (data || []).map(normalizeAppointment);
  return loadFallbackAppointments();
}

async function updateBooking(id, values) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(bookingSelect)
    .single();

  if (error) throw new Error(error.message || 'The appointment could not be updated.');
  return normalizeAppointment(data);
}

export async function cancelCalendarAppointment(appointment) {
  if (appointment.status === 'cancelled') throw new Error('This appointment has already been cancelled.');
  if (['completed', 'visited', 'no_show'].includes(appointment.status)) throw new Error('Completed appointments cannot be cancelled.');
  return updateBooking(appointment.id, { status: 'cancelled' });
}

export async function rescheduleCalendarAppointment(appointment, date, time) {
  if (appointment.status === 'cancelled') throw new Error('Cancelled appointments cannot be rescheduled.');
  if (['completed', 'visited', 'no_show'].includes(appointment.status)) throw new Error('Completed appointments cannot be rescheduled.');
  if (!date || !time) throw new Error('Choose both a new date and time.');
  if (date < new Date().toISOString().slice(0, 10)) throw new Error('Choose a future appointment date.');
  return updateBooking(appointment.id, { booking_date: date, booking_time: time, status: 'rescheduled' });
}