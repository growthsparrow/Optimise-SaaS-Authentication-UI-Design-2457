import { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  cancelCalendarAppointment,
  listCalendarAppointments,
  rescheduleCalendarAppointment
} from '../services/calendarService';
import { exportAppointmentsToExcel, exportAppointmentsToPdf } from '../utils/appointmentExport';
import './MyCalendar.css';

const { FiCalendar, FiClock, FiRefreshCw, FiUser } = FiIcons;
const {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiExternalLink,
  FiFilter,
  FiMapPin,
  FiSearch,
  FiTrendingUp,
  FiUsers,
  FiVideo,
  FiX
} = FiIcons;

const statusLabels = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  visited: 'Visited',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show'
};

function formatDate(value) {
  if (!value) {
    return 'No date selected';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  }).format(date);
}

function escapeCsvValue(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function exportCsv(appointments) {
  const headers = ['Client', 'Booking ID', 'Date', 'Time', 'Appointment', 'Professional', 'Status'];
  const rows = appointments.map((appointment) => [
    appointment.patient_name,
    appointment.booking_id,
    appointment.booking_date,
    appointment.booking_time,
    appointment.booking_type_name,
    appointment.professional_name,
    statusLabels[appointment.status] || appointment.status
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = `optimise-calendar-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value || 0);
}

function MyCalendar() {
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);

  async function loadAppointments() {
    setLoading(true);
    setError('');

    try {
      const rows = await listCalendarAppointments();
      setAppointments(rows);
      setSelectedDate((current) => current || rows[0]?.booking_date || '');
    } catch (loadError) {
      setAppointments([]);
      setSelectedDate('');
      setError(loadError.message || 'Appointments could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAppointments();
  }, []);

  const groupedDates = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.booking_date).filter(Boolean))],
    [appointments]
  );

  const selectedAppointments = appointments.filter(
    (appointment) => appointment.booking_date === selectedDate
  );

  const analytics = useMemo(() => {
    const activeAppointments = appointments.filter(
      (appointment) => appointment.status !== 'cancelled'
    );

    return {
      total: appointments.length,
      active: activeAppointments.length,
      confirmed: appointments.filter((appointment) => appointment.status === 'confirmed').length,
      completed: appointments.filter(
        (appointment) => appointment.status === 'completed' || appointment.status === 'visited'
      ).length,
      cancelled: appointments.filter((appointment) => appointment.status === 'cancelled').length,
      rescheduled: appointments.filter((appointment) => appointment.status === 'rescheduled').length,
      noShow: appointments.filter((appointment) => appointment.status === 'no_show').length
    };
  }, [appointments]);

  const bookingTypes = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.booking_type_name).filter(Boolean))],
    [appointments]
  );

  const filteredAppointments = useMemo(() => appointments.filter((appointment) => {
    const searchableText = [
      appointment.patient_name,
      appointment.email,
      appointment.phone_number,
      appointment.booking_id,
      appointment.booking_type_name,
      appointment.professional_name
    ].join(' ').toLowerCase();

    return (
      (!search || searchableText.includes(search.toLowerCase()))
      && (statusFilter === 'all' || appointment.status === statusFilter)
      && (typeFilter === 'all' || appointment.booking_type_name === typeFilter)
      && (!fromDate || appointment.booking_date >= fromDate)
      && (!toDate || appointment.booking_date <= toDate)
    );
  }), [appointments, fromDate, search, statusFilter, toDate, typeFilter]);

  const filteredDates = useMemo(
    () => [...new Set(filteredAppointments.map((appointment) => appointment.booking_date).filter(Boolean))],
    [filteredAppointments]
  );

  const visibleDate = filteredDates.includes(selectedDate)
    ? selectedDate
    : filteredDates[0] || '';

  const visibleAppointments = filteredAppointments.filter(
    (appointment) => appointment.booking_date === visibleDate
  );

  const filteredAnalytics = useMemo(() => {
    const active = filteredAppointments.filter((appointment) => appointment.status !== 'cancelled');
    const completed = filteredAppointments.filter(
      (appointment) => appointment.status === 'completed' || appointment.status === 'visited'
    );

    return {
      total: filteredAppointments.length,
      active: active.length,
      completed: completed.length,
      cancelled: filteredAppointments.filter((appointment) => appointment.status === 'cancelled').length,
      revenue: active.reduce((sum, appointment) => sum + Number(appointment.consultation_fee || 0), 0),
      completionRate: active.length ? Math.round((completed.length / active.length) * 100) : 0
    };
  }, [filteredAppointments]);

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearch('');
    setFromDate('');
    setToDate('');
  };

  const startReschedule = (appointment) => {
    setSelectedAppointment(null);
    setEditingAppointment(appointment);
    setEditDate(appointment.booking_date || '');
    setEditTime(appointment.booking_time || '');
    setError('');
  };

  const saveReschedule = async (event) => {
    event.preventDefault();

    if (!editDate || !editTime) {
      setError('Choose both a new date and time.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await rescheduleCalendarAppointment(
        editingAppointment,
        editDate,
        editTime
      );

      setAppointments((current) => current.map((appointment) => (
        appointment.id === updated.id ? updated : appointment
      )));
      setEditingAppointment(null);
      setNotice(`Booking ${updated.booking_id} was rescheduled successfully.`);
    } catch (actionError) {
      setError(actionError.message || 'The appointment could not be rescheduled.');
    } finally {
      setSaving(false);
    }
  };

  const cancelAppointment = async (appointment) => {
    if (!window.confirm(`Cancel booking ${appointment.booking_id}? The booking record will be preserved.`)) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const updated = await cancelCalendarAppointment(appointment);

      setAppointments((current) => current.map((item) => (
        item.id === updated.id ? updated : item
      )));
      setSelectedAppointment(null);
      setNotice(`Booking ${updated.booking_id} was cancelled.`);
    } catch (actionError) {
      setError(actionError.message || 'The appointment could not be cancelled.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="my-calendar">
      <div className="my-calendar__hero">
        <div>
          <span className="my-calendar__eyebrow">Workspace calendar</span>
          <h1>My Calendar</h1>
          <p>Keep every client appointment organised in one calm, focused view.</p>
          <div className="my-calendar__hero-meta">
            <span><SafeIcon icon={FiActivity} /> Live appointment analytics</span>
            <span><SafeIcon icon={FiUsers} /> {appointments.length} total records</span>
          </div>
        </div>
        <div className="my-calendar__hero-actions">
          <button className="my-calendar__refresh" type="button" onClick={loadAppointments} disabled={loading}>
            <SafeIcon icon={FiRefreshCw} />
            {loading ? 'Loading' : 'Refresh'}
          </button>
          <div className="my-calendar__export">
            <button
              className="my-calendar__export-button"
              type="button"
              onClick={() => setShowExport((current) => !current)}
              disabled={!filteredAppointments.length}
            >
              <SafeIcon icon={FiDownload} />
              Export
            </button>
            {showExport && (
              <div className="my-calendar__export-menu">
                <button type="button" onClick={() => exportCsv(filteredAppointments)}>
                  <SafeIcon icon={FiDownload} /> Download CSV
                </button>
                <button type="button" onClick={() => exportAppointmentsToExcel(filteredAppointments)}>
                  <SafeIcon icon={FiDownload} /> Export Excel
                </button>
                <button type="button" onClick={() => exportAppointmentsToPdf(filteredAppointments)}>
                  <SafeIcon icon={FiDownload} /> Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="my-calendar__toolbar">
        <div className="my-calendar__search">
          <SafeIcon icon={FiSearch} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search clients, booking IDs, or services"
            aria-label="Search appointments"
          />
        </div>
        <button
          className={`my-calendar__filter-button ${showFilters ? 'my-calendar__filter-button--active' : ''}`}
          type="button"
          onClick={() => setShowFilters((current) => !current)}
        >
          <SafeIcon icon={FiFilter} />
          Filters
          {(statusFilter !== 'all' || typeFilter !== 'all' || fromDate || toDate) && <span>Active</span>}
        </button>
      </div>

      {showFilters && (
        <div className="my-calendar__filters">
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No show</option>
            </select>
          </label>
          <label>
            Booking type
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All booking types</option>
              {bookingTypes.map((type) => <option value={type} key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            From date
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label>
            To date
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <button className="my-calendar__clear-filters" type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      )}

      {notice && <div className="my-calendar__notice" role="status">{notice}</div>}

      {error && (
        <div className="my-calendar__error" role="alert">
          <SafeIcon icon={FiAlertCircle} />
          <span>{error}</span>
          <button className="my-calendar__refresh" type="button" onClick={loadAppointments}>
            Try again
          </button>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
            <SafeIcon icon={FiX} />
          </button>
        </div>
      )}

      {loading ? (
        <div className="my-calendar__empty" role="status" aria-live="polite">
          <SafeIcon icon={FiRefreshCw} />
          <h2>Loading your calendar</h2>
          <p>We are securely loading your workspace appointments.</p>
        </div>
      ) : appointments.length === 0 && !error ? (
        <div className="my-calendar__empty">
          <SafeIcon icon={FiCalendar} />
          <h2>No appointments yet</h2>
          <p>Client bookings will appear here as soon as they are created.</p>
        </div>
      ) : appointments.length > 0 ? (
        <>
          <div
            className="my-calendar__layout"
            style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: '22px' }}
          >
            <div className="my-calendar__appointments">
              <span className="my-calendar__eyebrow">All bookings</span>
              <h2>{analytics.total}</h2>
              <p>Total client appointments</p>
            </div>
            <div className="my-calendar__appointments">
              <span className="my-calendar__eyebrow">Active pipeline</span>
              <h2>{analytics.active}</h2>
              <p>Non-cancelled bookings</p>
            </div>
            <div className="my-calendar__appointments">
              <span className="my-calendar__eyebrow">Completed</span>
              <h2>{analytics.completed}</h2>
              <p>Visited or completed clients</p>
            </div>
            <div className="my-calendar__appointments">
              <span className="my-calendar__eyebrow">Follow-up signals</span>
              <h2>{analytics.rescheduled + analytics.noShow}</h2>
              <p>{analytics.rescheduled} rescheduled · {analytics.noShow} no show</p>
            </div>
          </div>

          <div className="my-calendar__analytics">
            <div className="my-calendar__analytics-card">
              <div className="my-calendar__analytics-heading">
                <div>
                  <span className="my-calendar__eyebrow">Filtered insights</span>
                  <h2>Appointment performance</h2>
                </div>
                <SafeIcon icon={FiTrendingUp} />
              </div>
              {[
                ['Active appointments', filteredAnalytics.active, 'active'],
                ['Completed', filteredAnalytics.completed, 'completed'],
                ['Cancelled', filteredAnalytics.cancelled, 'cancelled']
              ].map(([label, value, tone]) => (
                <div className="my-calendar__analytics-row" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <i className={`my-calendar__analytics-bar my-calendar__analytics-bar--${tone}`}>
                    <em style={{ width: `${filteredAnalytics.total ? Math.max((value / filteredAnalytics.total) * 100, value ? 5 : 0) : 0}%` }} />
                  </i>
                </div>
              ))}
            </div>
            <div className="my-calendar__analytics-card my-calendar__analytics-card--highlight">
              <SafeIcon icon={FiCheckCircle} />
              <span className="my-calendar__eyebrow">Filtered completion rate</span>
              <strong>{filteredAnalytics.completionRate}%</strong>
              <p>{formatCurrency(filteredAnalytics.revenue)} projected from active appointments.</p>
            </div>
          </div>

          <div className="my-calendar__filter-summary">
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </div>

          {filteredAppointments.length ? (
            <div className="my-calendar__layout">
              <div className="my-calendar__dates">
                {filteredDates.map((date) => (
                  <button
                    className={visibleDate === date ? 'my-calendar__date my-calendar__date--active' : 'my-calendar__date'}
                    type="button"
                    key={date}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span>{formatDate(date)}</span>
                    <strong>{filteredAppointments.filter((item) => item.booking_date === date).length}</strong>
                  </button>
                ))}
              </div>

              <div className="my-calendar__appointments">
                <div className="my-calendar__section-heading">
                  <div>
                    <span className="my-calendar__eyebrow">Selected day</span>
                    <h2>{formatDate(visibleDate)}</h2>
                  </div>
                  <span className="my-calendar__count">{visibleAppointments.length} bookings</span>
                </div>

                {visibleAppointments.map((appointment) => (
                  <article className="appointment-card" key={appointment.id}>
                    <div className="appointment-card__time">
                      <SafeIcon icon={FiClock} />
                      <strong>{appointment.booking_time || 'Time pending'}</strong>
                    </div>
                    <div className="appointment-card__details">
                      <div className="appointment-card__title">
                        <h3>{appointment.patient_name || 'Client'}</h3>
                        <span className={`appointment-card__status appointment-card__status--${appointment.status}`}>
                          {statusLabels[appointment.status] || appointment.status}
                        </span>
                      </div>
                      <p><SafeIcon icon={FiUser} /> {appointment.email || appointment.phone_number || 'Contact details unavailable'}</p>
                      <div className="appointment-card__facts">
                        <span><b>Booking ID</b> {appointment.booking_id}</span>
                        <span><b>Booking type</b> {appointment.booking_type_name}</span>
                        <span><b>Date and time</b> {formatDate(appointment.booking_date)} · {appointment.booking_time || 'Pending'}</span>
                        <span><b>Location</b> <SafeIcon icon={appointment.is_online ? FiVideo : FiMapPin} /> {appointment.location_name || appointment.address || 'Not provided'}</span>
                        <span><b>Professional</b> {appointment.professional_name || 'Not assigned'}</span>
                      </div>
                    </div>
                    <button className="appointment-card__manage" type="button" onClick={() => setSelectedAppointment(appointment)}>
                      Manage booking
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="my-calendar__empty my-calendar__empty--filtered">
              <SafeIcon icon={FiSearch} />
              <h2>No appointments match your filters</h2>
              <p>Clear the filters to see all client appointments.</p>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
        </>
      ) : null}

      {selectedAppointment && (
        <div className="my-calendar__modal-backdrop" role="presentation" onClick={() => setSelectedAppointment(null)}>
          <div className="my-calendar__modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="my-calendar__modal-close" type="button" onClick={() => setSelectedAppointment(null)} aria-label="Close booking details">
              <SafeIcon icon={FiX} />
            </button>
            <span className="my-calendar__eyebrow">Booking management</span>
            <h2>{selectedAppointment.patient_name || 'Client'}</h2>
            <p className="my-calendar__modal-subtitle">{selectedAppointment.booking_type_name}</p>
            <dl className="my-calendar__details-list">
              <div><dt>Booking ID</dt><dd>{selectedAppointment.booking_id}</dd></div>
              <div><dt>Date and time</dt><dd>{formatDate(selectedAppointment.booking_date)} · {selectedAppointment.booking_time || 'Pending'}</dd></div>
              <div><dt>Location</dt><dd>{selectedAppointment.location_name || selectedAppointment.address || 'Not provided'}</dd></div>
              <div><dt>Professional</dt><dd>{selectedAppointment.professional_name || 'Not assigned'}</dd></div>
              <div><dt>Contact</dt><dd>{selectedAppointment.email || selectedAppointment.phone_number || 'Not provided'}</dd></div>
            </dl>
            {selectedAppointment.meeting_link && (
              <a className="my-calendar__meeting-link" href={selectedAppointment.meeting_link} target="_blank" rel="noreferrer">
                <SafeIcon icon={FiVideo} /> Open meeting link <SafeIcon icon={FiExternalLink} />
              </a>
            )}
            <div className="my-calendar__management-actions">
              <button
                type="button"
                onClick={() => startReschedule(selectedAppointment)}
                disabled={saving || ['cancelled', 'completed', 'visited', 'no_show'].includes(selectedAppointment.status)}
              >
                <SafeIcon icon={FiCalendar} /> Reschedule
              </button>
              <button
                className="my-calendar__management-cancel"
                type="button"
                onClick={() => cancelAppointment(selectedAppointment)}
                disabled={saving || ['cancelled', 'completed', 'visited', 'no_show'].includes(selectedAppointment.status)}
              >
                <SafeIcon icon={FiX} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAppointment && (
        <div className="my-calendar__modal-backdrop" role="presentation">
          <form className="my-calendar__modal" onSubmit={saveReschedule}>
            <button className="my-calendar__modal-close" type="button" onClick={() => setEditingAppointment(null)} aria-label="Close reschedule form">
              <SafeIcon icon={FiX} />
            </button>
            <span className="my-calendar__eyebrow">Booking management</span>
            <h2>Reschedule booking</h2>
            <p className="my-calendar__modal-subtitle">{editingAppointment.booking_id} · {editingAppointment.patient_name}</p>
            <label className="my-calendar__modal-field">
              New date
              <input
                type="date"
                value={editDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setEditDate(event.target.value)}
                required
              />
            </label>
            <label className="my-calendar__modal-field">
              New time
              <input
                type="text"
                value={editTime}
                onChange={(event) => setEditTime(event.target.value)}
                placeholder="10:00 AM"
                required
              />
            </label>
            <div className="my-calendar__management-actions">
              <button type="button" onClick={() => setEditingAppointment(null)}>Keep current time</button>
              <button className="my-calendar__management-save" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save reschedule'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default MyCalendar;