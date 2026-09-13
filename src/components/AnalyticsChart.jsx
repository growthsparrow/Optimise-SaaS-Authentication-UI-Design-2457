import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiActivity, FiBarChart2, FiCalendar, FiMapPin, FiTrendingUp, FiUser } = FiIcons;

export function ChartPanel({ icon, title, description, children, className = '' }) {
  return (
    <section className={`analytics-panel ${className}`}>
      <div className="analytics-panel__heading">
        <SafeIcon icon={icon} />
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function HorizontalBars({ rows, valueFormatter = (value) => value }) {
  const maximum = rows.reduce(
    (largest, row) => Math.max(largest, Number(row.value) || 0),
    0
  ) || 1;

  if (!rows.length) {
    return <p className="analytics-empty">No data for this period.</p>;
  }

  return (
    <div className="analytics-bars">
      {rows.slice(0, 8).map((row) => (
        <div className="analytics-bar-row" key={row.label}>
          <div className="analytics-bar-row__label">
            <span>{row.label}</span>
            <strong>{valueFormatter(row.value)}</strong>
          </div>
          <div className="analytics-bar">
            <span
              style={{
                width: `${Math.max((Number(row.value) / maximum) * 100, 3)}%`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ points }) {
  if (!points.length) {
    return <p className="analytics-empty">No appointment trend data available.</p>;
  }

  const maximum = Math.max(...points.map((point) => point.value), 1);
  const width = 700;
  const height = 210;
  const horizontalStep = points.length > 1
    ? width / (points.length - 1)
    : width;

  const coordinates = points.map((point, index) => {
    const x = points.length > 1 ? index * horizontalStep : width / 2;
    const y = height - 24 - (point.value / maximum) * (height - 55);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="analytics-trend">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Appointment trend chart">
        <defs>
          <linearGradient id="analyticsTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#13b8b7" stopOpacity=".28" />
            <stop offset="100%" stopColor="#13b8b7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((line) => (
          <line
            key={line}
            x1="0"
            x2={width}
            y1={35 + line * 45}
            y2={35 + line * 45}
            className="analytics-trend__grid"
          />
        ))}
        <polyline
          points={`0,${height - 24} ${coordinates} ${width},${height - 24}`}
          className="analytics-trend__area"
        />
        <polyline points={coordinates} className="analytics-trend__line" />
        {points.map((point, index) => {
          const [x, y] = coordinates.split(' ')[index].split(',');
          return (
            <circle
              key={`${point.label}-${index}`}
              cx={x}
              cy={y}
              r="4"
              className="analytics-trend__point"
            />
          );
        })}
      </svg>
      <div className="analytics-trend__labels">
        {points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}

export function OutcomeDonut({ metrics }) {
  const total = metrics.completed + metrics.confirmed + metrics.noShows + metrics.cancelled;
  const safeTotal = total || 1;
  const completed = (metrics.completed / safeTotal) * 100;
  const confirmed = (metrics.confirmed / safeTotal) * 100;
  const noShows = (metrics.noShows / safeTotal) * 100;

  return (
    <div className="analytics-donut-layout">
      <div
        className="analytics-donut"
        style={{
          background: `conic-gradient(
            #168764 0 ${completed}%,
            #079baa ${completed}% ${completed + confirmed}%,
            #d6a546 ${completed + confirmed}% ${completed + confirmed + noShows}%,
            #c97979 ${completed + confirmed + noShows}% 100%
          )`
        }}
      >
        <span>
          <strong>{metrics.total}</strong>
          <small>appointments</small>
        </span>
      </div>
      <div className="analytics-legend">
        <LegendItem color="success" label="Completed" value={metrics.completed} />
        <LegendItem color="info" label="Confirmed" value={metrics.confirmed} />
        <LegendItem color="warning" label="No-shows" value={metrics.noShows} />
        <LegendItem color="danger" label="Cancelled" value={metrics.cancelled} />
      </div>
    </div>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <div className="analytics-legend__item">
      <span className={`analytics-legend__dot analytics-legend__dot--${color}`} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export const analyticsIcons = {
  activity: FiActivity,
  bar: FiBarChart2,
  calendar: FiCalendar,
  location: FiMapPin,
  trend: FiTrendingUp,
  user: FiUser
};