import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  getBusinessCategory,
  listMyAppointments,
  rescheduleMyAppointment,
  updateMyAppointmentStatus
} from '../services/myAppointmentsService';
import './MyAppointmentsDashboard.css';

const {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiFilter,
  FiGrid,
  FiMapPin,
  FiRefreshCw,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiXCircle
} = FiIcons;

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show'
};

function isMedicalBusiness(category) {
  return /medical|healthcare|health care/i.test(category);
}

function formatDate(value) {
  if (!value) return 'Date pending';

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(value) {
  return value === 'Full day' ? value : value?.slice(0, 5) || 'Time pending';
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function StatCard({ icon, label, value, helper, tone }) {
  return (
    <div className={`my-appointments-stat my-appointments-stat--${tone}`}>
      <div className="my-appointments-stat__icon">
        <SafeIcon icon={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="my-appointments-empty">
      <SafeIcon icon={FiCalendar} />
      <h3>No {label.toLowerCase()} found</h3>
      <p>New bookings from your public page will appear here.</p>
    </div>
  );
}

function MyAppointmentsDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [businessCategory, setBusinessCategory] = useState('');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [rescheduling, setRescheduling] = useState(null);

  const medicalBusiness = isMedicalBusiness(businessCategory);
  const personLabel = medicalBusiness ? 'Patients' : 'Clients';
  const appointmentLabel = medicalBusiness ? 'Patient appointments' : 'Client appointments';

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [items, category] = await Promise.all([
          listMyAppointments(),
          getBusinessCategory()
        ]);
        setAppointments(items);
        setBusinessCategory(category);
      } catch (error) {
        setNotice(error.message || 'Unable to load appointments.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const filteredAppointments = useMemo(() => {
    const today = dateKey(new Date());

    return appointments.filter((item) => {
      const matchesDate = filter === 'all'
        || (filter === 'today' && item.booking_date === today)
        || (filter === 'upcoming' && item.booking_date >= today)
        || (filter === 'past' && item.booking_date < today);

      const matchesStatus = statusFilter === 'all'
        || item.displayStatus === statusFilter;

      return matchesDate && matchesStatus;
    });
  }, [appointments, filter, statusFilter]);

  const metrics = useMemo(() => {
    const today = dateKey(new Date());
    const upcoming = appointments.filter((item) => item.booking_date >= today);
    const completed = appointments.filter((item) => item.displayStatus === 'completed');

    return {
      total: appointments.length,
      today: appointments.filter((item) => item.booking_date === today).length,
      upcoming: upcoming.length,
      completed: completed.length
    };
  }, [appointments]);

  async function changeStatus(id, status) {
    try {
      setNotice('');
      const updated = await updateMyAppointmentStatus(id, status);
      setAppointments((current) => current.map((item) => (
        item.id === id ? updated : item
      )));
    } catch (error) {
      setNotice(error.message || 'Unable to update this appointment.');
    }
  }

  async function submitReschedule(event) {
    event.preventDefault();

    try {
      setNotice('');
      const form = new FormData(event.currentTarget);
      const updated = await rescheduleMyAppointment(
        rescheduling.id,
        form.get('date'),
        form.get('time')
      );

      if (updated) {
        setAppointments((current) => current.map((item) => (
          item.id === rescheduling.id ? updated : item
        )));
      }

      setRescheduling(null);
    } catch (error) {
      setNotice(error.message || 'Unable to reschedule this appointment.');
    }
  }

  return (
    <main className="my-appointments-dashboard">
      <header className="my-appointments-header">
        <div>
          <div className="my-appointments-breadcrumb">
            <SafeIcon icon={FiGrid} /> Workspace / Appointments
          </div>
          <span className="my-appointments-eyebrow">Booking overview</span>
          <h1>My Appointments</h1>
          <p>Keep track of every booking, follow-up, and appointment outcome in one place.</p>
        </div>

        <div className="my-appointments-header-badge">
          <SafeIcon icon={FiUsers} />
          <span>{personLabel}<strong>{metrics.total} total bookings</strong></span>
        </div>
      </header>

      <section className="my-appointments-stat-grid">
        <StatCard icon={FiCalendar} label="All appointments" value={metrics.total} helper="Across your workspace" tone="blue" />
        <StatCard icon={FiClock} label="Today" value={metrics.today} helper="Scheduled for today" tone="orange" />
        <StatCard icon={FiTrendingUp} label="Upcoming" value={metrics.upcoming} helper="Future bookings" tone="purple" />
        <StatCard icon={FiCheckCircle} label="Completed" value={metrics.completed} helper="Marked as completed" tone="green" />
      </section>

      <section className="my-appointments-toolbar">
        <div>
          <span className="my-appointments-eyebrow">Booking register</span>
          <h2>{appointmentLabel}</h2>
          <p>Review contact details, booking preferences, and next actions.</p>
        </div>

        <div className="my-appointments-filters">
          <label>
            <SafeIcon icon={FiFilter} />
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </label>

          <label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option value={key} key={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {notice && <div className="my-appointments-notice">{notice}</div>}

      {loading ? (
        <div className="my-appointments-loading">
          <SafeIcon icon={FiRefreshCw} /> Loading appointments…
        </div>
      ) : !filteredAppointments.length ? (
        <EmptyState label={personLabel} />
      ) : (
        <section className="my-appointments-list">
          {filteredAppointments.map((appointment) => (
            <article className="my-appointment-card" key={appointment.id}>
              <div className="my-appointment-card__main">
                <div className="my-appointment-person">
                  <span><SafeIcon icon={FiUser} /></span>
                  <div>
                    <h3>{appointment.clientName}</h3>
                    <p>{appointment.clientEmail || appointment.clientPhone || 'Contact details unavailable'}</p>
                  </div>
                </div>

                <div className="my-appointment-card__status">
                  <span className={`my-appointment-status my-appointment-status--${appointment.displayStatus}`}>
                    {STATUS_LABELS[appointment.displayStatus] || appointment.displayStatus}
                  </span>
                  <strong>#{appointment.booking_id}</strong>
                </div>
              </div>

              <div className="my-appointment-details">
                <div>
                  <span><SafeIcon icon={FiCalendar} /> Date</span>
                  <strong>{formatDate(appointment.booking_date)}</strong>
                </div>
                <div>
                  <span><SafeIcon icon={FiClock} /> Time</span>
                  <strong>{formatTime(appointment.booking_time)}</strong>
                </div>
                <div>
                  <span><SafeIcon icon={FiGrid} /> Appointment</span>
                  <strong>{appointment.appointmentName}</strong>
                  <small>{appointment.professionalName}</small>
                </div>
                <div>
                  <span><SafeIcon icon={FiMapPin} /> Location</span>
                  <strong>{appointment.locationName || appointment.appointmentMode}</strong>
                  <small>{appointment.address || 'Online appointment details available'}</small>
                </div>
              </div>

              <div className="my-appointment-card__footer">
                <span>
                  {appointment.fee > 0 ? `₹${appointment.fee.toLocaleString('en-IN')}` : 'Fee not specified'}
                </span>

                <div className="my-appointment-actions">
                  {appointment.meetingLink && (
                    <a href={appointment.meetingLink} target="_blank" rel="noreferrer">
                      <SafeIcon icon={FiExternalLink} /> Join
                    </a>
                  )}
                  {appointment.mapLink && (
                    <a href={appointment.mapLink} target="_blank" rel="noreferrer">
                      <SafeIcon icon={FiMapPin} /> Map
                    </a>
                  )}
                  <button type="button" onClick={() => setRescheduling(appointment)}>
                    <SafeIcon icon={FiEdit3} /> Reschedule
                  </button>
                  <button type="button" onClick={() => changeStatus(appointment.id, 'completed')}>
                    <SafeIcon icon={FiCheckCircle} /> Complete
                  </button>
                  <button type="button" className="my-appointment-actions__cancel" onClick={() => changeStatus(appointment.id, 'cancelled')}>
                    <SafeIcon icon={FiXCircle} /> Cancel
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {rescheduling && (
        <div className="my-appointments-modal-backdrop">
          <form className="my-appointments-modal" onSubmit={submitReschedule}>
            <div className="my-appointments-modal__header">
              <div>
                <span className="my-appointments-eyebrow">#{rescheduling.booking_id}</span>
                <h2>Reschedule appointment</h2>
              </div>
              <button type="button" onClick={() => setRescheduling(null)}>×</button>
            </div>

            <p>Choose a new date and an available time for this booking.</p>

            <label>
              New date
              <input name="date" type="date" min={dateKey(new Date())} defaultValue={rescheduling.booking_date} required />
            </label>

            <label>
              New time
              <input name="time" type="text" defaultValue={rescheduling.booking_time} required />
            </label>

            <button type="submit" className="my-appointments-primary-button">
              <SafeIcon icon={FiRefreshCw} /> Save new time
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

export default MyAppointmentsDashboard;