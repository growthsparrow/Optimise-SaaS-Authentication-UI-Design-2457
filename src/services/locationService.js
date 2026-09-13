import supabase from '../supabase/supabase';

const locationsTable = 'business_locations_1789300875912';

export async function listLocations() {
  const {data, error} = await supabase
    .from(locationsTable)
    .select('*')
    .eq('is_archived', false)
    .order('location_name');

  if (error) throw error;
  return data || [];
}

export async function listBookableLocations() {
  const {data, error} = await supabase
    .from(locationsTable)
    .select('*')
    .eq('is_archived', false)
    .eq('is_available_for_booking', true)
    .order('location_name');

  if (error) throw error;
  return data || [];
}

export async function saveLocation(values, existingLocation) {
  const payload = {
    location_name: values.locationName.trim(),
    address: values.address.trim(),
    google_maps_link: values.googleMapsLink.trim(),
    contact_number: values.contactNumber,
    business_days: values.businessDays,
    opens_at: values.opensAt,
    closes_at: values.closesAt,
    updated_at: new Date().toISOString()
  };

  const query = existingLocation
    ? supabase.from(locationsTable).update(payload).eq('id', existingLocation.id).select().single()
    : supabase.from(locationsTable).insert(payload).select().single();

  const {data, error} = await query;
  if (error) throw error;
  return data;
}

export async function setLocationBookingStatus(locationId, isAvailableForBooking) {
  const {data, error} = await supabase
    .from(locationsTable)
    .update({is_available_for_booking: isAvailableForBooking, updated_at: new Date().toISOString()})
    .eq('id', locationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function archiveLocation(locationId) {
  const {error} = await supabase
    .from(locationsTable)
    .update({is_archived: true, updated_at: new Date().toISOString()})
    .eq('id', locationId);

  if (error) throw error;
}

export async function getLocation(locationId) {
  const {data, error} = await supabase
    .from(locationsTable)
    .select('*')
    .eq('id', locationId)
    .single();

  if (error) throw error;
  return data;
}