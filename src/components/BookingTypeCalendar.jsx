import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {FiCalendar, FiCheck, FiChevronLeft, FiChevronRight} = FiIcons;

function monthLabel(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
}

function getDays(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const totalDays = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0
  ).getDate();

  const leadingDays = firstDay.getDay();
  return [
    ...Array.from({length: leadingDays}, () => null),
    ...Array.from({length: totalDays}, (_, index) => index + 1)
  ];
}

function toDateKey(year, month, day) {
  return [
    year,
    String(month + 1).padStart(2, '0'),
    String(day).padStart(2, '0')
  ].join('-');
}

function BookingTypeCalendar({value = [], onChange}) {
  const [month, setMonth] = React.useState(() => new Date());
  const selectedDates = new Set(value);

  const toggleDate = (dateKey) => {
    const next = selectedDates.has(dateKey)
      ? value.filter((date) => date !== dateKey)
      : [...value, dateKey].sort();

    onChange(next);
  };

  const days = getDays(month);

  return (
    <section className="booking-calendar">
      <div className="booking-calendar__heading">
        <div>
          <span className="booking-section-label">Client date selection</span>
          <strong>Choose available full-day dates</strong>
          <small>
            Clients can select one of these dates, or choose multiple dates when booking.
          </small>
        </div>

        <SafeIcon icon={FiCalendar} />
      </div>

      <div className="booking-calendar__toolbar">
        <button
          type="button"
          onClick={() => setMonth((current) => new Date(
            current.getFullYear(),
            current.getMonth() - 1,
            1
          ))}
          aria-label="Previous month"
        >
          <SafeIcon icon={FiChevronLeft} />
        </button>

        <strong>{monthLabel(month)}</strong>

        <button
          type="button"
          onClick={() => setMonth((current) => new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            1
          ))}
          aria-label="Next month"
        >
          <SafeIcon icon={FiChevronRight} />
        </button>
      </div>

      <div className="booking-calendar__weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="booking-calendar__days">
        {days.map((day, index) => {
          if (!day) {
            return <span className="booking-calendar__empty" key={`empty-${index}`} />;
          }

          const dateKey = toDateKey(month.getFullYear(), month.getMonth(), day);
          const selected = selectedDates.has(dateKey);

          return (
            <button
              type="button"
              key={dateKey}
              className={selected
                ? 'booking-calendar__day booking-calendar__day--selected'
                : 'booking-calendar__day'}
              onClick={() => toggleDate(dateKey)}
              aria-pressed={selected}
            >
              {day}
              {selected && <SafeIcon icon={FiCheck} />}
            </button>
          );
        })}
      </div>

      <p className="booking-calendar__summary">
        {value.length
          ? `${value.length} date${value.length === 1 ? '' : 's'} available to clients`
          : 'Select at least one date for full-day booking'}
      </p>
    </section>
  );
}

export default BookingTypeCalendar;