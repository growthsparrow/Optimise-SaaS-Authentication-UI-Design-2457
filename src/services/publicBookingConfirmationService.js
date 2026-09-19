import supabase from '../supabase/supabase';
import { syncGoogleCalendarBooking } from './googleCalendarService';

export async function getPublicBookingConfirmation(bookingId, verificationValue) {
  const { data, error } = await supabase.rpc(
    'get_public_booking_confirmation_1789632000000',
    {
      booking_id_value: bookingId,
      verification_value: verificationValue
    }
  );

  if (error) throw error;

  const confirmation = data?.[0] || null;

  // Automatically sync to Google Calendar if pending
  if (confirmation && confirmation.google_calendar_sync_status === 'pending') {
    try {
      await syncGoogleCalendarBooking(confirmation.id);
      // Reload confirmation to get the Meet link
      const { data: refreshedData } = await supabase.rpc(
        'get_public_booking_confirmation_1789632000000',
        {
          booking_id_value: bookingId,
          verification_value: verificationValue
        }
      );
      return refreshedData?.[0] || confirmation;
    } catch (syncError) {
      console.error('Failed to sync booking to Google Calendar:', syncError);
      // Return original confirmation even if sync failed
    }
  }

  return confirmation;
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
    confirmation.google_meet_link ? `Google Meet: ${confirmation.google_meet_link}` : '',
    `Confirmation ID: ${confirmation.booking_id}.`
  ].filter(Boolean).join('\n');

  if (navigator.share) {
    return navigator.share({
      title: 'Appointment confirmation',
      text
    });
  }

  return navigator.clipboard.writeText(text);
}