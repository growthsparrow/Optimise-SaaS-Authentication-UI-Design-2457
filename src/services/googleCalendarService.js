import supabase from '../supabase/supabase';

const GOOGLE_CALENDAR_TEMPLATE_URL = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
const functionName = 'smooth-service';

async function invoke(action, body) {
  const query = new URLSearchParams({ action });
  const { data, error } = await supabase.functions.invoke(
    `${functionName}?${query.toString()}`,
    {
      body: body || {}
    }
  );

  if (error) {
    throw new Error(
      error.message || `Failed to send a request to the ${functionName} Edge Function.`
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export async function getGoogleCalendarStatus() {
  return invoke('status');
}

export async function beginGoogleCalendarConnection() {
  const data = await invoke('connect');

  if (!data?.authorizationUrl) {
    throw new Error('Google authorization URL was not returned.');
  }

  const popup = window.open(
    data.authorizationUrl,
    'optimise-google-calendar-oauth',
    'popup=yes,width=520,height=720,left=200,top=80,resizable=yes,scrollbars=yes'
  );

  if (!popup) {
    throw new Error('Please allow pop-ups to connect Google Calendar.');
  }

  return new Promise((resolve, reject) => {
    let finished = false;

    const finish = (callback, value) => {
      if (finished) {
        return;
      }

      finished = true;
      window.clearInterval(checkPopup);
      window.removeEventListener('message', handleMessage);

      if (!popup.closed) {
        popup.close();
      }

      callback(value);
    };

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type !== 'google-calendar-oauth') {
        return;
      }

      if (event.data.status === 'connected') {
        finish(resolve, { connected: true });
      } else {
        finish(
          reject,
          new Error(event.data.message || 'Google Calendar connection failed.')
        );
      }
    };

    const checkPopup = window.setInterval(() => {
      if (popup.closed) {
        finish(
          reject,
          new Error('Google Calendar connection was cancelled.')
        );
        return;
      }

      try {
        const popupUrl = popup.location.href;

        if (popupUrl.includes('google_calendar=connected')) {
          finish(resolve, { connected: true });
          return;
        }

        if (popupUrl.includes('google_calendar=error')) {
          const message = new URL(popupUrl).searchParams.get('message');

          finish(
            reject,
            new Error(message || 'Google Calendar connection failed.')
          );
        }
      } catch {
        // The popup remains on Google's domain until OAuth completes.
      }
    }, 500);

    window.addEventListener('message', handleMessage);
  });
}

export async function disconnectGoogleCalendar() {
  return invoke('disconnect');
}

export async function syncGoogleCalendarBooking(bookingId) {
  return invoke('sync-booking', { bookingId });
}

function formatBookingDetails(values) {
  const details = [
    values.professionalName?.trim() &&
      `Professional: ${values.professionalName.trim()}`,
    values.professionalExpertise?.trim() &&
      `Expertise: ${values.professionalExpertise.trim()}`,
    values.bookingType === 'offline' && values.locationName?.trim()
      ? `Location: ${values.locationName.trim()}`
      : '',
    values.bookingType === 'offline' && values.address?.trim()
      ? `Address: ${values.address.trim()}`
      : '',
    values.bookingType === 'online' && values.meetingInviteLink?.trim()
      ? `Meeting link: ${values.meetingInviteLink.trim()}`
      : '',
    values.duration === 'full-day'
      ? 'Duration: Full day'
      : values.duration
        ? `Duration: ${values.duration} minutes`
        : ''
  ].filter(Boolean);

  return details.join('\n');
}

export function createGoogleCalendarSetupUrl(values) {
  const params = new URLSearchParams({
    text: values.bookingName?.trim() || 'Appointment',
    details: formatBookingDetails(values),
    location: values.bookingType === 'offline'
      ? [values.locationName?.trim(), values.address?.trim()]
        .filter(Boolean)
        .join(', ')
      : values.meetingInviteLink?.trim() || ''
  });

  return `${GOOGLE_CALENDAR_TEMPLATE_URL}&${params.toString()}`;
}