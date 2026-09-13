import supabase from '../supabase/supabase';

const consultationsTable = 'consultations_1789302054187';

export async function listConsultations() {
  const { data, error } = await supabase
    .from(consultationsTable)
    .select('*')
    .eq('is_archived', false)
    .order('consultation_name');

  if (error) throw error;
  return data || [];
}

export async function listBookableConsultations() {
  const { data, error } = await supabase
    .from(consultationsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .order('consultation_name');

  if (error) throw error;
  return data || [];
}

export async function saveConsultation(
  values,
  existingConsultation
) {
  const payload = {
    consultation_name: values.consultationName.trim(),
    consultation_fees_inr: Number(values.consultationFees),
    doctor_ids: values.doctorIds,
    location_ids: values.locationIds,
    important_information: values.importantInformation.trim(),
    updated_at: new Date().toISOString()
  };

  const query = existingConsultation
    ? supabase
        .from(consultationsTable)
        .update(payload)
        .eq('id', existingConsultation.id)
        .select()
        .single()
    : supabase
        .from(consultationsTable)
        .insert(payload)
        .select()
        .single();

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function setConsultationBookingStatus(
  consultationId,
  isAvailableForBooking
) {
  const { data, error } = await supabase
    .from(consultationsTable)
    .update({
      is_available_for_booking: isAvailableForBooking,
      updated_at: new Date().toISOString()
    })
    .eq('id', consultationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveConsultation(consultationId) {
  const { error } = await supabase
    .from(consultationsTable)
    .update({
      is_archived: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', consultationId);

  if (error) throw error;
}