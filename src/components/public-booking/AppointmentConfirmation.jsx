import { useState } from 'react';
import {
  reschedulePublicBooking,
  shareBookingConfirmation
} from '../../services/publicBookingConfirmationService';
import './AppointmentConfirmation.css';

function formatDate(value) {
  if (!value) return 'Date pending';

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function AppointmentConfirmation({ confirmation, verificationValue, onUpdated }) {
  const [showReschedule, setShowReschedule] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  if (!confirmation) return null;

  const reschedule = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const updated = await reschedulePublicBooking(
        confirmation.booking_id,
        verificationValue,
        date,
        time
      );

      onUpdated?.({
        ...confirmation,
        appointment_date: updated.appointment_date,
        appointment_time: updated.appointment_time,
        booking_status: updated.booking_status
      });
      setShowReschedule(false);
      setMessage('Your appointment has been rescheduled.');
    } catch (error) {
      setMessage(error.message || 'Unable to reschedule this appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="appointment-confirmation" aria-live="polite">
      <p className="appointment-confirmation__eyebrow">Booking confirmed</p>
      <h1>Hello {confirmation.client_name || 'there'},</h1>
      <p className="appointment-confirmation__summary">
        Your appointment for <strong>{confirmation.appointment_type}</strong> is
        confirmed with <strong>{confirmation.professional_name || 'your professional'}</strong>{' '}
        on <strong>{formatDate(confirmation.appointment_date)}</strong> at{' '}
        <strong>{confirmation.appointment_time}</strong>.
      </p>

      <dl className="appointment-confirmation__details">
        <div>
          <dt>Confirmation ID</dt>
          <dd>{confirmation.booking_id}</dd>
        </div>
        <div>
          <dt>Appointment type</dt>
          <dd>{confirmation.appointment_type}</dd>
        </div>
        <div>
          <dt>Professional</dt>
          <dd>{confirmation.professional_name || 'Not specified'}</dd>
        </div>
        <div>
          <dt>Date and time</dt>
          <dd>{formatDate(confirmation.appointment_date)} at {confirmation.appointment_time}</dd>
        </div>
      </dl>

      {confirmation.booking_type === 'offline' && (
        <div className="appointment-confirmation__location">
          <h2>Visit location</h2>
          <p>{confirmation.business_address || 'Address unavailable'}</p>
          <a href={confirmation.maps_url} target="_blank" rel="noreferrer">
            Open business map
          </a>
          <a href={`tel:${confirmation.business_contact}`}>
            Call {confirmation.business_contact}
          </a>
        </div>
      )}

      {confirmation.booking_type === 'online' && confirmation.meeting_invite_link && (
        <a
          className="appointment-confirmation__meeting"
          href={confirmation.meeting_invite_link}
          target="_blank"
          rel="noreferrer"
        >
          Open meeting link
        </a>
      )}

      <div className="appointment-confirmation__actions">
        <button
          type="button"
          onClick={() => shareBookingConfirmation(confirmation)}
        >
          Share booking confirmation
        </button>
        <button type="button" onClick={() => setShowReschedule((value) => !value)}>
          Reschedule appointment
        </button>
      </div>

      {showReschedule && (
        <form className="appointment-confirmation__reschedule" onSubmit={reschedule}>
          <h2>Choose a new date and time</h2>
          <label>
            New date
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>
          <label>
            New time
            <input
              type="text"
              value={time}
              placeholder="Example: 10:30 AM"
              onChange={(event) => setTime(event.target.value)}
              required={confirmation.appointment_time !== 'Full day'}
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Confirm new appointment time'}
          </button>
        </form>
      )}

      {message && <p className="appointment-confirmation__message">{message}</p>}
    </section>
  );
}

export default AppointmentConfirmation;