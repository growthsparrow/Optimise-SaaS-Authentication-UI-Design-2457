import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiCheck, FiInfo, FiMapPin, FiUsers, FiX } = FiIcons;

function ConsultationForm({
  consultation,
  doctors,
  locations,
  onClose,
  onSaved,
  setNotice
}) {
  const initialValues = useMemo(
    () => ({
      consultationName: consultation?.consultation_name || '',
      consultationFees: consultation?.consultation_fees_inr || '',
      doctorIds: consultation?.doctor_ids || [],
      locationIds: consultation?.location_ids || [],
      importantInformation: consultation?.important_information || ''
    }),
    [consultation]
  );

  const [values, setValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const updateValue = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const toggleMappedItem = (key, id) => {
    setValues((current) => ({
      ...current,
      [key]: current[key].includes(id)
        ? current[key].filter((item) => item !== id)
        : [...current[key], id]
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!values.doctorIds.length) {
      setNotice('Select at least one doctor for this consultation.');
      return;
    }

    if (!values.locationIds.length) {
      setNotice('Select at least one location for this consultation.');
      return;
    }

    setSaving(true);

    try {
      await onSaved(values, consultation);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="consultation-modal-backdrop">
      <section className="consultation-modal" role="dialog" aria-modal="true">
        <header className="consultation-modal__header">
          <div>
            <span className="dashboard-eyebrow">Booking service</span>
            <h2>{consultation ? 'Edit consultation' : 'Add consultation'}</h2>
            <p>Define the service patients can book and where it is available.</p>
          </div>
          <button
            type="button"
            className="consultation-close"
            onClick={onClose}
            aria-label="Close consultation form"
          >
            <SafeIcon icon={FiX} />
          </button>
        </header>

        <form className="consultation-form" onSubmit={handleSubmit}>
          <div className="consultation-form__grid">
            <label className="consultation-field">
              <span>Consultation name</span>
              <input
                value={values.consultationName}
                onChange={(event) =>
                  updateValue('consultationName', event.target.value)
                }
                placeholder="General consultation"
                required
              />
            </label>

            <label className="consultation-field">
              <span>Consultation fees (INR)</span>
              <div className="consultation-fee-input">
                <span>₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.consultationFees}
                  onChange={(event) =>
                    updateValue('consultationFees', event.target.value)
                  }
                  placeholder="500"
                  required
                />
              </div>
            </label>

            <label className="consultation-field consultation-field--wide">
              <span>Important information for patients</span>
              <span className="consultation-input-with-icon">
                <SafeIcon icon={FiInfo} />
                <textarea
                  value={values.importantInformation}
                  onChange={(event) =>
                    updateValue('importantInformation', event.target.value)
                  }
                  placeholder="Bring previous reports or arrive 10 minutes early."
                  rows="4"
                />
              </span>
              <small>This information is shown while patients book.</small>
            </label>
          </div>

          <MappingSection
            title="Available doctors"
            icon={FiUsers}
            items={doctors}
            selected={values.doctorIds}
            emptyText="Add doctors before mapping them to a consultation."
            getLabel={(doctor) => doctor.doctor_name}
            onToggle={(id) => toggleMappedItem('doctorIds', id)}
          />

          <MappingSection
            title="Available locations"
            icon={FiMapPin}
            items={locations}
            selected={values.locationIds}
            emptyText="Add locations before mapping them to a consultation."
            getLabel={(location) => location.location_name}
            onToggle={(id) => toggleMappedItem('locationIds', id)}
          />

          <footer className="consultation-modal__footer">
            <button type="button" className="doctor-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="dashboard-primary" disabled={saving}>
              {saving
                ? 'Saving…'
                : consultation
                  ? 'Save changes'
                  : 'Add consultation'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function MappingSection({
  title,
  icon,
  items,
  selected,
  emptyText,
  getLabel,
  onToggle
}) {
  return (
    <section className="consultation-mapping-section">
      <div className="consultation-section-heading">
        <span>
          <SafeIcon icon={icon} />
          {title}
        </span>
        <small>{selected.length} selected</small>
      </div>

      {items.length ? (
        <div className="consultation-option-grid">
          {items.map((item) => {
            const isSelected = selected.includes(item.id);

            return (
              <button
                type="button"
                key={item.id}
                className={
                  isSelected
                    ? 'consultation-option consultation-option--selected'
                    : 'consultation-option'
                }
                onClick={() => onToggle(item.id)}
              >
                <SafeIcon icon={FiCheck} />
                <span>{getLabel(item)}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="consultation-empty-hint">{emptyText}</p>
      )}
    </section>
  );
}

export default ConsultationForm;