import React, { useCallback, useEffect, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import DoctorCard from './DoctorCard';
import DoctorForm from './DoctorForm';
import VacationPanel from './VacationPanel';
import {
  archiveDoctor,
  listDoctors,
  saveDoctor,
  setDoctorBookingStatus
} from '../services/doctorService';
import './Doctors.css';
import './DoctorsEnhancements.css';

const { FiPlus, FiSearch, FiUsers } = FiIcons;

function DoctorsManager() {
  const [doctors, setDoctors] = useState([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDoctors = useCallback(async () => {
    try {
      setDoctors(await listDoctors());
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const save = async (values, doctor) => {
    try {
      const saved = await saveDoctor(values, doctor);

      setDoctors((current) =>
        doctor
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
      );

      setModal(null);
      setNotice(
        doctor
          ? 'Doctor details updated.'
          : 'Doctor added to your workspace.'
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const toggleBooking = async (doctor) => {
    const nextStatus = doctor.is_available_for_booking === false;

    try {
      const updated = await setDoctorBookingStatus(doctor.id, nextStatus);

      setDoctors((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );

      setNotice(
        nextStatus
          ? `${doctor.doctor_name} is now available for bookings.`
          : `${doctor.doctor_name} is disabled and unavailable for new bookings.`
      );
    } catch (error) {
      setNotice(`Could not update booking status: ${error.message}`);
    }
  };

  const archive = async (doctor) => {
    try {
      await archiveDoctor(doctor.id);
      setDoctors((current) =>
        current.filter((item) => item.id !== doctor.id)
      );
      setNotice(`${doctor.doctor_name} was archived.`);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const visibleDoctors = doctors.filter((doctor) =>
    `${doctor.doctor_name} ${doctor.speciality}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <section className="doctors-manager">
      <div className="doctors-toolbar">
        <div>
          <span className="dashboard-eyebrow">Your clinical team</span>
          <h2>Doctors</h2>
          <p>Manage profiles, availability and time away in one place.</p>
        </div>

        <button
          className="dashboard-primary"
          onClick={() => setModal({ type: 'form' })}
        >
          <SafeIcon icon={FiPlus} />
          Add doctor
        </button>
      </div>

      {notice && (
        <div className="doctors-notice" role="status">
          {notice}
        </div>
      )}

      <div className="doctors-filter">
        <SafeIcon icon={FiSearch} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search doctors or specialities"
        />
      </div>

      {loading ? (
        <div className="doctors-loading">Loading your doctors…</div>
      ) : visibleDoctors.length ? (
        <div className="doctor-grid">
          {visibleDoctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              onEdit={(item) => setModal({ type: 'form', doctor: item })}
              onVacation={(item) =>
                setModal({ type: 'vacation', doctor: item })
              }
              onArchive={archive}
              onToggleBooking={toggleBooking}
            />
          ))}
        </div>
      ) : (
        <div className="doctors-empty">
          <SafeIcon icon={FiUsers} />
          <h3>No doctors yet</h3>
          <p>
            Add your first doctor to start configuring appointment
            availability.
          </p>
          <button
            className="dashboard-primary"
            onClick={() => setModal({ type: 'form' })}
          >
            <SafeIcon icon={FiPlus} />
            Add first doctor
          </button>
        </div>
      )}

      {modal?.type === 'form' && (
        <DoctorForm
          doctor={modal.doctor}
          onClose={() => setModal(null)}
          onSaved={save}
          setNotice={setNotice}
        />
      )}

      {modal?.type === 'vacation' && (
        <VacationPanel
          doctor={modal.doctor}
          onClose={() => setModal(null)}
          setNotice={setNotice}
        />
      )}
    </section>
  );
}

export default DoctorsManager;