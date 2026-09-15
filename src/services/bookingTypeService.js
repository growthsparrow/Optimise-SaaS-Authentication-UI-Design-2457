import supabase from '../supabase/supabase';

const bookingTypesTable='booking_types_1789450000000';
const bookingTypePhotosBucket='booking-type-photos';

export async function listBookingTypes() {
  const {data,error}=await supabase
    .from(bookingTypesTable)
    .select('*')
    .eq('is_archived',false)
    .order('created_at',{ascending:false});

  if (error) {
    throw error;
  }

  return data || [];
}

async function uploadBookingTypePhoto(file,userId) {
  const extension=file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path=`${userId}/${crypto.randomUUID()}.${extension}`;

  const {error}=await supabase.storage
    .from(bookingTypePhotosBucket)
    .upload(path,file,{cacheControl:'3600',upsert:false});

  if (error) {
    throw error;
  }

  const {data}=supabase.storage
    .from(bookingTypePhotosBucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function saveBookingType(values,existingBookingType) {
  const {data:userData,error:userError}=await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user?.id) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const photoUrl=values.professionalPhoto
    ? await uploadBookingTypePhoto(values.professionalPhoto,userData.user.id)
    : values.photoUrl || existingBookingType?.photo_url || '';

  const payload={
    booking_name:values.bookingName.trim(),
    professional_name:values.professionalName.trim(),
    show_professional_name:values.showProfessionalName,
    professional_expertise:values.professionalExpertise.trim(),
    show_professional_expertise:values.showProfessionalExpertise,
    available_days:values.availableDays,
    duration:values.duration,
    available_periods:values.availablePeriods,
    selected_time_slots:values.duration==='full-day' ? [] : values.selectedTimeSlots,
    available_dates:values.duration==='full-day' ? values.availableDates : [],
    cost_inr:Number(values.costInr || 0),
    show_cost:values.showCost,
    booking_type:values.bookingType,
    location_name:values.locationName.trim(),
    address:values.address.trim(),
    contact_number:values.contactNumber.trim(),
    google_maps_link:values.googleMapsLink.trim(),
    meeting_invite_link:values.meetingInviteLink.trim(),
    is_enabled:values.isEnabled !==false,
    photo_url:photoUrl,
    unavailable_weekdays:values.unavailableWeekdays || [],
    unavailable_dates:values.unavailableDates || [],
    unavailable_time_slots:values.duration==='full-day'
      ? []
      : values.unavailableTimeSlots || [],
    updated_at:new Date().toISOString()
  };

  const query=existingBookingType
    ? supabase
      .from(bookingTypesTable)
      .update(payload)
      .eq('id',existingBookingType.id)
      .select()
      .single()
    : supabase
      .from(bookingTypesTable)
      .insert(payload)
      .select()
      .single();

  const {data,error}=await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function setBookingTypeEnabled(id,isEnabled) {
  const {data,error}=await supabase
    .from(bookingTypesTable)
    .update({is_enabled:isEnabled,updated_at:new Date().toISOString()})
    .eq('id',id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function archiveBookingType(id) {
  const {data,error}=await supabase
    .from(bookingTypesTable)
    .update({is_archived:true,updated_at:new Date().toISOString()})
    .eq('id',id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}