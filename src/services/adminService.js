import supabase from '../supabase/supabase';

const profilesTable = 'user_profiles_1789400000000';
const adminsTable = 'super_admins_1789400000000';
const packagesTable = 'subscription_packages_1789400000000';

export async function isSuperAdmin() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const email = userData.user?.email?.toLowerCase();

  if (!email) {
    return false;
  }

  const { data, error } = await supabase
    .from(adminsTable)
    .select('email,is_enabled')
    .eq('email', email)
    .eq('is_enabled', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function isUserEnabled() {
  const { data, error } = await supabase.rpc(
    'is_user_enabled_1789401000000'
  );

  if (error) {
    throw error;
  }

  return data === true;
}

export async function listUsers() {
  const { data, error } = await supabase
    .from(profilesTable)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function setUserEnabled(userId, isEnabled) {
  const { data, error } = await supabase
    .from(profilesTable)
    .update({
      is_enabled: isEnabled,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listPackages() {
  const { data, error } = await supabase
    .from(packagesTable)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function savePackage(values, existingPackage) {
  const payload = {
    name: values.name.trim(),
    description: values.description.trim(),
    price_inr: Number(values.priceInr || 0),
    billing_period: values.billingPeriod,
    features: values.features
      .split('\n')
      .map((feature) => feature.trim())
      .filter(Boolean),
    is_published: values.isPublished,
    updated_at: new Date().toISOString()
  };

  const query = existingPackage
    ? supabase
        .from(packagesTable)
        .update(payload)
        .eq('id', existingPackage.id)
        .select()
        .single()
    : supabase
        .from(packagesTable)
        .insert(payload)
        .select()
        .single();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function setPackagePublished(packageId, isPublished) {
  const { data, error } = await supabase
    .from(packagesTable)
    .update({
      is_published: isPublished,
      updated_at: new Date().toISOString()
    })
    .eq('id', packageId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}