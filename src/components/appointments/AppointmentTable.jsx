import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiCalendar, FiCheck, FiEdit2, FiMapPin, FiSlash, FiUserX } = FiIcons;

function AppointmentTable({ appointments, onStatusChange, onReschedule }) {
  if (!appointments.length) {
    return <div className="appointments-empty">No appointments match these filters.</div>;
  }

  return (
    <div className="appointments-table-wrap">
      <table className="appointments-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Booked by</th>
            <th>Appointment type</th>
            <th>Date and time</th>
            <th>Location / meeting link</th>
            <th>Management</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td><strong className="booking-id">{appointment.booking_id}</strong></td>
              <td>
                <div className="client-cell">
                  <span className="client-avatar">{appointment.clientName.slice(0, 1).toUpperCase()}</span>
                  <span>{appointment.clientName}</span>
                </div>
              </td>
              <td>{appointment.appointmentType}</td>
              <td>
                <div className="date-cell">
                  <SafeIcon icon={FiCalendar} />
                  <span>{new Date(`${appointment.booking_date}T${appointment.booking_time || '00:00'}`).toLocaleString()}</span>
                </div>
              </td>
              <td>
                <div className="location-cell">
                  <SafeIcon icon={FiMapPin} />
                  {appointment.meetingLink
                    ? <a href={appointment.meetingLink} target="_blank" rel="noreferrer">Join meeting</a>
                    : appointment.location}
                </div>
              </td>
              <td>
                <div className="appointment-actions">
                  <button type="button" onClick={() => onStatusChange(appointment.id, 'completed')} title="Completed">
                    <SafeIcon icon={FiCheck} />
                  </button>
                  <button type="button" onClick={() => onReschedule(appointment)} title="Reschedule">
                    <SafeIcon icon={FiEdit2} />
                  </button>
                  <button type="button" onClick={() => onStatusChange(appointment.id, 'cancelled')} title="Cancel">
                    <SafeIcon icon={FiSlash} />
                  </button>
                  <button type="button" onClick={() => onStatusChange(appointment.id, 'no_show')} title="No show">
                    <SafeIcon icon={FiUserX} />
                  </button>
                </div>
                <span className={`appointment-status appointment-status--${appointment.status}`}>
                  {appointment.status.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AppointmentTable;