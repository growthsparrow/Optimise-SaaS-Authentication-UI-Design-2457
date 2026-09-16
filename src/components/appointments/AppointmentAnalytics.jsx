import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiActivity, FiCheckCircle, FiClock, FiTrendingUp } = FiIcons;

function Metric({ icon, label, value, tone }) {
  return (
    <div className={`appointment-metric appointment-metric--${tone}`}>
      <SafeIcon icon={icon} />
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function AppointmentAnalytics({ analytics }) {
  const completionRate = analytics.total
    ? Math.round((analytics.completed / analytics.total) * 100)
    : 0;

  return (
    <section className="appointment-analytics">
      <div className="appointment-section-heading">
        <div>
          <span className="eyebrow">Performance snapshot</span>
          <h2>Appointment analytics</h2>
        </div>
        <span className="analytics-rate">{completionRate}% completed</span>
      </div>

      <div className="appointment-metrics">
        <Metric icon={FiActivity} label="Total appointments" value={analytics.total} tone="blue" />
        <Metric icon={FiClock} label="Upcoming confirmed" value={analytics.confirmed} tone="amber" />
        <Metric icon={FiCheckCircle} label="Completed" value={analytics.completed} tone="green" />
        <Metric icon={FiTrendingUp} label="Rescheduled" value={analytics.rescheduled} tone="purple" />
      </div>

      <div className="analytics-bars" aria-label="Appointment status breakdown">
        {['confirmed', 'completed', 'rescheduled', 'cancelled', 'no_show'].map((key) => {
          const percentage = analytics.total
            ? Math.max(4, Math.round((analytics[key] / analytics.total) * 100))
            : 4;

          return (
            <div className="analytics-bar-row" key={key}>
              <span>{key.replace('_', ' ')}</span>
              <div><i style={{ width: `${percentage}%` }} /></div>
              <b>{analytics[key]}</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AppointmentAnalytics;