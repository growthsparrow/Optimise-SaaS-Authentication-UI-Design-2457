import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import './AppointmentCard.css';

const {
  FiCalendar,
  FiCheck,
  FiClock,
  FiEdit3,
  FiExternalLink,
  FiMapPin,
  FiUser,
  FiX
} = FiIcons;

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No show'
};

function formatDate(value) {
  if (!value) return 'Date pending';

  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(value) {
  return value === 'Full day' ? value : value?.slice(0, 5) || 'Time pending';
}

function AppointmentCard({ appointment, onStatusChange, onReschedule }) {
  const canEdit = !['cancelled', 'completed', 'no_show'].includes(
    appointment.displayStatus
  );

  const appointmentType = appointment.appointmentType
    || appointment.consultation?.consultation_name
    || 'Appointment type unavailable';

  return (
    <article className="manage-appointment-card">
      <div className="manage-appointment-card__top">
        <div className="manage-client">
          <span className="manage-client__avatar">
            <SafeIcon icon={FiUser} />
          </span>
          <div className="manage-client__copy">
            <h3>{appointment.patient_name || 'Unnamed client'}</h3>
            <p>{appointment.email || appointment.phone_number || 'Contact unavailable'}</p>
          </div>
        </div>

        <div className="manage-appointment-reference">
          <span className={`manage-status manage-status--${appointment.displayStatus}`}>
            {STATUS_LABELS[appointment.displayStatus] || appointment.displayStatus}
          </span>
          <strong>#{appointment.booking_id}</strong>
        </div>
      </div>

      <div className="manage-appointment-details">
        <div>
          <span><SafeIcon icon={FiCalendar} /> Date</span>
          <strong>{formatDate(appointment.booking_date)}</strong>
        </div>
        <div>
          <span><SafeIcon icon={FiClock} /> Time</span>
          <strong>{formatTime(appointment.booking_time)}</strong>
        </div>
        <div className="manage-appointment-type">
          <span><SafeIcon icon={FiEdit3} /> Appointment type</span>
          <strong title={appointmentType}>{appointmentType}</strong>
          <small>{appointment.doctorName}</small>
        </div>
        <div>
          <span><SafeIcon icon={FiMapPin} /> Location</span>
          <strong>{appointment.locationName}</strong>
          <small>{appointment.address || 'Meeting link available on booking'}</small>
        </div>
      </div>

      <div className="manage-appointment-card__bottom">
        <span className="manage-appointment-fee">
          {appointment.fee
            ? `₹${appointment.fee.toLocaleString('en-IN')}`
            : 'Fee not specified'}
        </span>

        <div className="manage-appointment-actions">
          {appointment.mapLink && (
            <a href={appointment.mapLink} target="_blank" rel="noreferrer">
              <SafeIcon icon={FiMapPin} /> Map
            </a>
          )}

          {canEdit && (
            <>
              <button type="button" onClick={() => onStatusChange(appointment.id, 'confirmed')}>
                <SafeIcon icon={FiCheck} /> Confirm
              </button>
              <button type="button" onClick={() => onReschedule(appointment)}>
                <SafeIcon icon={FiEdit3} /> Reschedule
              </button>
              <button type="button" onClick={() => onStatusChange(appointment.id, 'completed')}>
                <SafeIcon icon={FiCheck} /> Completed
              </button>
              <button type="button" onClick={() => onStatusChange(appointment.id, 'no_show')}>
                <SafeIcon icon={FiX} /> No show
              </button>
              <button
                type="button"
                className="manage-action--danger"
                onClick={() => onStatusChange(appointment.id, 'cancelled')}
              >
                <SafeIcon icon={FiX} /> Cancel
              </button>
            </>
          )}

          {appointment.location?.meeting_invite_link && (
            <a
              href={appointment.location.meeting_invite_link}
              target="_blank"
              rel="noreferrer"
            >
              <SafeIcon icon={FiExternalLink} /> Join
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default AppointmentCard;