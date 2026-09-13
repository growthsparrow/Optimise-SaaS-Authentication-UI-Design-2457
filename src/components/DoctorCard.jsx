import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiCalendar,
  FiClock,
  FiEdit2,
  FiMail,
  FiMoreHorizontal,
  FiPhone,
  FiPower,
  FiTrash2
} = FiIcons;

function DoctorCard({
  doctor,
  onEdit,
  onVacation,
  onArchive,
  onToggleBooking
}) {
  const isAvailable = doctor.is_available_for_booking !== false;
  const initials = doctor.doctor_name
    .split(' ')
    .map((name) => name[0])
    .join('')
    .slice(0, 2);

  return (
    <article
      className={`doctor-card ${
        !isAvailable ? 'doctor-card--disabled' : ''
      }`}
    >
      <div className="doctor-card__accent" />

      <div className="doctor-card__visual">
        <div className="doctor-avatar">
          {doctor.photo_url ? (
            <img
              src={doctor.photo_url}
              alt={`${doctor.doctor_name} profile`}
            />
          ) : (
            initials
          )}
        </div>

        <div className="doctor-card__identity">
          <span className="doctor-card__role">Medical professional</span>
          <h3>{doctor.doctor_name}</h3>
          <p>{doctor.speciality}</p>
        </div>

        <button
          className="doctor-more"
          aria-label={`More actions for ${doctor.doctor_name}`}
          type="button"
        >
          <SafeIcon icon={FiMoreHorizontal} />
        </button>
      </div>

      <div className="doctor-card__status-row">
        <span
          className={`doctor-status-badge ${
            isAvailable
              ? 'doctor-status-badge--enabled'
              : 'doctor-status-badge--disabled'
          }`}
        >
          <span className="doctor-status-dot" />
          {isAvailable ? 'Available for booking' : 'Booking disabled'}
        </span>
      </div>

      <div className="doctor-card__details">
        <div className="doctor-detail">
          <SafeIcon icon={FiMail} />
          <span>{doctor.email_id}</span>
        </div>
        <div className="doctor-detail">
          <SafeIcon icon={FiPhone} />
          <span>{doctor.phone_number}</span>
        </div>
      </div>

      <div className="doctor-card__summary">
        <div>
          <SafeIcon icon={FiCalendar} />
          <span>
            <strong>{doctor.available_days.length}</strong>
            working days
          </span>
        </div>
        <div>
          <SafeIcon icon={FiClock} />
          <span>
            <strong>{doctor.consultation_duration} min</strong>
            consultation
          </span>
        </div>
        <div>
          <span className="doctor-card__currency">₹</span>
          <span>
            <strong>
              {Number(doctor.consultation_charges_inr).toLocaleString('en-IN')}
            </strong>
            consultation fee
          </span>
        </div>
      </div>

      <div className="doctor-card__actions">
        <button type="button" onClick={() => onVacation(doctor)}>
          <SafeIcon icon={FiCalendar} />
          Vacation
        </button>
        <button type="button" onClick={() => onEdit(doctor)}>
          <SafeIcon icon={FiEdit2} />
          Edit profile
        </button>
        <button
          type="button"
          className={`doctor-toggle-action ${
            isAvailable
              ? 'doctor-toggle-action--disable'
              : 'doctor-toggle-action--enable'
          }`}
          onClick={() => onToggleBooking(doctor)}
          aria-label={
            isAvailable
              ? 'Disable doctor bookings'
              : 'Enable doctor bookings'
          }
          title={isAvailable ? 'Disable bookings' : 'Enable bookings'}
        >
          <SafeIcon icon={FiPower} />
        </button>
        <button
          type="button"
          className="doctor-danger-action"
          onClick={() => onArchive(doctor)}
          aria-label="Archive doctor"
        >
          <SafeIcon icon={FiTrash2} />
        </button>
      </div>
    </article>
  );
}

export default DoctorCard;