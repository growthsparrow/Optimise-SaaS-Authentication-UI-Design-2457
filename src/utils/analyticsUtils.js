export function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export function countRows(bookings, getLabel) {
  const counts = new Map();

  bookings.forEach((booking) => {
    const label = getLabel(booking) || 'Not assigned';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value);
}

export function sumRows(bookings, getLabel, getValue) {
  const totals = new Map();

  bookings.forEach((booking) => {
    const label = getLabel(booking) || 'Not assigned';
    const value = Number(getValue(booking) || 0);
    totals.set(label, (totals.get(label) || 0) + value);
  });

  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value);
}

export function getDateLimit(period) {
  if (period === 'all') {
    return '';
  }

  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Number(period));

  return date.toISOString().slice(0, 10);
}

export function buildTrend(bookings, period) {
  const dayCount = period === 'all' ? 30 : Number(period);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const points = [];

  for (let offset = Math.min(dayCount - 1, 29); offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);

    const dateKey = date.toISOString().slice(0, 10);
    const value = bookings.filter(
      (booking) => booking.booking_date === dateKey
    ).length;

    points.push({
      label: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      value
    });
  }

  return points;
}

export function getAnalyticsMetrics(bookings) {
  const completed = bookings.filter((booking) => booking.status === 'visited');
  const confirmed = bookings.filter((booking) =>
    ['confirmed', 'rescheduled'].includes(booking.status)
  );
  const noShows = bookings.filter((booking) => booking.status === 'no_show');
  const cancelled = bookings.filter((booking) => booking.status === 'cancelled');
  const uniquePatients = new Set(
    bookings
      .map((booking) => booking.phone_number || booking.patient_name)
      .filter(Boolean)
  );

  const revenue = completed.reduce(
    (total, booking) =>
      total + Number(booking.consultation?.consultation_fees_inr || 0),
    0
  );

  const averageAge = bookings.length
    ? Math.round(
        bookings.reduce((total, booking) => total + Number(booking.age || 0), 0) /
          bookings.length
      )
    : 0;

  return {
    total: bookings.length,
    completed: completed.length,
    confirmed: confirmed.length,
    noShows: noShows.length,
    cancelled: cancelled.length,
    uniquePatients: uniquePatients.size,
    revenue,
    averageAge,
    noShowRate: bookings.length
      ? Math.round((noShows.length / bookings.length) * 100)
      : 0
  };
}