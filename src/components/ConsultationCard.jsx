import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiEdit2,
  FiInfo,
  FiMapPin,
  FiPower,
  FiTrash2,
  FiUsers
} = FiIcons;

function ConsultationCard({
  consultation,
  doctors,
  locations,
  onEdit,
  onArchive,
  onToggleBooking
}) {
  const doctorIds = consultation.doctor_ids || [];
  const locationIds = consultation.location_ids || [];

  const mappedDoctors = doctors.filter((doctor) =>
    doctorIds.includes(doctor.id)
  );

  const mappedLocations = locations.filter((location) =>
    locationIds.includes(location.id)
  );

  const isAvailable = consultation.is_available_for_booking !== false;

  return (
    <article
      className={`consultation-card ${
        !isAvailable ? 'consultation-card--disabled' : ''
      }`}
    >
      <div className="consultation-card__accent" />

      <div className="consultation-card__header">
        <div>
          <span className="consultation-card__eyebrow">
            Appointment service
          </span>
          <h3>{consultation.consultation_name}</h3>
        </div>

        <strong className="consultation-fee">
          ₹{Number(consultation.consultation_fees_inr).toLocaleString('en-IN')}
        </strong>
      </div>

      <div className="consultation-card__status-row">
        <span
          className={`consultation-status-badge ${
            isAvailable
              ? 'consultation-status-badge--enabled'
              : 'consultation-status-badge--disabled'
          }`}
        >
          <span className="consultation-status-dot" />
          {isAvailable ? 'Available for booking' : 'Booking disabled'}
        </span>
      </div>

      <div className="consultation-card__mapping">
        <div>
          <SafeIcon icon={FiUsers} />
          <span>
            {mappedDoctors.length
              ? mappedDoctors.map((doctor) => doctor.doctor_name).join(', ')
              : 'No doctors mapped'}
          </span>
        </div>

        <div>
          <SafeIcon icon={FiMapPin} />
          <span>
            {mappedLocations.length
              ? mappedLocations
                  .map((location) => location.location_name)
                  .join(', ')
              : 'No locations mapped'}
          </span>
        </div>
      </div>

      {consultation.important_information && (
        <div className="consultation-card__information">
          <SafeIcon icon={FiInfo} />
          <p>{consultation.important_information}</p>
        </div>
      )}

      <div className="consultation-card__actions">
        <button type="button" onClick={() => onEdit(consultation)}>
          <SafeIcon icon={FiEdit2} />
          Edit
        </button>

        <button
          type="button"
          className={`consultation-toggle-action ${
            isAvailable
              ? 'consultation-toggle-action--disable'
              : 'consultation-toggle-action--enable'
          }`}
          onClick={() => onToggleBooking(consultation)}
          aria-label={
            isAvailable
              ? `Disable bookings for ${consultation.consultation_name}`
              : `Enable bookings for ${consultation.consultation_name}`
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
          className="consultation-delete-button"
          onClick={() => onArchive(consultation)}
          aria-label={`Archive ${consultation.consultation_name}`}
        >
          <SafeIcon icon={FiTrash2} />
        </button>
      </div>
    </article>
  );
}

export default ConsultationCard;