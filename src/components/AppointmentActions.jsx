import React, {useMemo, useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  cancelDashboardBooking,
  markBookingNoShow,
  markBookingVisited,
  rescheduleDashboardBooking
} from '../services/dashboardService';

const {
  FiCalendar,
  FiCheck,
  FiClock,
  FiSave,
  FiSlash,
  FiUserCheck,
  FiX
} = FiIcons;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildAvailableDates(booking) {
  const doctor = booking.doctor;
  const vacations = doctor?.vacations || [];
  const dates = [];

  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);

    const weekday = date.toLocaleDateString('en-US', {weekday: 'long'});
    const key = dateKey(date);
    const onVacation = vacations.some(
      (vacation) => key >= vacation.start_date && key <= vacation.end_date
    );

    if (doctor?.available_days?.includes(weekday) && !onVacation) {
      dates.push(key);
    }
  }

  return dates;
}

function formatDate(value) {
  if (!value) {
    return 'Choose a date';
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString(
    'en-US',
    {weekday: 'short', month: 'short', day: 'numeric'}
  );
}

function AppointmentActions({booking, onChanged, setNotice}) {
  const [mode, setMode] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => buildAvailableDates(booking), [booking]);
  const slots = booking.doctor?.selected_time_slots || [];
  const isClosed = ['cancelled', 'visited', 'no_show'].includes(booking.status);

  const runAction = async (action, successMessage) => {
    setSaving(true);

    try {
      await action();
      setNotice(successMessage);
      onChanged();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (!window.confirm(`Cancel appointment ${booking.booking_id}?`)) {
      return;
    }

    runAction(
      () => cancelDashboardBooking(booking.id),
      'Appointment cancelled successfully.'
    );
  };

  const markVisited = () => {
    runAction(
      () => markBookingVisited(booking.id),
      'Appointment marked as visited.'
    );
  };

  const markNoShow = () => {
    runAction(
      () => markBookingNoShow(booking.id),
      'Appointment marked as no-show.'
    );
  };

  const openReschedule = () => {
    setDate('');
    setTime('');
    setMode('reschedule');
  };

  const closeReschedule = () => {
    setDate('');
    setTime('');
    setMode(null);
  };

  const reschedule = async (event) => {
    event.preventDefault();

    if (!date || !time) {
      setNotice('Choose both a new date and time.');
      return;
    }

    setSaving(true);

    try {
      await rescheduleDashboardBooking(booking.id, date, time);
      setNotice('Appointment rescheduled successfully.');
      closeReschedule();
      onChanged();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'reschedule') {
    return (
      <form className="appointment-actions__editor" onSubmit={reschedule}>
        <div className="appointment-actions__editor-heading">
          <div>
            <span>Reschedule appointment</span>
            <small>
              Current: {formatDate(booking.booking_date)} · {booking.booking_time}
            </small>
          </div>
          <button
            className="appointment-actions__close"
            type="button"
            onClick={closeReschedule}
            aria-label="Close reschedule editor"
          >
            <SafeIcon icon={FiX} />
          </button>
        </div>

        <div className="appointment-actions__fields">
          <label>
            <span>New date</span>
            <select
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="New appointment date"
            >
              <option value="">Select date</option>
              {dates.map((item) => (
                <option value={item} key={item}>
                  {formatDate(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>New time</span>
            <select
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-label="New appointment time"
            >
              <option value="">Select time</option>
              {slots.map((slot) => (
                <option value={slot} key={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="appointment-actions__editor-footer">
          <span>
            <SafeIcon icon={FiClock} />
            Doctor availability only
          </span>
          <div>
            <button
              className="appointment-action appointment-action--close"
              type="button"
              onClick={closeReschedule}
            >
              Close
            </button>
            <button
              className="appointment-action appointment-action--save"
              disabled={saving}
            >
              <SafeIcon icon={saving ? FiClock : FiSave} />
              {saving ? 'Saving…' : 'Save change'}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="appointment-actions">
      <button
        className="appointment-action appointment-action--reschedule"
        type="button"
        onClick={openReschedule}
        disabled={saving || isClosed}
      >
        <SafeIcon icon={FiCalendar} />
        Reschedule
      </button>

      <button
        className="appointment-action appointment-action--visited"
        type="button"
        onClick={markVisited}
        disabled={saving || isClosed}
      >
        <SafeIcon icon={FiUserCheck} />
        Visited
      </button>

      <button
        className="appointment-action appointment-action--no-show"
        type="button"
        onClick={markNoShow}
        disabled={saving || isClosed}
      >
        <SafeIcon icon={FiSlash} />
        No show
      </button>

      <button
        className="appointment-action appointment-action--cancel"
        type="button"
        onClick={cancel}
        disabled={saving || isClosed}
      >
        <SafeIcon icon={FiX} />
        {saving ? 'Updating…' : 'Cancel'}
      </button>
    </div>
  );
}

export default AppointmentActions;