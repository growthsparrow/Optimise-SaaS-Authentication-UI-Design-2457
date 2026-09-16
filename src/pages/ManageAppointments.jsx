import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AppointmentAnalytics from '../components/manage-appointments/AppointmentAnalytics';
import AppointmentCard from '../components/manage-appointments/AppointmentCard';
import {
  listManagedAppointments,
  rescheduleAppointment,
  updateAppointmentStatus
} from '../services/manageAppointmentsService';
import './ManageAppointments.css';

const { FiCalendar, FiDownload, FiFilter, FiRefreshCw, FiUsers, FiX } = FiIcons;

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getDateRange(filter, customStart, customEnd) {
  const today = new Date();
  const todayKey = dateKey(today);

  if (filter === 'today') return [todayKey, todayKey];

  if (filter === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return [dateKey(tomorrow), dateKey(tomorrow)];
  }

  if (filter === 'week') {
    const end = new Date(today);
    end.setDate(today.getDate() + 7);
    return [todayKey, dateKey(end)];
  }

  if (filter === 'month') {
    const end = new Date(today);
    end.setMonth(today.getMonth() + 1);
    return [todayKey, dateKey(end)];
  }

  if (filter === 'custom') return [customStart, customEnd];

  return ['', ''];
}

function exportCsv(appointments) {
  const headers = [
    'Booking ID',
    'Client Name',
    'Appointment Type',
    'Date',
    'Time',
    'Location',
    'Status'
  ];

  const rows = appointments.map((item) => [
    item.booking_id,
    item.patient_name,
    item.appointmentType,
    item.booking_date,
    item.booking_time,
    item.locationName,
    item.displayStatus
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(','))
    .join('\n');

  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  link.download = `appointments-${dateKey(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function printAppointments() {
  window.print();
}

function RescheduleModal({ appointment, onClose, onSubmit }) {
  if (!appointment) return null;

  return (
    <div className="manage-modal-backdrop">
      <form className="manage-modal" onSubmit={onSubmit}>
        <div className="manage-modal__header">
          <div>
            <span className="manage-eyebrow">#{appointment.booking_id}</span>
            <h2>Reschedule appointment</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <SafeIcon icon={FiX} />
          </button>
        </div>
        <p>The selected date and time are checked against the configured availability.</p>

        <label>
          Future date
          <input
            name="booking_date"
            type="date"
            min={dateKey(new Date())}
            defaultValue={appointment.booking_date}
            required
          />
        </label>

        <label>
          Available time
          <input
            name="booking_time"
            type="text"
            defaultValue={appointment.booking_time}
            placeholder="For example, 10:30"
            required
          />
        </label>

        <button className="manage-primary-button" type="submit">
          <SafeIcon icon={FiRefreshCw} /> Save new schedule
        </button>
      </form>
    </div>
  );
}

function ManageAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [rescheduling, setRescheduling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  async function loadAppointments() {
    try {
      setLoading(true);
      setNotice('');
      setAppointments(await listManagedAppointments());
    } catch (error) {
      setNotice(error.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const appointmentTypes = useMemo(() => (
    [...new Set(appointments.map((item) => item.appointmentType))]
  ), [appointments]);

  const filteredAppointments = useMemo(() => {
    const [start, end] = getDateRange(dateFilter, customStart, customEnd);

    return appointments.filter((item) => {
      const matchesDate = !start
        || (item.booking_date >= start && (!end || item.booking_date <= end));
      const matchesStatus = statusFilter === 'all'
        || item.displayStatus === statusFilter;
      const matchesType = typeFilter === 'all'
        || item.appointmentType === typeFilter;

      return matchesDate && matchesStatus && matchesType;
    });
  }, [
    appointments,
    dateFilter,
    statusFilter,
    typeFilter,
    customStart,
    customEnd
  ]);

  async function changeStatus(id, status) {
    try {
      setNotice('');
      const updated = await updateAppointmentStatus(id, status);
      setAppointments((current) => current.map((item) => (
        item.id === id ? updated : item
      )));
    } catch (error) {
      setNotice(error.message || 'Unable to update appointment status.');
    }
  }

  async function submitReschedule(event) {
    event.preventDefault();

    try {
      const form = new FormData(event.currentTarget);
      const updated = await rescheduleAppointment(
        rescheduling.id,
        form.get('booking_date'),
        form.get('booking_time')
      );

      if (updated) {
        setAppointments((current) => current.map((item) => (
          item.id === rescheduling.id ? updated : item
        )));
      }

      setRescheduling(null);
      setNotice('Appointment rescheduled successfully.');
    } catch (error) {
      setNotice(error.message || 'The selected time is unavailable.');
    }
  }

  return (
    <main className="manage-appointments-page">
      <header className="manage-page-header">
        <div>
          <div className="manage-breadcrumb">
            <SafeIcon icon={FiCalendar} /> Workspace / Manage Appointments
          </div>
          <span className="manage-eyebrow">Client booking workspace</span>
          <h1>Manage Appointments</h1>
          <p>Manage every appointment booked through your public booking page.</p>
        </div>

        <div className="manage-page-header__summary">
          <SafeIcon icon={FiUsers} />
          <span>Bookings in view<strong>{filteredAppointments.length}</strong></span>
        </div>
      </header>

      <AppointmentAnalytics appointments={appointments} />

      <section className="manage-bookings-section">
        <div className="manage-section-heading">
          <div>
            <span className="manage-eyebrow">Appointment register</span>
            <h2>Client appointments</h2>
            <p>Confirm, reschedule, complete, or update appointment outcomes.</p>
          </div>

          <div className="manage-export-actions">
            <button type="button" onClick={() => exportCsv(filteredAppointments)}>
              <SafeIcon icon={FiDownload} /> Excel
            </button>
            <button type="button" onClick={printAppointments}>
              <SafeIcon icon={FiDownload} /> PDF
            </button>
            <button type="button" onClick={loadAppointments}>
              <SafeIcon icon={FiRefreshCw} /> Refresh
            </button>
          </div>
        </div>

        <div className="manage-filter-panel">
          <div className="manage-filter-label">
            <SafeIcon icon={FiFilter} /> Filter bookings
          </div>

          <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="custom">Custom dates</option>
          </select>

          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All appointment types</option>
            {appointmentTypes.map((type) => <option value={type} key={type}>{type}</option>)}
          </select>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
            <option value="no_show">No show</option>
          </select>

          {dateFilter === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
              <input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
            </>
          )}
        </div>

        {notice && <div className="manage-notice">{notice}</div>}

        {loading ? (
          <div className="manage-loading">
            <SafeIcon icon={FiRefreshCw} /> Loading client appointments…
          </div>
        ) : filteredAppointments.length ? (
          <div className="manage-appointments-list">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onStatusChange={changeStatus}
                onReschedule={setRescheduling}
              />
            ))}
          </div>
        ) : (
          <div className="manage-empty-state">
            <SafeIcon icon={FiCalendar} />
            <h3>No appointments match these filters</h3>
            <p>Try another date, status, or appointment type.</p>
          </div>
        )}
      </section>

      <RescheduleModal
        appointment={rescheduling}
        onClose={() => setRescheduling(null)}
        onSubmit={submitReschedule}
      />
    </main>
  );
}

export default ManageAppointments;