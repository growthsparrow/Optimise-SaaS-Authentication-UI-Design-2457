import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  businessDays,
  defaultLocationValues
} from '../data/locationSchedule';

const { FiCheck, FiClock, FiMapPin, FiPhone, FiX } = FiIcons;

function LocationForm({ location, onClose, onSaved, setNotice }) {
  const initialValues = useMemo(
    () => ({
      locationName: location?.location_name || '',
      address: location?.address || '',
      googleMapsLink: location?.google_maps_link || '',
      contactNumber: location?.contact_number || '',
      businessDays: location?.business_days || [],
      opensAt: location?.opens_at || defaultLocationValues.opensAt,
      closesAt: location?.closes_at || defaultLocationValues.closesAt
    }),
    [location]
  );

  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const updateValue = (key, value) => {
    setValues((current) => ({
      ...current,
      [key]: value
    }));
  };

  const toggleDay = (day) => {
    setValues((current) => ({
      ...current,
      businessDays: current.businessDays.includes(day)
        ? current.businessDays.filter((item) => item !== day)
        : [...current.businessDays, day]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!values.businessDays.length) {
      setNotice('Choose at least one business day.');
      return;
    }

    if (values.opensAt >= values.closesAt) {
      setNotice('Closing time must be later than opening time.');
      return;
    }

    setSaving(true);

    try {
      await onSaved(values, location);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="location-modal-backdrop">
      <section
        className="location-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
      >
        <header className="location-modal__header">
          <div>
            <span className="dashboard-eyebrow">Workspace location</span>
            <h2 id="location-modal-title">
              {location ? 'Edit location' : 'Add a location'}
            </h2>
            <p>Keep the details your customers need to find and contact you.</p>
          </div>

          <button
            className="location-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close location form"
          >
            <SafeIcon icon={FiX} />
          </button>
        </header>

        <form className="location-form" onSubmit={handleSubmit}>
          <div className="location-form__grid">
            <label className="location-field">
              <span>Location name</span>
              <span className="location-input-wrap">
                <SafeIcon icon={FiMapPin} />
                <input
                  value={values.locationName}
                  onChange={(event) =>
                    updateValue('locationName', event.target.value)
                  }
                  placeholder="Main clinic"
                  required
                />
              </span>
            </label>

            <label className="location-field">
              <span>Contact number</span>
              <span className="location-input-wrap">
                <SafeIcon icon={FiPhone} />
                <input
                  value={values.contactNumber}
                  onChange={(event) =>
                    updateValue(
                      'contactNumber',
                      event.target.value.replace(/\D/g, '').slice(0, 10)
                    )
                  }
                  placeholder="9876543210"
                  minLength="10"
                  maxLength="10"
                  pattern="[0-9]{10}"
                  inputMode="numeric"
                  title="Enter exactly 10 digits"
                  required
                />
              </span>
              <small>Enter exactly 10 digits.</small>
            </label>

            <label className="location-field location-field--wide">
              <span>Address</span>
              <textarea
                value={values.address}
                onChange={(event) =>
                  updateValue('address', event.target.value)
                }
                placeholder="Street, area, city and postal code"
                rows="3"
                required
              />
            </label>

            <label className="location-field location-field--wide">
              <span>Google Maps link</span>
              <input
                type="url"
                value={values.googleMapsLink}
                onChange={(event) =>
                  updateValue('googleMapsLink', event.target.value)
                }
                placeholder="https://maps.google.com/..."
                required
              />
            </label>
          </div>

          <div className="location-form__section">
            <div className="location-section__heading">
              <span>Business days</span>
              <small>{values.businessDays.length} of 7 selected</small>
            </div>

            <div className="location-day-picker">
              {businessDays.map((day) => (
                <button
                  type="button"
                  key={day}
                  className={
                    values.businessDays.includes(day)
                      ? 'location-day location-day--active'
                      : 'location-day'
                  }
                  onClick={() => toggleDay(day)}
                >
                  <SafeIcon icon={FiCheck} />
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="location-form__section">
            <div className="location-section__heading">
              <span>
                <SafeIcon icon={FiClock} />
                Business hours
              </span>
              <small>Opening and closing times</small>
            </div>

            <div className="location-hours">
              <label className="location-field">
                <span>Opens at</span>
                <input
                  type="time"
                  value={values.opensAt}
                  onChange={(event) =>
                    updateValue('opensAt', event.target.value)
                  }
                  required
                />
              </label>

              <label className="location-field">
                <span>Closes at</span>
                <input
                  type="time"
                  value={values.closesAt}
                  onChange={(event) =>
                    updateValue('closesAt', event.target.value)
                  }
                  required
                />
              </label>
            </div>
          </div>

          <footer className="location-modal__footer">
            <button
              type="button"
              className="location-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button className="dashboard-primary" disabled={saving}>
              {saving
                ? 'Saving…'
                : location
                  ? 'Save changes'
                  : 'Add location'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default LocationForm;