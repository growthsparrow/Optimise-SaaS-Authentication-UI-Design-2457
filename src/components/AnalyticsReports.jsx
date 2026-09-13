import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  ChartPanel,
  HorizontalBars,
  OutcomeDonut,
  TrendChart
} from './AnalyticsChart';
import { listDashboardBookings } from '../services/dashboardService';
import {
  buildTrend,
  countRows,
  formatCurrency,
  getAnalyticsMetrics,
  getDateLimit,
  sumRows
} from '../utils/analyticsUtils';
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
  FiPieChart,
  FiTrendingUp,
  FiUser,
  FiUsers,
  FiXCircle
} = FiIcons;

const reportPeriods = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All appointments' }
];

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

    return bookings.filter(
      (booking) => !limit || booking.booking_date >= limit
    );
  }, [bookings, period]);

  const metrics = useMemo(
    () => getAnalyticsMetrics(reportBookings),
    [reportBookings]
  );

  const doctorRows = useMemo(
    () => countRows(reportBookings, (booking) => booking.doctor?.doctor_name),
    [reportBookings]
  );

  const locationRows = useMemo(
    () => countRows(reportBookings, (booking) => booking.location?.location_name),
    [reportBookings]
  );

  const consultationRows = useMemo(
    () =>
      countRows(
        reportBookings,
        (booking) => booking.consultation?.consultation_name
      ),
    [reportBookings]
  );

  const patientRows = useMemo(
    () => countRows(reportBookings, (booking) => booking.patient_name),
    [reportBookings]
  );

  const revenueRows = useMemo(
    () =>
      sumRows(
        reportBookings.filter((booking) => booking.status === 'visited'),
        (booking) => booking.consultation?.consultation_name,
        (booking) => booking.consultation?.consultation_fees_inr
      ),
    [reportBookings]
  );

  const trendPoints = useMemo(
    () => buildTrend(reportBookings, period),
    [reportBookings, period]
  );

  if (loading) {
    return (
      <section className="analytics-reports analytics-reports--loading">
        <div className="dashboard-loader" aria-label="Loading analytics" />
        <span>Preparing detailed analytics…</span>
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
            Explore performance across doctors, locations, consultations and
            patients with live appointment data.
          </p>
        </div>

        <label className="analytics-period">
          <span>Report period</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
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
          label="Appointments"
          value={metrics.total}
          detail="Bookings in selected period"
        />
        <AnalyticsCard
          icon={FiUsers}
          label="Unique patients"
          value={metrics.uniquePatients}
          detail="Distinct patient records"
        />
        <AnalyticsCard
          icon={FiCheckCircle}
          label="Completed visits"
          value={metrics.completed}
          detail="Appointments marked visited"
        />
        <AnalyticsCard
          icon={FiTrendingUp}
          label="Collected value"
          value={formatCurrency(metrics.revenue)}
          detail="Completed consultation value"
          currencyValue
        />
        <AnalyticsCard
          icon={FiActivity}
          label="Average patient age"
          value={metrics.averageAge ? `${metrics.averageAge} yrs` : '—'}
          detail={`${metrics.noShowRate}% no-show rate`}
        />
      </div>

      <div className="analytics-report-grid">
        <ChartPanel
          icon={FiTrendingUp}
          title="Appointment trend"
          description="Daily booking volume for the selected period"
          className="analytics-panel--wide"
        >
          <TrendChart points={trendPoints} />
        </ChartPanel>

        <ChartPanel
          icon={FiPieChart}
          title="Appointment outcomes"
          description="How appointments are progressing"
        >
          <OutcomeDonut
            metrics={{
              total: metrics.total,
              completed: metrics.completed,
              confirmed: metrics.confirmed,
              noShows: metrics.noShows,
              cancelled: metrics.cancelled
            }}
          />
        </ChartPanel>

        <ChartPanel
          icon={FiUser}
          title="Doctor analytics"
          description="Appointment workload by doctor"
        >
          <HorizontalBars rows={doctorRows} />
        </ChartPanel>

        <ChartPanel
          icon={FiMapPin}
          title="Location analytics"
          description="Demand across business locations"
        >
          <HorizontalBars rows={locationRows} />
        </ChartPanel>

        <ChartPanel
          icon={FiBarChart2}
          title="Consultation analytics"
          description="Most requested consultation services"
        >
          <HorizontalBars rows={consultationRows} />
        </ChartPanel>

        <ChartPanel
          icon={FiTrendingUp}
          title="Revenue by consultation"
          description="Collected value from completed visits"
        >
          <HorizontalBars
            rows={revenueRows}
            valueFormatter={formatCurrency}
          />
        </ChartPanel>

        <ChartPanel
          icon={FiUsers}
          title="Patient activity"
          description="Patients with the most appointments"
        >
          <HorizontalBars rows={patientRows} />
        </ChartPanel>

        <ChartPanel
          icon={FiClock}
          title="Operational summary"
          description="Key service and attendance indicators"
          className="analytics-status-panel"
        >
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
          <StatusRow
            icon={FiXCircle}
            label="Cancelled"
            value={metrics.cancelled}
            tone="danger"
          />
        </ChartPanel>
      </div>

      <footer className="analytics-reports__footer">
        <span>
          Export the filtered appointment data with doctor, patient,
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

function AnalyticsCard({
  icon,
  label,
  value,
  detail,
  currencyValue = false
}) {
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

function StatusRow({ icon, label, value, tone }) {
  return (
    <div className="analytics-status-row">
      <SafeIcon icon={icon} />
      <span>{label}</span>
      <strong className={`analytics-status-row--${tone}`}>{value}</strong>
    </div>
  );
}

export default AnalyticsReports;