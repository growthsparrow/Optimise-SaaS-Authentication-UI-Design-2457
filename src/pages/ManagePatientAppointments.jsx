import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  listPatientAppointments,
  reschedulePatientAppointment,
  updatePatientAppointmentStatus
} from '../services/patientAppointmentsService';
import './ManagePatientAppointments.css';

const {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFilter,
  FiMapPin,
  FiPhone,
  FiRefreshCw,
  FiTrendingUp,
  FiUser,
  FiUserX,
  FiXCircle
} = FiIcons;

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show'
};

function formatDate(date) {
  if (!date) return '—';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(time) {
  return time === 'Full day' ? time : time?.slice(0, 5) || 'Time pending';
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getFilterDates(filter, customStart, customEnd) {
  if (filter === 'all') return null;

  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (filter === 'tomorrow') {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  if (filter === 'week') {
    end.setDate(end.getDate() + 7);
  }

  if (filter === 'month') {
    end.setMonth(end.getMonth() + 1);
  }

  if (filter === 'custom') {
    return { start: customStart, end: customEnd };
  }

  return { start: dateKey(start), end: dateKey(end) };
}

function StatCard({ icon, label, value, tone }) {
  return (
    <div className={`patient-stat patient-stat--${tone}`}>
      <div className="patient-stat__icon"><SafeIcon icon={icon} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function ManagePatientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [rescheduling, setRescheduling] = useState(null);

  useEffect(() => {
    async function loadAppointments() {
      try {
        setLoading(true);
        setAppointments(await listPatientAppointments());
      } catch (error) {
        setMessage(error.message || 'Unable to load patient appointments.');
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, []);

  const appointmentTypes = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.appointmentType))],
    [appointments]
  );

  const filteredAppointments = useMemo(() => {
    const dates = getFilterDates(dateFilter, customStart, customEnd);

    return appointments.filter((appointment) => {
      const inDateRange = !dates
        || (
          appointment.booking_date >= dates.start
          && appointment.booking_date <= dates.end
        );

      const inStatus = statusFilter === 'all' || appointment.status === statusFilter;
      const inType = typeFilter === 'all' || appointment.appointmentType === typeFilter;

      return inDateRange && inStatus && inType;
    });
  }, [
    appointments,
    dateFilter,
    statusFilter,
    typeFilter,
    customStart,
    customEnd
  ]);

  const analytics = useMemo(() => {
    const values = filteredAppointments;
    const total = values.length;

    return {
      total,
      confirmed: values.filter((item) => item.status === 'confirmed').length,
      completed: values.filter((item) => item.status === 'completed').length,
      rescheduled: values.filter((item) => item.status === 'rescheduled').length,
      cancelled: values.filter((item) => item.status === 'cancelled').length,
      noShow: values.filter((item) => item.status === 'no_show').length
    };
  }, [filteredAppointments]);

  async function changeStatus(id, status) {
    try {
      setMessage('');
      const updated = await updatePatientAppointmentStatus(id, status);
      setAppointments((current) => current.map((item) => item.id === id ? updated : item));
    } catch (error) {
      setMessage(error.message || 'Unable to update appointment status.');
    }
  }

  async function submitReschedule(event) {
    event.preventDefault();

    try {
      setMessage('');
      const form = new FormData(event.currentTarget);
      const updated = await reschedulePatientAppointment(
        rescheduling.id,
        form.get('booking_date'),
        form.get('booking_time')
      );

      setAppointments((current) => current.map((item) => (
        item.id === rescheduling.id
          ? { ...item, ...updated }
          : item
      )));
      setRescheduling(null);
    } catch (error) {
      setMessage(error.message || 'The appointment could not be rescheduled.');
    }
  }

  function exportExcel() {
    const rows = filteredAppointments.map((item) => [
      item.booking_id,
      item.clientName,
      item.phone_number,
      item.appointmentType,
      item.doctorName,
      item.booking_date,
      item.booking_time,
      item.locationName,
      STATUS_LABELS[item.status]
    ]);

    const csv = [
      [
        'Booking ID',
        'Booked By',
        'Phone',
        'Appointment Type',
        'Doctor',
        'Date',
        'Time',
        'Location',
        'Status'
      ],
      ...rows
    ]
      .map((row) => row.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'patient-appointments.xls';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="patient-appointments-page">
      <header className="patient-appointments-hero">
        <div>
          <span className="patient-eyebrow">Public booking operations</span>
          <h1>Manage appointments</h1>
          <p>Every appointment booked through your public booking page, in one focused workspace.</p>
        </div>

        <div className="patient-hero-actions">
          <button type="button" className="patient-button patient-button--muted" onClick={() => window.print()}>
            <SafeIcon icon={FiDownload} /> Export PDF
          </button>
          <button type="button" className="patient-button patient-button--primary" onClick={exportExcel}>
            <SafeIcon icon={FiDownload} /> Export Excel
          </button>
        </div>
      </header>

      <section className="patient-stat-grid">
        <StatCard icon={FiCalendar} label="Showing" value={analytics.total} tone="blue" />
        <StatCard icon={FiClock} label="Confirmed" value={analytics.confirmed} tone="amber" />
        <StatCard icon={FiCheckCircle} label="Completed" value={analytics.completed} tone="green" />
        <StatCard icon={FiTrendingUp} label="Rescheduled" value={analytics.rescheduled} tone="purple" />
      </section>

      <section className="patient-analytics-card">
        <div className="patient-section-heading">
          <div>
            <span className="patient-eyebrow">Live performance view</span>
            <h2>Appointment analytics</h2>
          </div>
          <span className="patient-analytics-total">
            {analytics.total ? Math.round((analytics.completed / analytics.total) * 100) : 0}% completion
          </span>
        </div>

        <div className="patient-chart">
          {[
            ['Confirmed', analytics.confirmed, 'blue'],
            ['Completed', analytics.completed, 'green'],
            ['Rescheduled', analytics.rescheduled, 'purple'],
            ['Cancelled', analytics.cancelled, 'red'],
            ['No show', analytics.noShow, 'slate']
          ].map(([label, value, tone]) => (
            <div className="patient-chart__row" key={label}>
              <span>{label}</span>
              <div className="patient-chart__track">
                <i
                  className={`patient-chart__bar patient-chart__bar--${tone}`}
                  style={{ width: `${analytics.total ? Math.max(5, (value / analytics.total) * 100) : 5}%` }}
                />
              </div>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="patient-appointments-card">
        <div className="patient-section-heading">
          <div>
            <span className="patient-eyebrow">Booking register</span>
            <h2>Client appointments</h2>
          </div>
          <span className="patient-result-count">{filteredAppointments.length} appointments</span>
        </div>

        <div className="patient-filters">
          <div className="patient-filter-title"><SafeIcon icon={FiFilter} /> Filter view</div>

          <label>
            Date
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              <option value="all">All dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
              <option value="custom">Custom dates</option>
            </select>
          </label>

          {dateFilter === 'custom' && (
            <>
              <label>
                From
                <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
              </label>
            </>
          )}

          <label>
            Appointment type
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All types</option>
              {appointmentTypes.map((type) => <option value={type} key={type}>{type}</option>)}
            </select>
          </label>

          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        {message && <div className="patient-alert">{message}</div>}

        {loading ? (
          <div className="patient-loading"><SafeIcon icon={FiRefreshCw} /> Loading public bookings…</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="patient-empty">
            <SafeIcon icon={FiCalendar} />
            <h3>No appointments found</h3>
            <p>Try adjusting your filters or wait for a client to book through your public page.</p>
          </div>
        ) : (
          <div className="patient-table-scroll">
            <table className="patient-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Booked by</th>
                  <th>Appointment type</th>
                  <th>Date and time</th>
                  <th>Location</th>
                  <th>Status and actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td><span className="patient-booking-id">#{appointment.booking_id}</span></td>
                    <td>
                      <div className="patient-client">
                        <span className="patient-client__avatar"><SafeIcon icon={FiUser} /></span>
                        <div>
                          <strong>{appointment.clientName}</strong>
                          <small><SafeIcon icon={FiPhone} /> {appointment.phone_number || 'No phone added'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{appointment.appointmentType}</strong>
                      <small className="patient-subtext">{appointment.doctorName}</small>
                    </td>
                    <td>
                      <strong>{formatDate(appointment.booking_date)}</strong>
                      <small className="patient-subtext"><SafeIcon icon={FiClock} /> {formatTime(appointment.booking_time)}</small>
                    </td>
                    <td>
                      <div className="patient-location">
                        <SafeIcon icon={FiMapPin} />
                        <span>{appointment.locationName}</span>
                      </div>
                      {appointment.address && <small className="patient-subtext">{appointment.address}</small>}
                    </td>
                    <td>
                      <span className={`patient-status patient-status--${appointment.status}`}>
                        {STATUS_LABELS[appointment.status]}
                      </span>
                      <div className="patient-row-actions">
                        <button type="button" title="Confirm" onClick={() => changeStatus(appointment.id, 'confirmed')}>
                          <SafeIcon icon={FiCheckCircle} />
                        </button>
                        <button type="button" title="Reschedule" onClick={() => setRescheduling(appointment)}>
                          <SafeIcon icon={FiEdit3} />
                        </button>
                        <button type="button" title="Cancel" onClick={() => changeStatus(appointment.id, 'cancelled')}>
                          <SafeIcon icon={FiXCircle} />
                        </button>
                        <button type="button" title="Completed" onClick={() => changeStatus(appointment.id, 'completed')}>
                          <SafeIcon icon={FiCheckCircle} />
                        </button>
                        <button type="button" title="No show" onClick={() => changeStatus(appointment.id, 'no_show')}>
                          <SafeIcon icon={FiUserX} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rescheduling && (
        <div className="patient-modal-backdrop" role="presentation">
          <form className="patient-modal" onSubmit={submitReschedule}>
            <div className="patient-modal__heading">
              <div>
                <span className="patient-eyebrow">Move booking #{rescheduling.booking_id}</span>
                <h2>Reschedule appointment</h2>
              </div>
              <button type="button" onClick={() => setRescheduling(null)} aria-label="Close reschedule dialog">
                ×
              </button>
            </div>

            <p>Choose a future date and an available time slot configured for this appointment.</p>

            <label>
              New date
              <input
                name="booking_date"
                type="date"
                min={dateKey(new Date())}
                defaultValue={rescheduling.booking_date}
                required
              />
            </label>

            <label>
              New time
              <input
                name="booking_time"
                type="text"
                defaultValue={rescheduling.booking_time}
                placeholder="Example: 10:30 AM"
                required
              />
            </label>

            <div className="patient-modal__actions">
              <button type="button" className="patient-button patient-button--muted" onClick={() => setRescheduling(null)}>
                Keep current time
              </button>
              <button type="submit" className="patient-button patient-button--primary">
                <SafeIcon icon={FiRefreshCw} /> Reschedule
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

export default ManagePatientAppointments;