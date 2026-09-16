import supabase from '../supabase/supabase';

const BOOKINGS_TABLE = 'patient_bookings_1789315000000';

export async function listCalendarAppointments() {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .select(`
      id,
      booking_id,
      patient_name,
      phone_number,
      email,
      booking_date,
      booking_time,
      status,
      doctor_id,
      consultation_id,
      location_id
    `)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}