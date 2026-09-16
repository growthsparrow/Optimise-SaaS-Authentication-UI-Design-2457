import React, { useEffect, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  defaultAppointmentFields,
  fieldTypes,
  getMyAppointmentForm,
  saveAppointmentForm
} from '../services/appointmentFormService';
import './AppointmentFormBuilder.css';

const {
  FiChevronDown,
  FiChevronUp,
  FiEdit2,
  FiEye,
  FiPlus,
  FiSave,
  FiTrash2,
  FiX
} = FiIcons;

function makeField(type = 'text') {
  const id = `field-${Date.now()}`;

  return {
    id,
    name: id.replace('-', '_'),
    label: 'New question',
    type,
    required: false,
    placeholder: '',
    options: type === 'select' ? ['Option 1'] : []
  };
}

function AppointmentFormBuilder() {
  const [form, setForm] = useState(null);
  const [values, setValues] = useState({
    formName: '',
    description: '',
    fields: defaultAppointmentFields,
    isPublished: true
  });
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyAppointmentForm()
      .then((savedForm) => {
        if (!savedForm) {
          return;
        }

        setForm(savedForm);
        setValues({
          formName: savedForm.form_name,
          description: savedForm.description,
          fields: savedForm.fields || defaultAppointmentFields,
          isPublished: savedForm.is_published
        });
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setNotice('');
  };

  const updateField = (id, key, value) => {
    setValues((current) => ({
      ...current,
      fields: current.fields.map((field) =>
        field.id === id ? { ...field, [key]: value } : field
      )
    }));
  };

  const removeField = (id) => {
    setValues((current) => ({
      ...current,
      fields: current.fields.filter((field) => field.id !== id)
    }));
    setEditingId(null);
  };

  const moveField = (id, direction) => {
    setValues((current) => {
      const index = current.fields.findIndex((field) => field.id === id);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.fields.length) {
        return current;
      }

      const fields = [...current.fields];
      [fields[index], fields[nextIndex]] = [fields[nextIndex], fields[index]];

      return { ...current, fields };
    });
  };

  const addField = (type) => {
    const field = makeField(type);

    setValues((current) => ({
      ...current,
      fields: [...current.fields, field]
    }));
    setEditingId(field.id);
  };

  const save = async () => {
    setError('');
    setNotice('');

    if (!values.formName.trim()) {
      setError('Add a name for the appointment form before saving.');
      return;
    }

    if (!values.fields.length) {
      setError('Add at least one field before saving the appointment form.');
      return;
    }

    setSaving(true);

    try {
      const saved = await saveAppointmentForm(values, form);
      setForm(saved);
      setNotice('Appointment form saved. The public booking page will use this version.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="appointment-form-builder">
      <header className="appointment-form-builder__intro">
        <span className="dashboard-eyebrow">Public booking experience</span>
        <h2>Appointment form</h2>
        <p>
          Build the questions clients answer before selecting a booking type,
          date and time. Changes are reflected on the public booking page after saving.
        </p>
      </header>

      {(notice || error) && (
        <p
          className={error
            ? 'appointment-form-builder__notice appointment-form-builder__notice--error'
            : 'appointment-form-builder__notice'}
        >
          {error || notice}
        </p>
      )}

      <div className="appointment-form-builder__layout">
        <section className="appointment-form-builder__panel">
          <header>
            <div>
              <h3>Fields</h3>
              <p>Use the arrows to change the order clients see.</p>
            </div>
            <SafeIcon icon={FiEdit2} />
          </header>

          <div className="appointment-form-builder__fields">
            {values.fields.map((field, index) => (
              <React.Fragment key={field.id}>
                <article className="appointment-form-field">
                  <span className="appointment-form-field__handle">⋮⋮</span>

                  <div className="appointment-form-field__body">
                    <strong>{field.label}</strong>
                    <small>
                      {fieldTypes.find((item) => item.value === field.type)?.label}
                      {field.required ? ' · Required' : ' · Optional'}
                    </small>
                  </div>

                  <div className="appointment-form-field__actions">
                    <button
                      type="button"
                      onClick={() => moveField(field.id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${field.label} up`}
                    >
                      <SafeIcon icon={FiChevronUp} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(field.id, 1)}
                      disabled={index === values.fields.length - 1}
                      aria-label={`Move ${field.label} down`}
                    >
                      <SafeIcon icon={FiChevronDown} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(editingId === field.id ? null : field.id)}
                      aria-label={`Edit ${field.label}`}
                    >
                      <SafeIcon icon={editingId === field.id ? FiX : FiEdit2} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      aria-label={`Remove ${field.label}`}
                    >
                      <SafeIcon icon={FiTrash2} />
                    </button>
                  </div>
                </article>

                {editingId === field.id && (
                  <FieldEditor
                    field={field}
                    onChange={(key, value) => updateField(field.id, key, value)}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="appointment-form-builder__actions">
            <button
              type="button"
              className="appointment-form-add"
              onClick={() => addField('text')}
            >
              <SafeIcon icon={FiPlus} />
              Add question
            </button>
          </div>
        </section>

        <section className="appointment-form-builder__panel">
          <header>
            <div>
              <h3>Live preview</h3>
              <p>Preview the client-facing form before publishing.</p>
            </div>
            <SafeIcon icon={FiEye} />
          </header>

          <div className="appointment-form-settings">
            <label>
              <span>Form name</span>
              <input
                value={values.formName}
                onChange={(event) => update('formName', event.target.value)}
                placeholder="Example: New patient appointment details"
              />
            </label>

            <label>
              <span>Introductory copy</span>
              <textarea
                rows="3"
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
                placeholder="Example: Please share your details so we can prepare for your appointment."
              />
            </label>

            <label className="appointment-form-settings__toggle">
              <input
                type="checkbox"
                checked={values.isPublished}
                onChange={(event) => update('isPublished', event.target.checked)}
              />
              <span>Use this form on the public booking page</span>
            </label>
          </div>

          <FormPreview
            name={values.formName}
            description={values.description}
            fields={values.fields}
          />
        </section>
      </div>

      <footer className="appointment-form-builder__footer">
        <button
          type="button"
          className="admin-primary-button"
          disabled={saving}
          onClick={save}
        >
          <SafeIcon icon={saving ? FiEye : FiSave} />
          {saving ? 'Saving form…' : 'Save appointment form'}
        </button>
      </footer>
    </section>
  );
}

function FieldEditor({ field, onChange }) {
  const updateOption = (index, value) => {
    const options = [...field.options];
    options[index] = value;
    onChange('options', options);
  };

  const addOption = () => onChange('options', [...field.options, 'New option']);

  const removeOption = (index) => {
    onChange(
      'options',
      field.options.filter((_, optionIndex) => optionIndex !== index)
    );
  };

  return (
    <div className="appointment-form-editor">
      <div className="appointment-form-editor__grid">
        <label>
          <span>Question label</span>
          <input
            value={field.label}
            onChange={(event) => onChange('label', event.target.value)}
          />
        </label>

        <label>
          <span>Field type</span>
          <select
            value={field.type}
            onChange={(event) => onChange('type', event.target.value)}
          >
            {fieldTypes.map((type) => (
              <option value={type.value} key={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Field name</span>
          <input value={field.name} readOnly aria-readonly="true" />
          <small className="appointment-form-editor__helper">
            Field names are managed automatically.
          </small>
        </label>

        <label>
          <span>Placeholder</span>
          <input
            value={field.placeholder || ''}
            onChange={(event) => onChange('placeholder', event.target.value)}
          />
        </label>

        {field.type === 'select' && (
          <div className="appointment-form-editor__full appointment-form-options">
            <span>Dropdown options</span>

            {field.options.map((option, index) => (
              <div className="appointment-form-option-row" key={`${field.id}-option-${index}`}>
                <input
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  aria-label="Remove option"
                >
                  <SafeIcon icon={FiTrash2} />
                </button>
              </div>
            ))}

            <button type="button" className="appointment-form-add" onClick={addOption}>
              <SafeIcon icon={FiPlus} /> Add option
            </button>
          </div>
        )}

        <label className="appointment-form-editor__full appointment-form-settings__toggle">
          <input
            type="checkbox"
            checked={field.required}
            onChange={(event) => onChange('required', event.target.checked)}
          />
          <span>Client must complete this field</span>
        </label>
      </div>
    </div>
  );
}

function FormPreview({ name, description, fields }) {
  return (
    <div className="appointment-form-preview">
      <div className="appointment-form-preview__heading">
        <SafeIcon icon={FiEye} />
        <span>{name || 'Appointment details'}</span>
      </div>

      <p>{description || 'Your details'}</p>

      <div className="appointment-form-preview__fields">
        {fields.map((field) => (
          <label key={field.id}>
            <span>
              {field.label}
              {field.required ? ' *' : ''}
            </span>

            {field.type === 'textarea' ? (
              <textarea placeholder={field.placeholder} readOnly />
            ) : field.type === 'select' ? (
              <select defaultValue="" disabled>
                <option value="">Choose an option</option>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <input type="checkbox" disabled />
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                readOnly
              />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export default AppointmentFormBuilder;