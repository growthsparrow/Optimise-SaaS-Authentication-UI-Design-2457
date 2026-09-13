import supabase from '../supabase/supabase';

const doctorsTable = 'doctors_1789298737910';
const vacationsTable = 'doctor_vacations_1789298737910';

export async function listDoctors() {
  const {data, error} = await supabase
    .from(doctorsTable)
    .select('*')
    .eq('is_archived', false)
    .order('doctor_name');

  if (error) throw error;
  return data || [];
}

export async function listBookableDoctors() {
  const {data, error} = await supabase
    .from(doctorsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .order('doctor_name');

  if (error) throw error;
  return data || [];
}

export async function saveDoctor(values, existingDoctor) {
  const payload = {
    doctor_name: values.doctorName.trim(),
    speciality: values.speciality.trim(),
    phone_number: values.phoneNumber,
    email_id: values.emailId.trim().toLowerCase(),
    available_days: values.availableDays,
    consultation_duration: Number(values.consultationDuration),
    selected_time_slots: values.selectedTimeSlots,
    photo_url: values.photoUrl || '',
    consultation_charges_inr: Number(values.consultationCharges || 0),
    updated_at: new Date().toISOString()
  };

  const query = existingDoctor
    ? supabase.from(doctorsTable).update(payload).eq('id', existingDoctor.id).select().single()
    : supabase.from(doctorsTable).insert(payload).select().single();

  const {data, error} = await query;
  if (error) throw error;
  return data;
}

export async function setDoctorBookingStatus(doctorId, isAvailableForBooking) {
  const {data, error} = await supabase
    .from(doctorsTable)
    .update({is_available_for_booking: isAvailableForBooking, updated_at: new Date().toISOString()})
    .eq('id', doctorId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveDoctor(doctorId) {
  const {error} = await supabase
    .from(doctorsTable)
    .update({is_archived: true, updated_at: new Date().toISOString()})
    .eq('id', doctorId);

  if (error) throw error;
}

export async function listVacations(doctorId) {
  const {data, error} = await supabase
    .from(vacationsTable)
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('is_active', true)
    .order('start_date');

  if (error) throw error;
  return data || [];
}

export async function saveVacation(values, doctorId, existingVacation) {
  const payload = {
    doctor_id: doctorId,
    start_date: values.startDate,
    end_date: values.endDate,
    reason: values.reason.trim(),
    updated_at: new Date().toISOString()
  };

  const query = existingVacation
    ? supabase.from(vacationsTable).update(payload).eq('id', existingVacation.id).select().single()
    : supabase.from(vacationsTable).insert(payload).select().single();

  const {data, error} = await query;
  if (error) throw error;
  return data;
}

export async function saveVacationDates(dates, doctorId, reason) {
  const rows = dates.map((date) => ({
    doctor_id: doctorId,
    start_date: date,
    end_date: date,
    reason: reason.trim()
  }));

  const {data, error} = await supabase.from(vacationsTable).insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function archiveVacation(vacationId) {
  const {error} = await supabase
    .from(vacationsTable)
    .update({is_active: false, updated_at: new Date().toISOString()})
    .eq('id', vacationId);

  if (error) throw error;
}

export async function uploadDoctorPhoto(file, userId) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const {error} = await supabase.storage
    .from('doctor-photos')
    .upload(path, file, {cacheControl: '3600', upsert: false});

  if (error) throw error;
  const {data} = supabase.storage.from('doctor-photos').getPublicUrl(path);
  return data.publicUrl;
}