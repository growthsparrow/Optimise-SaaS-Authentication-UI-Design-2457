import React, { useEffect, useMemo, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  archiveVacation,
  listVacations,
  saveVacation,
  saveVacationDates
} from '../services/doctorService';

const {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiPlus,
  FiTrash2,
  FiX
} = FiIcons;

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function VacationPanel({ doctor, onClose, setNotice }) {
  const today = new Date();
  const [vacations, setVacations] = useState([]);
  const [editing, setEditing] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [reason, setReason] = useState('');
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listVacations(doctor.id)
      .then(setVacations)
      .catch((error) => setNotice(error.message));
  }, [doctor.id, setNotice]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const days = [];

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      days.push(null);
    }

    for (let date = 1; date <= lastDay.getDate(); date += 1) {
      days.push(new Date(month.getFullYear(), month.getMonth(), date));
    }

    return days;
  }, [month]);

  const toggleDate = (date) => {
    const key = toDateKey(date);

    setSelectedDates((current) => current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key].sort());
  };

  const editVacation = (vacation) => {
    setEditing(vacation);
    setReason(vacation.reason || '');
    setSelectedDates(getDatesBetween(vacation.start_date, vacation.end_date));
  };

  const resetSelection = () => {
    setEditing(null);
    setSelectedDates([]);
    setReason('');
  };

  const submit = async (event) => {
    event.preventDefault();

    if (!selectedDates.length) {
      setNotice('Select at least one date for the vacation.');
      return;
    }

    setSaving(true);

    try {
      if (editing) {
        const updated = await saveVacation({
          startDate: selectedDates[0],
          endDate: selectedDates[selectedDates.length - 1],
          reason
        }, doctor.id, editing);

        setVacations((current) => current.map((item) => (
          item.id === updated.id ? updated : item
        )));
      } else {
        const created = await saveVacationDates(selectedDates, doctor.id, reason);
        setVacations((current) => [...current, ...created].sort(
          (a, b) => a.start_date.localeCompare(b.start_date)
        ));
      }

      resetSelection();
      setNotice('Vacation dates updated.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  };

  const archive = async (vacation) => {
    try {
      await archiveVacation(vacation.id);
      setVacations((current) => current.filter((item) => item.id !== vacation.id));
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <div className="doctor-modal-backdrop">
      <section className="vacation-panel vacation-panel--enhanced" role="dialog" aria-modal="true">
        <header className="doctor-modal__header">
          <div>
            <span className="dashboard-eyebrow">Time away</span>
            <h2>{doctor.doctor_name}&apos;s vacations</h2>
            <p>Select any dates, including separate dates across different months.</p>
          </div>
          <button className="doctor-icon-button" onClick={onClose} aria-label="Close">
            <SafeIcon icon={FiX} />
          </button>
        </header>

        <form className="vacation-form vacation-form--enhanced" onSubmit={submit}>
          <div className="calendar-header">
            <button type="button" className="calendar-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">
              <SafeIcon icon={FiChevronLeft} />
            </button>
            <strong>{monthNames[month.getMonth()]} {month.getFullYear()}</strong>
            <button type="button" className="calendar-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">
              <SafeIcon icon={FiChevronRight} />
            </button>
          </div>

          <div className="calendar-week">
            {weekDays.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="calendar-grid">
            {calendarDays.map((date, index) => date
              ? (
                <button
                  type="button"
                  key={toDateKey(date)}
                  className={selectedDates.includes(toDateKey(date))
                    ? 'calendar-day calendar-day--selected'
                    : 'calendar-day'}
                  onClick={() => toggleDate(date)}
                >
                  {date.getDate()}
                </button>
              )
              : <span className="calendar-day calendar-day--empty" key={`empty-${index}`} />
            )}
          </div>

          <div className="selected-dates-panel">
            <div className="selected-dates-panel__heading">
              <span>Selected dates</span>
              <small>{selectedDates.length} selected</small>
            </div>
            {selectedDates.length
              ? (
                <div className="selected-date-list">
                  {selectedDates.map((date) => (
                    <button type="button" key={date} onClick={() => setSelectedDates((current) => current.filter((item) => item !== date))}>
                      {date}
                      <SafeIcon icon={FiX} />
                    </button>
                  ))}
                </div>
              )
              : <p className="calendar-empty">Click dates above to select them.</p>}
          </div>

          <label className="doctor-field vacation-reason">
            <span>Note <small>Optional</small></span>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Annual leave" />
          </label>

          <div className="vacation-form__actions">
            <button type="button" className="doctor-secondary" onClick={resetSelection}>
              Clear selection
            </button>
            <button className="dashboard-primary" disabled={saving}>
              <SafeIcon icon={FiPlus} />
              {editing ? 'Update vacation' : 'Set selected dates'}
            </button>
          </div>
        </form>

        <div className="vacation-list">
          {vacations.length === 0 && (
            <div className="empty-state">
              <SafeIcon icon={FiCalendar} />
              <p>No vacations set yet.</p>
            </div>
          )}

          {vacations.map((vacation) => (
            <div className="vacation-row" key={vacation.id}>
              <div>
                <strong>
                  {vacation.start_date === vacation.end_date
                    ? vacation.start_date
                    : `${vacation.start_date} → ${vacation.end_date}`}
                </strong>
                <small>{vacation.reason || 'Unavailable'}</small>
              </div>
              <div>
                <button className="doctor-icon-button" onClick={() => editVacation(vacation)} aria-label="Edit vacation">
                  <SafeIcon icon={FiEdit2} />
                </button>
                <button className="doctor-icon-button doctor-icon-button--danger" onClick={() => archive(vacation)} aria-label="Remove vacation">
                  <SafeIcon icon={FiTrash2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function getDatesBetween(startDate, endDate) {
  const dates = [];
  const current = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (current <= end) {
    dates.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export default VacationPanel;