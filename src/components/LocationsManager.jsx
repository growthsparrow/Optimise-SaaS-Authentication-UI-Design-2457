import React, {
  useCallback,
  useEffect,
  useState
} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import LocationCard from './LocationCard';
import LocationForm from './LocationForm';
import {
  archiveLocation,
  listLocations,
  saveLocation,
  setLocationBookingStatus
} from '../services/locationService';
import './Locations.css';

const { FiMapPin, FiPlus, FiSearch } = FiIcons;

function LocationsManager() {
  const [locations, setLocations] = useState([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadLocations = useCallback(async () => {
    try {
      setLocations(await listLocations());
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  const save = async (values, location) => {
    try {
      const saved = await saveLocation(values, location);

      setLocations((current) =>
        location
          ? current.map((item) =>
              item.id === saved.id ? saved : item
            )
          : [...current, saved]
      );

      setModal(null);
      setNotice(
        location
          ? 'Location details updated.'
          : 'Location added to your workspace.'
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const toggleBooking = async (location) => {
    const isCurrentlyAvailable =
      location.is_available_for_booking !== false;
    const nextStatus = !isCurrentlyAvailable;

    try {
      const updated = await setLocationBookingStatus(
        location.id,
        nextStatus
      );

      setLocations((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setNotice(
        nextStatus
          ? `${location.location_name} is now available for future bookings.`
          : `${location.location_name} is disabled and will not accept future bookings.`
      );
    } catch (error) {
      setNotice(
        `Could not update booking status: ${error.message}`
      );
    }
  };

  const archive = async (location) => {
    try {
      await archiveLocation(location.id);

      setLocations((current) =>
        current.filter((item) => item.id !== location.id)
      );

      setNotice(`${location.location_name} was archived.`);
    } catch (error) {
      setNotice(
        `Could not archive location: ${error.message}`
      );
    }
  };

  const visibleLocations = locations.filter((location) =>
    `${location.location_name} ${location.address}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <section className="locations-manager">
      <div className="locations-toolbar">
        <div>
          <span className="dashboard-eyebrow">Your workspace</span>
          <h2>Locations</h2>
          <p>
            Manage the places where your customers can book
            appointments.
          </p>
        </div>

        <button
          className="dashboard-primary"
          type="button"
          onClick={() => setModal({ type: 'form' })}
        >
          <SafeIcon icon={FiPlus} />
          Add location
        </button>
      </div>

      {notice && (
        <div className="locations-notice" role="status">
          {notice}
        </div>
      )}

      <div className="locations-filter">
        <SafeIcon icon={FiSearch} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search locations or addresses"
        />
      </div>

      {loading ? (
        <div className="locations-loading">
          Loading your locations…
        </div>
      ) : visibleLocations.length ? (
        <div className="location-grid">
          {visibleLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onEdit={(item) =>
                setModal({ type: 'form', location: item })
              }
              onArchive={archive}
              onToggleBooking={toggleBooking}
            />
          ))}
        </div>
      ) : (
        <div className="locations-empty">
          <SafeIcon icon={FiMapPin} />
          <h3>No locations yet</h3>
          <p>
            Add a location to make it available for appointment
            bookings.
          </p>
          <button
            className="dashboard-primary"
            type="button"
            onClick={() => setModal({ type: 'form' })}
          >
            <SafeIcon icon={FiPlus} />
            Add first location
          </button>
        </div>
      )}

      {modal?.type === 'form' && (
        <LocationForm
          location={modal.location}
          onClose={() => setModal(null)}
          onSaved={save}
          setNotice={setNotice}
        />
      )}
    </section>
  );
}

export default LocationsManager;