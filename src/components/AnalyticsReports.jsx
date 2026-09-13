import React, {useEffect, useMemo, useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {listDashboardBookings} from '../services/dashboardService';
import {
  exportAppointmentsToExcel,
  exportAppointmentsToPdf
} from '../utils/appointmentExport';
import './AnalyticsReports.css';

const {
  FiActivity,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiFileText,
  FiMapPin,
  FiTrendingUp,
  FiUser,
  FiXCircle
} = FiIcons;

const reportPeriods = [
  {value: '30', label: 'Last 30 days'},
  {value: '90', label: 'Last 90 days'},
  {value: 'all', label: 'All appointments'}
];

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getDateLimit(period) {
  if (period === 'all') {
    return '';
  }

  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Number(period));

  return dateKey(date);
}

function currency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function countBy(bookings, getLabel) {
  const counts = new Map();

  bookings.forEach((booking) => {
    const label = getLabel(booking) || 'Not assigned';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function AnalyticsReports() {
  const [bookings, setBookings] = useState([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    listDashboardBookings()
      .then(setBookings)
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, []);

  const reportBookings = useMemo(() => {
    const limit = getDateLimit(period);

    return bookings.filter((booking) => (
      !limit || booking.booking_date >= limit
    ));
  }, [bookings, period]);

  const metrics = useMemo(() => {
    const completed = reportBookings.filter(
      (booking) => booking.status === 'visited'
    );
    const confirmed = reportBookings.filter(
      (booking) => ['confirmed', 'rescheduled'].includes(booking.status)
    );
    const noShows = reportBookings.filter(
      (booking) => booking.status === 'no_show'
    );
    const revenue = completed.reduce(
      (total, booking) => total + Number(
        booking.consultation?.consultation_fees_inr || 0
      ),
      0
    );

    return {
      total: reportBookings.length,
      confirmed: confirmed.length,
      completed: completed.length,
      noShows: noShows.length,
      revenue
    };
  }, [reportBookings]);

  const consultationRows = useMemo(
    () => countBy(
      reportBookings,
      (booking) => booking.consultation?.consultation_name
    ),
    [reportBookings]
  );

  const doctorRows = useMemo(
    () => countBy(
      reportBookings,
      (booking) => booking.doctor?.doctor_name
    ),
    [reportBookings]
  );

  const locationRows = useMemo(
    () => countBy(
      reportBookings,
      (booking) => booking.location?.location_name
    ),
    [reportBookings]
  );

  if (loading) {
    return (
      <section className="analytics-reports analytics-reports--loading">
        <div className="dashboard-loader" aria-label="Loading analytics" />
        <span>Preparing analytics and reports…</span>
      </section>
    );
  }

  return (
    <section className="analytics-reports">
      <header className="analytics-reports__header">
        <div>
          <span className="dashboard-eyebrow">Workspace intelligence</span>
          <h2>Analytics and Reports</h2>
          <p>
            Understand appointment performance, patient flow and consultation
            demand across your healthcare workspace.
          </p>
        </div>

        <label className="analytics-period">
          <span>Report period</span>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            {reportPeriods.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      {notice && (
        <p className="analytics-notice" role="status">
          {notice}
        </p>
      )}

      <div className="analytics-kpis">
        <AnalyticsCard
          icon={FiCalendar}
          label="Total appointments"
          value={metrics.total}
          detail="Appointments in this report"
        />
        <AnalyticsCard
          icon={FiClock}
          label="Confirmed and rescheduled"
          value={metrics.confirmed}
          detail="Upcoming or active bookings"
        />
        <AnalyticsCard
          icon={FiCheckCircle}
          label="Completed visits"
          value={metrics.completed}
          detail="Appointments marked visited"
        />
        <AnalyticsCard
          icon={FiTrendingUp}
          label="Collected consultation value"
          value={currency(metrics.revenue)}
          detail="Based on completed visits"
          currencyValue
        />
      </div>

      <section className="analytics-report-grid">
        <ReportSection
          icon={FiBarChart2}
          title="Consultation performance"
          description="Most requested consultation types"
          rows={consultationRows}
        />
        <ReportSection
          icon={FiUser}
          title="Doctor workload"
          description="Appointments by doctor"
          rows={doctorRows}
        />
        <ReportSection
          icon={FiMapPin}
          title="Location demand"
          description="Appointments by location"
          rows={locationRows}
        />
        <section className="analytics-panel analytics-status-panel">
          <PanelHeading
            icon={FiActivity}
            title="Appointment outcomes"
            description="Current status distribution"
          />
          <StatusRow
            icon={FiCheckCircle}
            label="Completed visits"
            value={metrics.completed}
            tone="success"
          />
          <StatusRow
            icon={FiClock}
            label="Confirmed or rescheduled"
            value={metrics.confirmed}
            tone="info"
          />
          <StatusRow
            icon={FiXCircle}
            label="No-shows"
            value={metrics.noShows}
            tone="warning"
          />
        </section>
      </section>

      <footer className="analytics-reports__footer">
        <span>
          Export the appointments included in this report with patient, doctor,
          consultation and location details.
        </span>
        <div>
          <button
            type="button"
            onClick={() => exportAppointmentsToExcel(reportBookings)}
            disabled={!reportBookings.length}
          >
            <SafeIcon icon={FiDownload} />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => exportAppointmentsToPdf(reportBookings)}
            disabled={!reportBookings.length}
          >
            <SafeIcon icon={FiFileText} />
            Export PDF
          </button>
        </div>
      </footer>
    </section>
  );
}

function AnalyticsCard({icon, label, value, detail, currencyValue}) {
  return (
    <article className="analytics-kpi">
      <div className="analytics-kpi__label">
        <SafeIcon icon={icon} />
        <span>{label}</span>
      </div>
      <strong className={currencyValue ? 'analytics-kpi__currency' : ''}>
        {value}
      </strong>
      <small>{detail}</small>
    </article>
  );
}

function PanelHeading({icon, title, description}) {
  return (
    <div className="analytics-panel__heading">
      <SafeIcon icon={icon} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

function ReportSection({icon, title, description, rows}) {
  const maximum = rows[0]?.[1] || 1;

  return (
    <section className="analytics-panel">
      <PanelHeading icon={icon} title={title} description={description} />
      {rows.length ? (
        <div className="analytics-bars">
          {rows.slice(0, 6).map(([label, value]) => (
            <div className="analytics-bar-row" key={label}>
              <div className="analytics-bar-row__label">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
              <div className="analytics-bar">
                <span style={{width: `${(value / maximum) * 100}%`}} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="analytics-empty">No appointment data for this period.</p>
      )}
    </section>
  );
}

function StatusRow({icon, label, value, tone}) {
  return (
    <div className="analytics-status-row">
      <SafeIcon icon={icon} />
      <span>{label}</span>
      <strong className={`analytics-status-row--${tone}`}>{value}</strong>
    </div>
  );
}

export default AnalyticsReports;