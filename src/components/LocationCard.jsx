import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiClock,
  FiEdit2,
  FiExternalLink,
  FiMapPin,
  FiPhone,
  FiPower,
  FiTrash2
} = FiIcons;

function formatTime(value) {
  if (!value) return '';

  const [hour, minute] = value.split(':');
  const date = new Date(2000, 0, 1, Number(hour), Number(minute));

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

function LocationCard({
  location,
  onEdit,
  onArchive,
  onToggleBooking
}) {
  const isAvailable = location.is_available_for_booking !== false;

  return (
    <article
      className={`location-card ${
        !isAvailable ? 'location-card--disabled' : ''
      }`}
    >
      <div className="location-card__accent" />

      <div className="location-card__header">
        <div className="location-card__pin">
          <SafeIcon icon={FiMapPin} />
        </div>

        <div>
          <span className="location-card__eyebrow">
            Business location
          </span>
          <h3>{location.location_name}</h3>
        </div>
      </div>

      <div className="location-card__status-row">
        <span
          className={`location-status-badge ${
            isAvailable
              ? 'location-status-badge--enabled'
              : 'location-status-badge--disabled'
          }`}
        >
          <span className="location-status-dot" />
          {isAvailable
            ? 'Available for booking'
            : 'Booking disabled'}
        </span>
      </div>

      <div className="location-card__details">
        <div>
          <SafeIcon icon={FiMapPin} />
          <span>{location.address}</span>
        </div>

        <div>
          <SafeIcon icon={FiPhone} />
          <span>{location.contact_number}</span>
        </div>

        <div>
          <SafeIcon icon={FiClock} />
          <span>
            {formatTime(location.opens_at)} –{' '}
            {formatTime(location.closes_at)}
          </span>
        </div>
      </div>

      <div className="location-card__days">
        {location.business_days.map((day) => (
          <span key={day}>{day.slice(0, 3)}</span>
        ))}
      </div>

      <div className="location-card__actions">
        <a
          href={location.google_maps_link}
          target="_blank"
          rel="noreferrer"
          className="location-map-link"
        >
          <SafeIcon icon={FiExternalLink} />
          Open in Maps
        </a>

        <button type="button" onClick={() => onEdit(location)}>
          <SafeIcon icon={FiEdit2} />
          Edit
        </button>

        <button
          type="button"
          className={`location-toggle-action ${
            isAvailable
              ? 'location-toggle-action--disable'
              : 'location-toggle-action--enable'
          }`}
          onClick={() => onToggleBooking(location)}
          aria-label={
            isAvailable
              ? `Disable bookings at ${location.location_name}`
              : `Enable bookings at ${location.location_name}`
          }
          title={
            isAvailable
              ? 'Disable future bookings'
              : 'Enable future bookings'
          }
        >
          <SafeIcon icon={FiPower} />
        </button>

        <button
          type="button"
          className="location-delete-button"
          onClick={() => onArchive(location)}
          aria-label={`Archive ${location.location_name}`}
        >
          <SafeIcon icon={FiTrash2} />
        </button>
      </div>
    </article>
  );
}

export default LocationCard;