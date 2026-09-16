import supabase from '../supabase/supabase';

const businessPagesTable = 'business_pages_1789493000000';
const assetsBucket = 'business-page-assets';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'your-business';
}

function normalizeSlug(value) {
  try {
    return decodeURIComponent(String(value || '')).trim().toLowerCase();
  } catch {
    return String(value || '').trim().toLowerCase();
  }
}

function splitLines(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTestimonials(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item?.name && item?.quote)
    .map((item) => ({
      name: String(item.name).trim(),
      role: String(item.role || '').trim(),
      quote: String(item.quote).trim()
    }));
}

export async function getMyBusinessPage() {
  const {data: userData, error: userError} = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const {data, error} = await supabase
    .from(businessPagesTable)
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    user: userData.user,
    page: data,
    registrationCategory: userData.user.user_metadata?.business_domain || ''
  };
}

export async function getPublicBusinessPage(slug) {
  const normalizedSlug = normalizeSlug(slug);

  if (!normalizedSlug) {
    throw new Error('This business page link is missing a business identifier.');
  }

  const {data, error} = await supabase
    .from(businessPagesTable)
    .select('*')
    .eq('business_slug', normalizedSlug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load this public business page: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      'This business page is not published yet, or the public link is incorrect.'
    );
  }

  return data;
}

async function uploadAsset(file, userId) {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const {error} = await supabase.storage
    .from(assetsBucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw error;
  }

  const {data} = supabase.storage
    .from(assetsBucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function saveBusinessPage(values, existingPage) {
  const {data: userData, error: userError} = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!userData.user) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const imageFiles = values.imageFiles || [];
  const logoFiles = values.clientLogoFiles || [];

  const uploadedImages = imageFiles.length
    ? await Promise.all(
        imageFiles
          .slice(0, 5)
          .map((file) => uploadAsset(file, userData.user.id))
      )
    : values.businessImages || existingPage?.business_images || [];

  const uploadedClientLogos = logoFiles.length
    ? await Promise.all(
        logoFiles
          .slice(0, 8)
          .map((file) => uploadAsset(file, userData.user.id))
      )
    : values.clientLogos || existingPage?.client_logos || [];

  const logoUrl = values.logoFile
    ? await uploadAsset(values.logoFile, userData.user.id)
    : values.logoUrl || existingPage?.logo_url || '';

  const payload = {
    user_id: userData.user.id,
    business_name: values.businessName.trim(),
    business_slug: slugify(values.businessSlug || values.businessName),
    business_category: values.businessCategory.trim(),
    business_address: values.businessAddress.trim(),
    pincode: values.pincode.trim(),
    website_address: values.websiteAddress.trim(),
    office_location_map_link: values.officeLocationMapLink.trim(),
    logo_url: logoUrl,
    business_expertise: values.businessExpertise.trim(),
    about_us: values.aboutUs.trim(),
    services_offered: values.servicesOffered.trim(),
    products: values.products.trim(),
    cater_to: values.caterTo.trim(),
    client_testimonials: normalizeTestimonials(values.clientTestimonials),
    client_logos: uploadedClientLogos.slice(0, 8),
    business_images: uploadedImages.slice(0, 5),
    years_of_experience: Number(values.yearsOfExperience || 0),
    primary_contact_number: values.primaryContactNumber.trim(),
    email_id: values.emailId.trim().toLowerCase(),
    social_facebook: values.socialFacebook.trim(),
    social_instagram: values.socialInstagram.trim(),
    social_x: values.socialX.trim(),
    social_linkedin: values.socialLinkedin.trim(),
    is_published: true,
    updated_at: new Date().toISOString()
  };

  const {data, error} = await supabase
    .from(businessPagesTable)
    .upsert(payload, {onConflict: 'user_id'})
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function businessPageFormValues(page, registrationCategory, user) {
  return {
    businessName: page?.business_name || user?.user_metadata?.business_name || '',
    businessSlug: page?.business_slug || '',
    businessCategory: page?.business_category || registrationCategory || '',
    businessAddress: page?.business_address || '',
    pincode: page?.pincode || '',
    websiteAddress: page?.website_address || '',
    officeLocationMapLink: page?.office_location_map_link || '',
    logoUrl: page?.logo_url || user?.user_metadata?.photo_url || '',
    logoFile: null,
    businessExpertise: page?.business_expertise || '',
    aboutUs: page?.about_us || '',
    servicesOffered: page?.services_offered || '',
    products: page?.products || '',
    caterTo: page?.cater_to || '',
    clientTestimonials: normalizeTestimonials(page?.client_testimonials),
    clientLogos: page?.client_logos || [],
    clientLogoFiles: [],
    businessImages: page?.business_images || [],
    imageFiles: [],
    yearsOfExperience: page?.years_of_experience || 0,
    primaryContactNumber:
      page?.primary_contact_number ||
      user?.user_metadata?.contact_number ||
      '',
    emailId: page?.email_id || user?.email || '',
    socialFacebook: page?.social_facebook || '',
    socialInstagram: page?.social_instagram || '',
    socialX: page?.social_x || '',
    socialLinkedin: page?.social_linkedin || '',
    isPublished: true
  };
}

export {splitLines, slugify, normalizeSlug};