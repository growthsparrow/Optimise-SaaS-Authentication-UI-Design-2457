import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  buildClientAppointmentAnalytics,
  listClientsAppointments,
  rescheduleClientAppointment,
  updateClientAppointmentStatus
} from '../services/clientsAppointmentsService';
import './ClientsAppointmentsDashboard.css';

const {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFilter,
  FiMapPin,
  FiRefreshCw,
  FiUser,
  FiUserX,
  FiXCircle
} = FiIcons;

const statuses = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show'
};

function toDateKey(value) {
  return value.toISOString().slice(0, 10);
}

function getDateFilter(value, startValue, endValue) {
  if (value === 'all') return null;
  if (value === 'custom') return { start: startValue, end: endValue };

  const start = new Date();
  const end = new Date();

  if (value === 'tomorrow') {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  if (value === 'week') end.setDate(end.getDate() + 7);
  if (value === 'month') end.setMonth(end.getMonth() + 1);

  return { start: toDateKey(start), end: toDateKey(end) };
}

function dateLabel(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function Stat({ label, value, tone }) {
  return (
    <div className={`clients-stat clients-stat--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ClientsAppointmentsDashboard() {
  const [items, setItems] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rescheduling, setRescheduling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listClientsAppointments()
      .then(setItems)
      .catch((reason) => setError(reason.message || 'Unable to load client appointments.'))
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(
    () => [...new Set(items.map((item) => item.appointmentType))],
    [items]
  );

  const filtered = useMemo(() => {
    const dates = getDateFilter(dateRange, from, to);

    return items.filter((item) => {
      const matchesDate = !dates
        || (item.booking_date >= dates.start && item.booking_date <= dates.end);
      const matchesStatus = status === 'all' || item.displayStatus === status;
      const matchesType = type === 'all' || item.appointmentType === type;
      return matchesDate && matchesStatus && matchesType;
    });
  }, [items, dateRange, status, type, from, to]);

  const analytics = useMemo(
    () => buildClientAppointmentAnalytics(filtered),
    [filtered]
  );

  async function changeStatus(id, nextStatus) {
    try {
      setError('');
      const updated = await updateClientAppointmentStatus(id, nextStatus);
      setItems((current) => current.map((item) => item.id === id ? updated : item));
    } catch (reason) {
      setError(reason.message || 'Unable to update the appointment.');
    }
  }

  async function submitReschedule(event) {
    event.preventDefault();

    try {
      const form = new FormData(event.currentTarget);
      const updated = await rescheduleClientAppointment(
        rescheduling.id,
        form.get('date'),
        form.get('time')
      );

      setItems((current) => current.map((item) => (
        item.id === rescheduling.id ? { ...item, ...updated } : item
      )));
      setRescheduling(null);
    } catch (reason) {
      setError(reason.message || 'Unable to reschedule the appointment.');
    }
  }

  function exportExcel() {
    const rows = filtered.map((item) => [
      item.booking_id,
      item.clientName,
      item.appointmentType,
      item.booking_date,
      item.booking_time,
      item.locationName,
      statuses[item.displayStatus]
    ]);

    const csv = [
      ['Booking ID', 'Booked By', 'Appointment Type', 'Date', 'Time', 'Location', 'Status'],
      ...rows
    ].map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'application/vnd.ms-excel' }));
    link.download = 'clients-appointments.xls';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="clients-appointments-dashboard">
      <header className="clients-dashboard-header">
        <div>
          <span className="clients-eyebrow">Client booking workspace</span>
          <h1>Manage client appointments</h1>
          <p>Appointments booked by clients through your public booking page.</p>
        </div>
        <div className="clients-header-actions">
          <button type="button" onClick={() => window.print()}>
            <SafeIcon icon={FiDownload} /> Export PDF
          </button>
          <button type="button" className="clients-primary-button" onClick={exportExcel}>
            <SafeIcon icon={FiDownload} /> Export Excel
          </button>
        </div>
      </header>

      <section className="clients-stat-grid">
        <Stat label="Total shown" value={analytics.total} tone="blue" />
        <Stat label="Confirmed" value={analytics.confirmed} tone="amber" />
        <Stat label="Completed" value={analytics.completed} tone="green" />
        <Stat label="Rescheduled" value={analytics.rescheduled} tone="purple" />
      </section>

      <section className="clients-analytics-card">
        <div className="clients-card-heading">
          <div>
            <span className="clients-eyebrow">Filtered performance</span>
            <h2>Appointment analytics</h2>
          </div>
          <strong>
            {analytics.total
              ? Math.round((analytics.completed / analytics.total) * 100)
              : 0}% completed
          </strong>
        </div>

        {['confirmed', 'completed', 'rescheduled', 'cancelled', 'no_show'].map((key) => (
          <div className="clients-chart-row" key={key}>
            <span>{statuses[key]}</span>
            <div><i style={{ width: `${analytics.total ? Math.max(5, analytics[key] / analytics.total * 100) : 5}%` }} /></div>
            <b>{analytics[key]}</b>
          </div>
        ))}
      </section>

      <section className="clients-table-card">
        <div className="clients-card-heading">
          <div>
            <span className="clients-eyebrow">Live booking register</span>
            <h2>Clients appointments</h2>
          </div>
          <strong>{filtered.length} shown</strong>
        </div>

        <div className="clients-filters">
          <span><SafeIcon icon={FiFilter} /> Filter by</span>
          <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="custom">Custom dates</option>
          </select>

          {dateRange === 'custom' && (
            <>
              <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </>
          )}

          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">All appointment types</option>
            {types.map((item) => <option value={item} key={item}>{item}</option>)}
          </select>

          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(statuses).map(([key, label]) => (
              <option value={key} key={key}>{label}</option>
            ))}
          </select>
        </div>

        {error && <div className="clients-error">{error}</div>}

        {loading ? (
          <div className="clients-empty"><SafeIcon icon={FiRefreshCw} /> Loading client appointments…</div>
        ) : !filtered.length ? (
          <div className="clients-empty">
            <SafeIcon icon={FiCalendar} />
            <strong>No client appointments found</strong>
            <span>Bookings made through the public page will appear here.</span>
          </div>
        ) : (
          <div className="clients-table-scroll">
            <table className="clients-table">
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Booked by</th>
                  <th>Appointment type</th>
                  <th>Date and time</th>
                  <th>Location / meeting link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td><b className="clients-booking-id">#{item.booking_id}</b></td>
                    <td>
                      <div className="clients-person">
                        <span><SafeIcon icon={FiUser} /></span>
                        <div><b>{item.clientName}</b><small>{item.phone_number || item.email || 'Contact not provided'}</small></div>
                      </div>
                    </td>
                    <td><b>{item.appointmentType}</b><small>{item.professionalName}</small></td>
                    <td><b>{dateLabel(item.booking_date)}</b><small><SafeIcon icon={FiClock} /> {item.booking_time || 'Time pending'}</small></td>
                    <td>
                      <div className="clients-location"><SafeIcon icon={FiMapPin} /> {item.locationName}</div>
                      {item.meetingLink && <a href={item.meetingLink} target="_blank" rel="noreferrer">Open meeting link</a>}
                    </td>
                    <td>
                      <span className={`clients-status clients-status--${item.displayStatus}`}>{statuses[item.displayStatus]}</span>
                      <div className="clients-row-actions">
                        <button type="button" title="Confirm" onClick={() => changeStatus(item.id, 'confirmed')}><SafeIcon icon={FiCheckCircle} /></button>
                        <button type="button" title="Reschedule" onClick={() => setRescheduling(item)}><SafeIcon icon={FiEdit3} /></button>
                        <button type="button" title="Cancel" onClick={() => changeStatus(item.id, 'cancelled')}><SafeIcon icon={FiXCircle} /></button>
                        <button type="button" title="Completed" onClick={() => changeStatus(item.id, 'completed')}><SafeIcon icon={FiCheckCircle} /></button>
                        <button type="button" title="No show" onClick={() => changeStatus(item.id, 'no_show')}><SafeIcon icon={FiUserX} /></button>
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
        <div className="clients-modal-backdrop">
          <form className="clients-modal" onSubmit={submitReschedule}>
            <div className="clients-card-heading">
              <div><span className="clients-eyebrow">#{rescheduling.booking_id}</span><h2>Reschedule client appointment</h2></div>
              <button type="button" onClick={() => setRescheduling(null)}>×</button>
            </div>
            <p>Choose a future date and configured available time.</p>
            <label>New date<input name="date" type="date" min={toDateKey(new Date())} defaultValue={rescheduling.booking_date} required /></label>
            <label>New time<input name="time" type="text" defaultValue={rescheduling.booking_time} required /></label>
            <button type="submit" className="clients-primary-button"><SafeIcon icon={FiRefreshCw} /> Reschedule</button>
          </form>
        </div>
      )}
    </main>
  );
}

export default ClientsAppointmentsDashboard;