import React, { useMemo } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiActivity, FiCheckCircle, FiClock, FiUsers } = FiIcons;

function AnalyticsCard({ icon, label, value, helper, tone }) {
  return (
    <div className={`manage-analytics-card manage-analytics-card--${tone}`}>
      <div className="manage-analytics-card__icon">
        <SafeIcon icon={icon} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </div>
  );
}

function AppointmentAnalytics({ appointments }) {
  const analytics = useMemo(() => {
    const total = appointments.length;
    const completed = appointments.filter((item) => item.displayStatus === 'completed').length;
    const cancelled = appointments.filter((item) => item.displayStatus === 'cancelled').length;
    const active = appointments.filter((item) => (
      ['confirmed', 'rescheduled'].includes(item.displayStatus)
    )).length;

    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const cancellationRate = total ? Math.round((cancelled / total) * 100) : 0;

    const byType = appointments.reduce((result, item) => {
      result[item.appointmentType] = (result[item.appointmentType] || 0) + 1;
      return result;
    }, {});

    const typeRows = Object.entries(byType)
      .sort(([, first], [, second]) => second - first)
      .slice(0, 5);

    return {
      total,
      active,
      completionRate,
      cancellationRate,
      typeRows,
      peakType: typeRows[0]?.[0] || 'No data'
    };
  }, [appointments]);

  return (
    <section className="manage-analytics">
      <div className="manage-section-heading">
        <div>
          <span className="manage-eyebrow">Performance overview</span>
          <h2>Appointment analytics</h2>
          <p>Understand demand, outcomes, and your most popular appointment types.</p>
        </div>
        <SafeIcon icon={FiActivity} />
      </div>

      <div className="manage-analytics-grid">
        <AnalyticsCard
          icon={FiUsers}
          label="Total bookings"
          value={analytics.total}
          helper="All records"
          tone="blue"
        />
        <AnalyticsCard
          icon={FiClock}
          label="Active pipeline"
          value={analytics.active}
          helper="Confirmed or rescheduled"
          tone="purple"
        />
        <AnalyticsCard
          icon={FiCheckCircle}
          label="Completion rate"
          value={`${analytics.completionRate}%`}
          helper="Appointments completed"
          tone="green"
        />
        <AnalyticsCard
          icon={FiActivity}
          label="Cancellation rate"
          value={`${analytics.cancellationRate}%`}
          helper="Cancelled bookings"
          tone="orange"
        />
      </div>

      <div className="manage-analytics-panels">
        <div className="manage-chart-panel">
          <div className="manage-chart-panel__heading">
            <div>
              <span className="manage-eyebrow">Demand mix</span>
              <h3>Top appointment types</h3>
            </div>
            <strong>{analytics.peakType}</strong>
          </div>

          {analytics.typeRows.length ? (
            <div className="manage-bar-chart">
              {analytics.typeRows.map(([label, count]) => {
                const maximum = analytics.typeRows[0][1];
                const width = Math.max(12, Math.round((count / maximum) * 100));

                return (
                  <div className="manage-bar-row" key={label}>
                    <span title={label}>{label}</span>
                    <div className="manage-bar-track">
                      <i style={{ width: `${width}%` }} />
                    </div>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="manage-chart-empty">Analytics will appear after bookings arrive.</div>
          )}
        </div>

        <div className="manage-outcome-panel">
          <span className="manage-eyebrow">Outcome snapshot</span>
          <h3>Booking health</h3>
          <div className="manage-progress-ring" style={{ '--progress': `${analytics.completionRate * 3.6}deg` }}>
            <span>{analytics.completionRate}%<small>completed</small></span>
          </div>
          <p>Keep your active pipeline moving with timely confirmations and follow-ups.</p>
        </div>
      </div>
    </section>
  );
}

export default AppointmentAnalytics;