import React,{useMemo} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import './BookingSchedulePicker.css';

const {
  FiCalendar,
  FiCheck,
  FiClock,
  FiMapPin,
  FiUser
}=FiIcons;

function formatDate(dateValue) {
  const date=new Date(`${dateValue}T12:00:00`);

  return {
    day: date.toLocaleDateString('en-US',{weekday:'short'}),
    number: date.toLocaleDateString('en-US',{day:'2-digit'}),
    month: date.toLocaleDateString('en-US',{month:'short'}),
    full: date.toLocaleDateString('en-US',{
      weekday:'long',
      month:'long',
      day:'numeric'
    })
  };
}

function getHour(slot) {
  const match=slot.match(/(\d{1,2}):\d{2}\s?(AM|PM)/i);

  if (!match) {
    return 12;
  }

  let hour=Number(match[1]);

  if (match[2].toUpperCase()==='PM'&&hour!==12) {
    hour+=12;
  }

  if (match[2].toUpperCase()==='AM'&&hour===12) {
    hour=0;
  }

  return hour;
}

function groupSlots(slots) {
  return [
    {
      label:'Morning',
      hint:'Before noon',
      slots:slots.filter((slot)=> getHour(slot)<12)
    },
    {
      label:'Afternoon',
      hint:'12 PM – 4 PM',
      slots:slots.filter((slot)=> getHour(slot)>=12&&getHour(slot)<16)
    },
    {
      label:'Evening',
      hint:'After 4 PM',
      slots:slots.filter((slot)=> getHour(slot)>=16)
    }
  ].filter((group)=> group.slots.length);
}

function isWithinBookingWindow(dateValue) {
  const today=new Date();
  today.setHours(12,0,0,0);

  const lastDate=new Date(today);
  lastDate.setDate(lastDate.getDate()+13);

  const date=new Date(`${dateValue}T12:00:00`);

  return date>=today&&date<=lastDate;
}

function BookingSchedulePicker({
  dates,
  slots,
  valueDate,
  valueTime,
  onDateChange,
  onTimeChange,
  location,
  doctor,
  consultation
}) {
  const visibleDates=useMemo(
    ()=> dates.filter(isWithinBookingWindow).slice(0,14),
    [dates]
  );
  const groupedSlots=useMemo(()=> groupSlots(slots),[slots]);
  const weeks=useMemo(()=> [
    {
      label:'Current week',
      dates:visibleDates.slice(0,7)
    },
    {
      label:'Coming week',
      dates:visibleDates.slice(7,14)
    }
  ].filter((week)=> week.dates.length),[visibleDates]);
  const selectedDate=valueDate ? formatDate(valueDate) : null;

  return (
    <div className="schedule-picker">
      <div className="schedule-picker__summary">
        <div className="schedule-picker__summary-icon">
          <SafeIcon icon={FiCalendar} />
        </div>
        <div>
          <span>Appointment schedule</span>
          <strong>
            {selectedDate ? selectedDate.full : 'Choose a date and time'}
          </strong>
          <small>
            {location?.location_name || 'Select a convenient appointment slot'}
          </small>
        </div>
      </div>

      <div className="schedule-picker__section">
        <div className="schedule-picker__heading">
          <div>
            <span className="schedule-picker__label">01 / Date</span>
            <h3>Choose from the next two weeks</h3>
          </div>
          <span className="schedule-picker__date-note">14-day availability</span>
        </div>

        <div className="schedule-weeks">
          {weeks.length ? weeks.map((week)=> (
            <div className="schedule-week" key={week.label}>
              <div className="schedule-week__heading">
                <strong>{week.label}</strong>
                <small>{week.dates.length} available days</small>
              </div>

              <div className="schedule-date-list">
                {week.dates.map((date)=> {
                  const formatted=formatDate(date);
                  const selected=valueDate===date;

                  return (
                    <button
                      type="button"
                      key={date}
                      className={selected
                        ? 'schedule-date schedule-date--selected'
                        : 'schedule-date'}
                      onClick={()=> onDateChange(date)}
                    >
                      <span>{formatted.day}</span>
                      <strong>{formatted.number}</strong>
                      <small>{formatted.month}</small>
                      {selected&&<SafeIcon icon={FiCheck} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )) : (
            <div className="schedule-picker__empty">
              No available dates are configured for the next two weeks.
            </div>
          )}
        </div>
      </div>

      <div className="schedule-picker__section schedule-picker__section--times">
        <div className="schedule-picker__heading">
          <div>
            <span className="schedule-picker__label">02 / Time</span>
            <h3>{valueDate ? 'Choose a time slot' : 'Select a date first'}</h3>
          </div>
          {valueDate&&<span className="schedule-picker__timezone">Local time</span>}
        </div>

        {valueDate ? (
          <div className="schedule-time-groups">
            {groupedSlots.length ? groupedSlots.map((group)=> (
              <div className="schedule-time-group" key={group.label}>
                <div className="schedule-time-group__heading">
                  <span>
                    <SafeIcon icon={FiClock} />
                    <strong>{group.label}</strong>
                  </span>
                  <small>{group.hint}</small>
                </div>

                <div className="schedule-slot-list">
                  {group.slots.map((slot)=> (
                    <button
                      type="button"
                      key={slot}
                      className={valueTime===slot
                        ? 'schedule-slot schedule-slot--selected'
                        : 'schedule-slot'}
                      onClick={()=> onTimeChange(slot)}
                    >
                      {valueTime===slot&&<SafeIcon icon={FiCheck} />}
                      <span>{slot}</span>
                    </button>
                  ))}
                </div>
              </div>
            )) : (
              <div className="schedule-picker__empty">
                No time slots are available for this date.
              </div>
            )}
          </div>
        ) : (
          <div className="schedule-time-placeholder">
            <SafeIcon icon={FiCalendar} />
            <span>
              Your available time slots will appear here after you choose a date.
            </span>
          </div>
        )}
      </div>

      {valueDate&&valueTime&&(
        <div className="schedule-picker__selection">
          <div>
            <SafeIcon icon={FiCheck} />
            <span>
              <strong>{selectedDate.full}</strong>
              <small>{valueTime}</small>
            </span>
          </div>

          <div className="schedule-picker__selection-details">
            <span>
              <SafeIcon icon={FiUser} />
              {doctor?.doctor_name || 'Selected doctor'}
            </span>
            <span>
              <SafeIcon icon={FiMapPin} />
              {consultation?.consultation_name ||
                location?.location_name ||
                'Selected appointment'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingSchedulePicker;