import React, {useCallback, useEffect, useMemo, useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AppointmentActions from './AppointmentActions';
import PatientBookingPopup from './PatientBookingPopup';
import {
  exportAppointmentsToExcel,
  exportAppointmentsToPdf
} from '../utils/appointmentExport';
import {
  getDashboardMetrics,
  listDashboardBookings,
  subscribeToDashboardBookings,
  unsubscribeFromDashboardBookings
} from '../services/dashboardService';
import './AppointmentOverview.css';

const {
  FiActivity,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiUserCheck,
  FiX
} = FiIcons;

const periodOptions = [
  {value: 'this-week', label: 'This week'},
  {value: 'next-week', label: 'Next week'},
  {value: 'this-month', label: 'This month'},
  {value: 'custom', label: 'Custom date or period'}
];

const customDateOptions = [
  {value: 'single', label: 'Specific date'},
  {value: 'range', label: 'Date range'}
];

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Date unavailable';
  }

  return new Date(`${dateValue}T12:00:00`).toLocaleDateString(
    'en-US',
    {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'}
  );
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getPeriodRange(
  period,
  customDateMode,
  customStartDate,
  customEndDate
) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (period === 'custom') {
    if (customDateMode === 'single') {
      return customStartDate
        ? {start: customStartDate, end: customStartDate}
        : {start: '', end: ''};
    }

    if (!customStartDate || !customEndDate) {
      return {start: '', end: ''};
    }

    return customStartDate <= customEndDate
      ? {start: customStartDate, end: customEndDate}
      : {start: customEndDate, end: customStartDate};
  }

  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + mondayOffset);

  if (period === 'this-week') {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      start: dateKey(weekStart),
      end: dateKey(weekEnd)
    };
  }

  if (period === 'next-week') {
    const nextStart = new Date(weekStart);
    nextStart.setDate(weekStart.getDate() + 7);

    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextStart.getDate() + 6);

    return {
      start: dateKey(nextStart),
      end: dateKey(nextEnd)
    };
  }

  return {
    start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
    end: dateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0))
  };
}

