import React, {
  useCallback,
  useEffect,
  useState
} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import ConsultationCard from './ConsultationCard';
import ConsultationForm from './ConsultationForm';
import { listDoctors } from '../services/doctorService';
import { listLocations } from '../services/locationService';
import {
  archiveConsultation,
  listConsultations,
  saveConsultation,
  setConsultationBookingStatus
} from '../services/consultationService';
import './Consultations.css';

const { FiClipboard, FiPlus, FiSearch } = FiIcons;

function ConsultationsManager() {
  const [consultations, setConsultations] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [
        consultationRows,
        doctorRows,
        locationRows
      ] = await Promise.all([
        listConsultations(),
        listDoctors(),
        listLocations()
      ]);

      setConsultations(consultationRows);
      setDoctors(doctorRows);
      setLocations(locationRows);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = async (values, consultation) => {
    try {
      const saved = await saveConsultation(values, consultation);

      setConsultations((current) =>
        consultation
          ? current.map((item) =>
              item.id === saved.id ? saved : item
            )
          : [...current, saved]
      );

      setModal(null);
      setNotice(
        consultation
          ? 'Consultation details updated.'
          : 'Consultation added to your booking page.'
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const toggleBooking = async (consultation) => {
    const isCurrentlyAvailable =
      consultation.is_available_for_booking !== false;
    const nextStatus = !isCurrentlyAvailable;

    try {
      const updated = await setConsultationBookingStatus(
        consultation.id,
        nextStatus
      );

      setConsultations((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setNotice(
        nextStatus
          ? `${consultation.consultation_name} is now available for future bookings.`
          : `${consultation.consultation_name} is disabled and will not accept future bookings.`
      );
    } catch (error) {
      setNotice(
        `Could not update booking status: ${error.message}`
      );
    }
  };

  const archive = async (consultation) => {
    try {
      await archiveConsultation(consultation.id);

      setConsultations((current) =>
        current.filter((item) => item.id !== consultation.id)
      );

      setNotice(`${consultation.consultation_name} was archived.`);
    } catch (error) {
      setNotice(
        `Could not archive consultation: ${error.message}`
      );
    }
  };

  const visibleConsultations = consultations.filter((consultation) =>
    consultation.consultation_name
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <section className="consultations-manager">
      <div className="consultations-toolbar">
        <div>
          <span className="dashboard-eyebrow">
            Your booking catalogue
          </span>
          <h2>Consultations</h2>
          <p>
            Manage services, fees, doctors and locations for patient
            bookings.
          </p>
        </div>

        <button
          className="dashboard-primary"
          type="button"
          onClick={() => setModal({ type: 'form' })}
        >
          <SafeIcon icon={FiPlus} />
          Add consultation
        </button>
      </div>

      {notice && (
        <div className="consultations-notice" role="status">
          {notice}
        </div>
      )}

      <div className="consultations-filter">
        <SafeIcon icon={FiSearch} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search consultations"
        />
      </div>

      {loading ? (
        <div className="consultations-loading">
          Loading consultations…
        </div>
      ) : visibleConsultations.length ? (
        <div className="consultation-grid">
          {visibleConsultations.map((consultation) => (
            <ConsultationCard
              key={consultation.id}
              consultation={consultation}
              doctors={doctors}
              locations={locations}
              onEdit={(item) =>
                setModal({
                  type: 'form',
                  consultation: item
                })
              }
              onArchive={archive}
              onToggleBooking={toggleBooking}
            />
          ))}
        </div>
      ) : (
        <div className="consultations-empty">
          <SafeIcon icon={FiClipboard} />
          <h3>No consultations yet</h3>
          <p>
            Add a consultation to start building your patient booking
            options.
          </p>
          <button
            className="dashboard-primary"
            type="button"
            onClick={() => setModal({ type: 'form' })}
          >
            <SafeIcon icon={FiPlus} />
            Add first consultation
          </button>
        </div>
      )}

      {modal?.type === 'form' && (
        <ConsultationForm
          consultation={modal.consultation}
          doctors={doctors}
          locations={locations}
          onClose={() => setModal(null)}
          onSaved={save}
          setNotice={setNotice}
        />
      )}
    </section>
  );
}

export default ConsultationsManager;