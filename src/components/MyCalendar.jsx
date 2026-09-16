import { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { listCalendarAppointments } from '../services/calendarService';
import './MyCalendar.css';

const { FiCalendar, FiClock, FiRefreshCw, FiUser } = FiIcons;

const statusLabels = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  visited: 'Visited',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show'
};

function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  }).format(new Date(`${value}T00:00:00`));
}

function MyCalendar() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAppointments() {
    setLoading(true);
    setError('');

    try {
      const rows = await listCalendarAppointments();
      setAppointments(rows);
      setSelectedDate((current) => current || rows[0]?.booking_date || '');
    } catch (loadError) {
      setError(loadError.message || 'Appointments could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const groupedDates = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.booking_date))],
    [appointments]
  );

  const selectedAppointments = appointments.filter(
    (appointment) => appointment.booking_date === selectedDate
  );

  return (
    <section className="my-calendar">
      <div className="my-calendar__hero">
        <div>
          <span className="my-calendar__eyebrow">Workspace calendar</span>
          <h1>My Calendar</h1>
          <p>Keep every client appointment organised in one calm, focused view.</p>
        </div>
        <button className="my-calendar__refresh" type="button" onClick={loadAppointments} disabled={loading}>
          <SafeIcon icon={FiRefreshCw} />
          Refresh
        </button>
      </div>

      {error && <div className="my-calendar__error">{error}</div>}

      {loading ? (
        <div className="my-calendar__empty">Loading your appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="my-calendar__empty">
          <SafeIcon icon={FiCalendar} />
          <h2>No appointments yet</h2>
          <p>Client bookings will appear here as soon as they are created.</p>
        </div>
      ) : (
        <div className="my-calendar__layout">
          <div className="my-calendar__dates">
            {groupedDates.map((date) => (
              <button
                className={selectedDate === date ? 'my-calendar__date my-calendar__date--active' : 'my-calendar__date'}
                type="button"
                key={date}
                onClick={() => setSelectedDate(date)}
              >
                <span>{formatDate(date)}</span>
                <strong>{appointments.filter((item) => item.booking_date === date).length}</strong>
              </button>
            ))}
          </div>

          <div className="my-calendar__appointments">
            <div className="my-calendar__section-heading">
              <div>
                <span className="my-calendar__eyebrow">Selected day</span>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <span className="my-calendar__count">{selectedAppointments.length} bookings</span>
            </div>

            {selectedAppointments.map((appointment) => (
              <article className="appointment-card" key={appointment.id}>
                <div className="appointment-card__time">
                  <SafeIcon icon={FiClock} />
                  <strong>{appointment.booking_time || 'Time pending'}</strong>
                </div>
                <div className="appointment-card__details">
                  <h3>{appointment.patient_name || 'Client'}</h3>
                  <p><SafeIcon icon={FiUser} /> {appointment.email || appointment.phone_number || 'Contact details unavailable'}</p>
                </div>
                <span className={`appointment-card__status appointment-card__status--${appointment.status}`}>
                  {statusLabels[appointment.status] || appointment.status}
                </span>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default MyCalendar;