function AppointmentOverview() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [period, setPeriod] = useState('this-week');
  const [customDateMode, setCustomDateMode] = useState('single');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [consultationFilter, setConsultationFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');

  const loadBookings = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      setBookings(await listDashboardBookings());
      setNotice('');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();

    const channel = subscribeToDashboardBookings(() => loadBookings());

    return () => unsubscribeFromDashboardBookings(channel);
  }, [loadBookings]);

  const metrics = useMemo(() => getDashboardMetrics(bookings), [bookings]);

  const filterOptions = useMemo(() => ({
    consultations: [...new Map(
      bookings
        .filter((booking) => booking.consultation?.id)
        .map((booking) => [
          booking.consultation.id,
          booking.consultation.consultation_name
        ])
    ).entries()],
    locations: [...new Map(
      bookings
        .filter((booking) => booking.location?.id)
        .map((booking) => [
          booking.location.id,
          booking.location.location_name
        ])
    ).entries()],
    doctors: [...new Map(
      bookings
        .filter((booking) => booking.doctor?.id)
        .map((booking) => [
          booking.doctor.id,
          booking.doctor.doctor_name
        ])
    ).entries()]
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();
    const range = getPeriodRange(
      period,
      customDateMode,
      customStartDate,
      customEndDate
    );

    return bookings.filter((booking) => {
      const matchesDate = Boolean(
        range.start &&
        range.end &&
        booking.booking_date >= range.start &&
        booking.booking_date <= range.end
      );

      const matchesSearch = !query ||
        booking.booking_id?.toLowerCase().includes(query) ||
        booking.patient_name?.toLowerCase().includes(query) ||
        booking.doctor?.doctor_name?.toLowerCase().includes(query);

      const matchesConsultation = !consultationFilter ||
        booking.consultation_id === consultationFilter;

      const matchesLocation = !locationFilter ||
        booking.location_id === locationFilter;

      const matchesDoctor = !doctorFilter ||
        booking.doctor_id === doctorFilter;

      return (
        matchesDate &&
        matchesSearch &&
        matchesConsultation &&
        matchesLocation &&
        matchesDoctor
      );
    });
  }, [
    bookings,
    consultationFilter,
    customDateMode,
    customEndDate,
    customStartDate,
    doctorFilter,
    locationFilter,
    period,
    search
  ]);

  const updatePeriod = (value) => {
    setPeriod(value);

    if (value === 'custom') {
      setCustomDateMode('single');
    }
  };

  const clearFilters = () => {
    setPeriod('this-week');
    setCustomDateMode('single');
    setCustomStartDate('');
    setCustomEndDate('');
    setConsultationFilter('');
    setLocationFilter('');
    setDoctorFilter('');
    setSearch('');
  };

  if (loading) {
    return (
      <div className="appointment-overview__loading">
        Loading live appointments…
      </div>
    );
  }

  return (
    <section className="appointment-overview">
      <div className="dashboard-toolbar">
        <div>
          <h2>Appointments Overview</h2>
          <span className="dashboard-date">
            Live schedule · {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </span>
        </div>

        <button
          className="dashboard-primary"
          type="button"
          onClick={() => loadBookings(true)}
          disabled={refreshing}
        >
          <SafeIcon icon={FiRefreshCw} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="appointment-overview__live">
        <SafeIcon icon={FiActivity} />
        <span>
          <strong>Live updates enabled</strong>
          {' '}Booking status changes appear automatically.
        </span>
      </div>

      {notice && (
        <p className="appointments-notice" role="status">
          {notice}
        </p>
      )}

      <section className="dashboard-stats">
        <MetricCard
          icon={FiCalendar}
          label="Today"
          value={metrics.todayCount}
          detail="Scheduled today"
        />
        <MetricCard
          icon={FiClock}
          label="Upcoming"
          value={metrics.upcomingCount}
          detail="Next 30 days"
        />
        <MetricCard
          icon={FiUserCheck}
          label="Visited"
          value={metrics.visitedCount}
          detail="Completed visits"
        />
        <MetricCard
          icon={FiDollarSign}
          label="Projected revenue"
          value={`₹${metrics.revenue.toLocaleString('en-IN')}`}
          detail={`${metrics.noShowCount} no-show`}
        />
      </section>

      <section className="dashboard-card appointments-directory">
        <div className="dashboard-card__heading appointments-directory__heading">
          <div>
            <h3>All appointments</h3>
            <p>
              Appointments are filtered to this week by default. Custom filters
              also include past appointments.
            </p>
          </div>
          <span className="appointment-count">{filteredBookings.length}</span>
        </div>

        <div className="appointments-filter-panel">
          <div className="appointments-filter-panel__heading">
            <div>
              <span className="appointments-filter-panel__eyebrow">
                Appointment filters
              </span>
              <strong>Refine your schedule</strong>
            </div>

            <button
              className="appointments-clear-filters"
              type="button"
              onClick={clearFilters}
            >
              <SafeIcon icon={FiX} />
              Reset
            </button>
          </div>

          <div className="appointments-filter-grid">
            <label>
              <span>Period</span>
              <select
                value={period}
                onChange={(event) => updatePeriod(event.target.value)}
              >
                {periodOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {period === 'custom' && (
              <label>
                <span>Custom filter</span>
                <select
                  value={customDateMode}
                  onChange={(event) => setCustomDateMode(event.target.value)}
                >
                  {customDateOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {period === 'custom' && (
              <label>
                <span>
                  {customDateMode === 'single'
                    ? 'Choose date'
                    : 'Start date'}
                </span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(event) => setCustomStartDate(event.target.value)}
                  aria-label={
                    customDateMode === 'single'
                      ? 'Choose appointment date'
                      : 'Choose appointment range start date'
                  }
                />
              </label>
            )}

            {period === 'custom' && customDateMode === 'range' && (
              <label>
                <span>End date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(event) => setCustomEndDate(event.target.value)}
                  aria-label="Choose appointment range end date"
                />
              </label>
            )}

            <FilterSelect
              label="Consultation type"
              value={consultationFilter}
              onChange={setConsultationFilter}
              placeholder="All consultation types"
              options={filterOptions.consultations}
            />

            <FilterSelect
              label="Location"
              value={locationFilter}
              onChange={setLocationFilter}
              placeholder="All locations"
              options={filterOptions.locations}
            />

            <FilterSelect
              label="Doctor"
              value={doctorFilter}
              onChange={setDoctorFilter}
              placeholder="All doctors"
              options={filterOptions.doctors}
            />
          </div>

          <div className="appointments-filter-panel__footer">
            <span>
              Showing <strong>{filteredBookings.length}</strong> of{' '}
              <strong>{bookings.length}</strong> appointments
            </span>

            <div className="appointments-export-actions">
              <button
                type="button"
                onClick={() => exportAppointmentsToExcel(filteredBookings)}
                disabled={!filteredBookings.length}
              >
                <SafeIcon icon={FiDownload} />
                Export Excel
              </button>

              <button
                type="button"
                onClick={() => exportAppointmentsToPdf(filteredBookings)}
                disabled={!filteredBookings.length}
              >
                <SafeIcon icon={FiFileText} />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        <div className="appointments-list-toolbar">
          <label className="appointments-search">
            <SafeIcon icon={FiSearch} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search booking ID, patient or doctor"
              aria-label="Search appointments"
            />
          </label>

          <span className="appointments-list-toolbar__hint">
            {bookings.length} total bookings
          </span>
        </div>

        {filteredBookings.length ? (
          <div className="appointments-list" role="table">
            <div className="appointments-list__header" role="row">
              <span>Booking</span>
              <span>Patient</span>
              <span>Date and time</span>
              <span>Doctor</span>
              <span>Actions</span>
            </div>

            {filteredBookings.map((booking) => (
              <AppointmentListRow
                key={booking.id}
                booking={booking}
                onPatientClick={() => setSelectedBooking(booking)}
                onChanged={() => loadBookings()}
                setNotice={setNotice}
              />
            ))}
          </div>
        ) : (
          <EmptyAppointments text="No appointments match the selected filters." />
        )}
      </section>

      <PatientBookingPopup
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  placeholder,
  options
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map(([id, name]) => (
          <option value={id} key={id}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({icon, label, value, detail}) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <SafeIcon icon={icon} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AppointmentListRow({
  booking,
  onPatientClick,
  onChanged,
  setNotice
}) {
  const statusLabel = booking.status?.replace('_', ' ') || 'unknown';

  return (
    <div className="appointments-list__row" role="row">
      <div className="appointment-list__booking">
        <strong>{booking.booking_id || '—'}</strong>
        <span className={`appointment-status appointment-status--${booking.status}`}>
          {statusLabel}
        </span>
      </div>

      <button
        className="appointment-list__patient"
        type="button"
        onClick={onPatientClick}
      >
        <span className="appointment-avatar">
          {(booking.patient_name || 'P').slice(0, 1).toUpperCase()}
        </span>
        <span>{booking.patient_name || 'Unnamed patient'}</span>
      </button>

      <div className="appointment-list__schedule">
        <strong>{formatDate(booking.booking_date)}</strong>
        <span>
          <SafeIcon icon={FiClock} />
          {booking.booking_time || 'Time unavailable'}
        </span>
      </div>

      <div className="appointment-list__doctor">
        <SafeIcon icon={FiUser} />
        <span>{booking.doctor?.doctor_name || 'Not assigned'}</span>
      </div>

      <AppointmentActions
        booking={booking}
        onChanged={onChanged}
        setNotice={setNotice}
      />
    </div>
  );
}

function EmptyAppointments({text}) {
  return (
    <div className="appointments-empty">
      <SafeIcon icon={FiUser} />
      <span>{text}</span>
    </div>
  );
}

export default AppointmentOverview;