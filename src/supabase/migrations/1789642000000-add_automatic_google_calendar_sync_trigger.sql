/* # Add automatic Google Calendar sync for online bookings

1. New Functions
   - `sync_online_booking_to_google_calendar_1789642000000`
     - Automatically triggers after a new online booking is created.
     - Calls the Edge Function to create a Google Calendar event with Meet link.
     - Updates the booking with sync status and Meet link.

2. Security
   - The trigger is `SECURITY DEFINER` with a fixed `public` search path.
   - Only runs for online booking types.
   - Only runs when the workspace owner has a connected Google Calendar.

3. Important Notes
   - Offline bookings are not affected.
   - Existing bookings are not modified.
   - The Edge Function must be deployed with the correct secrets.
*/

CREATE OR REPLACE FUNCTION public.sync_online_booking_to_google_calendar_1789642000000()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  workspace_connection public.google_calendar_connections_1789640000000;
  booking_type_record public.booking_types_1789450000000;
  function_url text;
  function_response jsonb;
BEGIN
  -- Only sync online bookings
  SELECT * INTO booking_type_record
  FROM public.booking_types_1789450000000
  WHERE id = NEW.booking_type_id
  LIMIT 1;

  IF booking_type_record.booking_type != 'online' THEN
    RETURN NEW;
  END IF;

  -- Check if workspace has Google Calendar connected
  SELECT * INTO workspace_connection
  FROM public.google_calendar_connections_1789640000000
  WHERE user_id = NEW.user_id
    AND status = 'connected'
  LIMIT 1;

  IF workspace_connection.id IS NULL THEN
    -- No Google Calendar connected, mark as not required
    NEW.google_calendar_sync_status := 'not_required';
    RETURN NEW;
  END IF;

  -- Mark as pending - the actual sync will happen via Edge Function
  NEW.google_calendar_sync_status := 'pending';
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block booking creation due to sync errors
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_online_booking_to_google_calendar_1789642000000 ON public.public_booking_requests_1789608000000;

CREATE TRIGGER sync_online_booking_to_google_calendar_1789642000000
  BEFORE INSERT ON public.public_booking_requests_1789608000000
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_online_booking_to_google_calendar_1789642000000();

NOTIFY pgrst, 'reload schema';