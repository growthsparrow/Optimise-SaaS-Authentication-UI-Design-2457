import React from 'react';

function AppointmentFilters({
  range,
  setRange,
  status,
  setStatus,
  type,
  setType,
  types,
  startDate,
  setStartDate,
  endDate,
  setEndDate
}) {
  return (
    <div className="appointment-filters">
      <label>
        Date range
        <select value={range} onChange={(event) => setRange(event.target.value)}>
          <option value="all">All appointments</option>
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="custom">Custom dates</option>
        </select>
      </label>

      {range === 'custom' && (
        <>
          <label>
            From
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
        </>
      )}

      <label>
        Appointment type
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">All types</option>
          {types.map((item) => <option value={item} key={item}>{item}</option>)}
        </select>
      </label>

      <label>
        Status
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="rescheduled">Rescheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No show</option>
        </select>
      </label>
    </div>
  );
}

export default AppointmentFilters;