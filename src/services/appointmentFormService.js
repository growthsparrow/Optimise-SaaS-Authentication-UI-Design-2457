import supabase from '../supabase/supabase';
import {
  normalizePhoneFields,
  validatePhoneFields
} from '../utils/phone';

const formsTable = 'appointment_forms_1789608000000';
const publicBookingsTable = 'public_booking_requests_1789608000000';

export const fieldTypes = [
  { value: 'text', label: 'Short text' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone number' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' }
];

export const defaultAppointmentFields = [
  {
    id: 'full-name',
    name: 'full_name',
    label: 'Full name',
    type: 'text',
    required: true,
    placeholder: 'Enter your full name',
    options: []
  },
  {
    id: 'phone-number',
    name: 'phone_number',
    label: 'Phone number',
    type: 'tel',
    required: true,
    placeholder: '10-digit phone number',
    options: []
  },
  {
    id: 'email',
    name: 'email',
    label: 'Email address',
    type: 'email',
    required: false,
    placeholder: 'you@example.com',
    options: []
  }
];

export async function getMyAppointmentForm() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error('Your session has expired. Please sign in again.');

  const { data, error } = await supabase
    .from(formsTable)
    .select('*')
    .eq('user_id', userData.user.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveAppointmentForm(values, existingForm) {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error('Your session has expired. Please sign in again.');

  const payload = {
    user_id: userData.user.id,
    form_name: values.formName.trim() || 'Appointment form',
    description: values.description.trim(),
    fields: values.fields.map((field, index) => ({
      ...field,
      position: index,
      options: field.type === 'select' ? field.options.filter(Boolean) : []
    })),
    is_published: values.isPublished,
    updated_at: new Date().toISOString()
  };

  const query = existingForm
    ? supabase.from(formsTable).update(payload).eq('id', existingForm.id)
    : supabase.from(formsTable).insert(payload);

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function getPublicAppointmentForm(businessSlug) {
  const { data, error } = await supabase.rpc(
    'get_public_appointment_form_1789608000000',
    { business_slug_value: businessSlug }
  );

  if (error) throw error;
  return data?.[0] || null;
}

export async function createPublicBooking({
  businessSlug,
  bookingTypeId,
  bookingDate,
  bookingTime,
  formResponse
}) {
  const normalizedResponse = normalizePhoneFields(formResponse);
  const phoneError = validatePhoneFields(normalizedResponse);

  if (phoneError) throw new Error(phoneError);

  const { data, error } = await supabase.rpc(
    'create_public_booking_request_1789608000000',
    {
      business_slug_value: businessSlug,
      booking_type_id_value: bookingTypeId,
      booking_date_value: bookingDate,
      booking_time_value: bookingTime,
      form_response_value: normalizedResponse
    }
  );

  if (error) throw error;
  return data?.[0];
}

export async function listPublicBookingRequests() {
  const { data, error } = await supabase
    .from(publicBookingsTable)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}