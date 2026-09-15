/*
# Add full-day booking date availability

1. Modified Tables
- `booking_types_1789450000000`
- Adds `available_dates` (date[]): Specific dates that clients can choose when a booking type uses the full-day duration.

2. Security
- Existing row-level security and owner policies remain unchanged.

3. Important Notes
- Existing booking types receive an empty date list.
- Existing booking type data is preserved.
- Full-day booking types can use these dates to show a client-facing calendar.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_types_1789450000000'
      AND column_name = 'available_dates'
  ) THEN
    ALTER TABLE public.booking_types_1789450000000
      ADD COLUMN available_dates date[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS booking_types_available_dates_idx_1789453000000
  ON public.booking_types_1789450000000
  USING gin (available_dates);

NOTIFY pgrst, 'reload schema';