import supabase from '../supabase/supabase';

const BOOKINGS_TABLE = 'patient_bookings_1789315000000';
const DOCTORS_TABLE = 'doctors_1789298737910';
const CONSULTATIONS_TABLE = 'consultations_1789302054187';
const LOCATIONS_TABLE = 'business_locations_1789300875912';

const bookingColumns = `
  id,
  booking_id,
  patient_name,
  phone_number,
  email,
  gender,
  age,
  location_id,
  doctor_id,
  consultation_id,
  booking_date,
  booking_time,
  status,
  created_at,
  updated_at
`;

function normalizeAppointment(row, doctor, consultation, location) {
  return {
    ...row,
    doctor,
    consultation,
    location,
    doctorName: doctor?.doctor_name || 'Professional not assigned',
    speciality: doctor?.speciality || '',
    appointmentType: consultation?.consultation_name || 'Appointment type unavailable',
    fee: Number(consultation?.consultation_fees_inr || 0),
    locationName: location?.location_name || 'Location unavailable',
    address: location?.address || '',
    mapLink: location?.google_maps_link || '',
    contactNumber: location?.contact_number || '',
    displayStatus: row.status === 'visited' ? 'completed' : row.status
  };
}

async function loadReferenceRows(table, ids, columns) {
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .in('id', ids);

  if (error) throw error;
  return data || [];
}

export async function listManagedAppointments() {
  const { data: bookings, error: bookingError } = await supabase
    .from(BOOKINGS_TABLE)
    .select(bookingColumns)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true });

  if (bookingError) throw bookingError;

  const rows = bookings || [];
  const doctorIds = [...new Set(rows.map((row) => row.doctor_id).filter(Boolean))];
  const consultationIds = [
    ...new Set(rows.map((row) => row.consultation_id).filter(Boolean))
  ];
  const locationIds = [...new Set(rows.map((row) => row.location_id).filter(Boolean))];

  const [doctors, consultations, locations] = await Promise.all([
    loadReferenceRows(
      DOCTORS_TABLE,
      doctorIds,
      'id, doctor_name, speciality, phone_number, email_id'
    ),
    loadReferenceRows(
      CONSULTATIONS_TABLE,
      consultationIds,
      'id, consultation_name, consultation_fees_inr, is_archived'
    ),
    loadReferenceRows(
      LOCATIONS_TABLE,
      locationIds,
      'id, location_name, address, google_maps_link, contact_number'
    )
  ]);

  const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const consultationsById = new Map(
    consultations.map((consultation) => [consultation.id, consultation])
  );
  const locationsById = new Map(locations.map((location) => [location.id, location]));

  return rows.map((row) => normalizeAppointment(
    row,
    doctorsById.get(row.doctor_id),
    consultationsById.get(row.consultation_id),
    locationsById.get(row.location_id)
  ));
}

export async function updateAppointmentStatus(id, status) {
  const { data, error } = await supabase
    .from(BOOKINGS_TABLE)
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(bookingColumns)
    .single();

  if (error) throw error;

  const [updated] = await Promise.all([
    listManagedAppointments().then((appointments) => (
      appointments.find((appointment) => appointment.id === data.id)
    ))
  ]);

  return updated || normalizeAppointment(data);
}

export async function rescheduleAppointment(id, date, time) {
  const { error } = await supabase.rpc(
    'reschedule_patient_booking_owner_1789620000000',
    {
      booking_id_value: id,
      booking_date_value: date,
      booking_time_value: time
    }
  );

  if (error) throw error;

  const appointments = await listManagedAppointments();
  return appointments.find((appointment) => appointment.id === id) || null;
}