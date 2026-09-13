import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {FiCalendar, FiMail, FiMapPin, FiPhone, FiUser, FiX} = FiIcons;

function formatDate(dateValue) {
  if (!dateValue) {
    return 'Not provided';
  }

  return new Date(`${dateValue}T12:00:00`).toLocaleDateString(
    'en-US',
    {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'}
  );
}

function PatientBookingPopup({booking, onClose}) {
  if (!booking) {
    return null;
  }

  return (
    <div className="patient-popup-backdrop" role="presentation" onClick={onClose}>
      <section
        className="patient-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="patient-popup__header">
          <div>
            <span className="dashboard-eyebrow">Complete booking record</span>
            <h2 id="patient-popup-title">{booking.patient_name}</h2>
            <p>{booking.booking_id}</p>
          </div>
          <button
            className="patient-popup__close"
            type="button"
            onClick={onClose}
            aria-label="Close patient booking details"
          >
            <SafeIcon icon={FiX} />
          </button>
        </header>

        <div className="patient-popup__status">
          <span className={`appointment-status appointment-status--${booking.status}`}>
            {booking.status.replace('_', ' ')}
          </span>
          <span>Created {formatDate(booking.created_at?.slice(0, 10))}</span>
        </div>

        <div className="patient-popup__grid">
          <Detail icon={FiUser} label="Patient name">
            {booking.patient_name}
          </Detail>
          <Detail icon={FiUser} label="Patient profile">
            {booking.gender || 'Not provided'} · Age {booking.age || '—'}
          </Detail>
          <Detail icon={FiPhone} label="Phone">
            {booking.phone_number || 'Not provided'}
          </Detail>
          <Detail icon={FiMail} label="Email">
            {booking.email || 'Not provided'}
          </Detail>
          <Detail icon={FiCalendar} label="Appointment date">
            {formatDate(booking.booking_date)}
          </Detail>
          <Detail icon={FiCalendar} label="Appointment time">
            {booking.booking_time || 'Not provided'}
          </Detail>
          <Detail icon={FiUser} label="Doctor">
            {booking.doctor?.doctor_name || 'Not assigned'}
            {booking.doctor?.speciality ? ` · ${booking.doctor.speciality}` : ''}
          </Detail>
          <Detail icon={FiCalendar} label="Appointment type">
            {booking.consultation?.consultation_name || 'Not available'}
          </Detail>
          <Detail icon={FiMapPin} label="Location">
            {booking.location?.location_name || 'Not available'}
            {booking.location?.address ? ` · ${booking.location.address}` : ''}
          </Detail>
          <Detail icon={FiPhone} label="Location contact">
            {booking.location?.contact_number || 'Not provided'}
          </Detail>
          <Detail icon={FiCalendar} label="Fee">
            {booking.consultation?.consultation_fees_inr
              ? `₹${Number(
                booking.consultation.consultation_fees_inr
              ).toLocaleString('en-IN')}`
              : 'Not available'}
          </Detail>
          <Detail icon={FiMapPin} label="Address">
            {booking.location?.address || 'Not provided'}
          </Detail>
        </div>
      </section>
    </div>
  );
}

function Detail({icon, label, children}) {
  return (
    <div className="patient-popup__detail">
      <SafeIcon icon={icon} />
      <span>
        <small>{label}</small>
        <strong>{children}</strong>
      </span>
    </div>
  );
}

export default PatientBookingPopup;