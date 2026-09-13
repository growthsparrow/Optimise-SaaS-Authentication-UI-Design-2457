export const doctorDays = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const consultationDurations = [1, 5, 10, 15, 30, 60];

export function createTimeSlots(duration) {
  const slots = [];
  const start = 9 * 60;
  const end = 21 * 60;

  for (let minutes = start; minutes < end; minutes += Number(duration)) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;

    slots.push(
      `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`
    );
  }

  return slots;
}

function convertSlotToMinutes(slot) {
  const [time, suffix] = slot.split(' ');
  const [hourValue, minuteValue] = time.split(':').map(Number);
  let hour = hourValue;

  if (suffix === 'AM' && hour === 12) hour = 0;
  if (suffix === 'PM' && hour !== 12) hour += 12;

  return hour * 60 + minuteValue;
}

export function groupTimeSlots(slots) {
  return [
    {
      label: 'Morning',
      hint: '9:00 AM – 12:00 PM',
      slots: slots.filter((slot) => {
        const minutes = convertSlotToMinutes(slot);
        return minutes >= 9 * 60 && minutes < 12 * 60;
      })
    },
    {
      label: 'Afternoon',
      hint: '12:00 PM – 4:00 PM',
      slots: slots.filter((slot) => {
        const minutes = convertSlotToMinutes(slot);
        return minutes >= 12 * 60 && minutes < 16 * 60;
      })
    },
    {
      label: 'Evening',
      hint: '4:00 PM – 9:00 PM',
      slots: slots.filter((slot) => {
        const minutes = convertSlotToMinutes(slot);
        return minutes >= 16 * 60 && minutes < 21 * 60;
      })
    }
  ];
}