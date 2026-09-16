import supabase from '../supabase/supabase';

export async function getPublicBookingConfirmation(bookingId, verificationValue) {
  const { data, error } = await supabase.rpc(
    'get_public_booking_confirmation_1789632000000',
    {
      booking_id_value: bookingId,
      verification_value: verificationValue
    }
  );

  if (error) throw error;

  return data?.[0] || null;
}

export async function reschedulePublicBooking(
  bookingId,
  verificationValue,
  bookingDate,
  bookingTime
) {
  const { data, error } = await supabase.rpc(
    'reschedule_public_booking_request_1789632000000',
    {
      booking_id_value: bookingId,
      verification_value: verificationValue,
      booking_date_value: bookingDate,
      booking_time_value: bookingTime
    }
  );

  if (error) throw error;

  return data?.[0] || null;
}

export function shareBookingConfirmation(confirmation) {
  const text = [
    `Appointment confirmed for ${confirmation.client_name}.`,
    `Appointment type: ${confirmation.appointment_type}.`,
    `Date: ${confirmation.appointment_date}.`,
    `Time: ${confirmation.appointment_time}.`,
    `Confirmation ID: ${confirmation.booking_id}.`
  ].join('\n');

  if (navigator.share) {
    return navigator.share({
      title: 'Appointment confirmation',
      text
    });
  }

  return navigator.clipboard.writeText(text);
}