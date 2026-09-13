import adminSupabase from '../supabase/adminSupabase';
import supabase from '../supabase/supabase';

const profilesTable='user_profiles_1789400000000';
const adminsTable='super_admins_1789400000000';
const packagesTable='subscription_packages_1789400000000';
const customerIdsTable='customer_ids_1789307150923';
const teamMembersTable='team_members_1789325000000';

export async function isSuperAdmin() {
  const {data:userData,error:userError}=await adminSupabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  const email=userData.user?.email?.toLowerCase();

  if (!email) {
    return false;
  }

  const {data,error}=await adminSupabase
    .from(adminsTable)
    .select('email,is_enabled')
    .eq('email',email)
    .eq('is_enabled',true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function isUserEnabled() {
  const {data,error}=await supabase.rpc(
    'is_user_enabled_1789401000000'
  );

  if (error) {
    throw error;
  }

  return data===true;
}

export async function listUsers() {
  const [
    {data:profiles,error:profilesError},
    {data:customerIds,error:customerIdsError}
  ]=await Promise.all([
    adminSupabase
      .from(profilesTable)
      .select('*')
      .order('created_at',{ascending:false}),
    adminSupabase
      .from(customerIdsTable)
      .select('id,customer_id')
  ]);

  if (profilesError) {
    throw profilesError;
  }

  if (customerIdsError) {
    throw customerIdsError;
  }

  const customerIdByUserId=new Map(
    (customerIds || []).map((row)=> [row.id,row.customer_id])
  );

  return (profiles || []).map((profile)=> {
    const customerId=customerIdByUserId.get(profile.id) || '';

    return {
      ...profile,
      user_code:profile.user_code || customerId || 'Not assigned',
      customer_id:customerId || profile.user_code || 'Not assigned'
    };
  });
}

export async function setUserEnabled(userId,isEnabled) {
  const {data,error}=await adminSupabase
    .from(profilesTable)
    .update({
      is_enabled:isEnabled,
      updated_at:new Date().toISOString()
    })
    .eq('id',userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateUserSubscription(userId,values) {
  const payload={
    subscription_package:values.subscriptionPackage?.trim() || '',
    subscription_status:values.subscriptionStatus || 'not_subscribed',
    subscription_start_date:values.subscriptionStartDate || null,
    subscription_end_date:values.subscriptionEndDate || null,
    next_renewal_date:values.nextRenewalDate || null,
    updated_at:new Date().toISOString()
  };

  const {data,error}=await adminSupabase
    .from(profilesTable)
    .update(payload)
    .eq('id',userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listPackages() {
  const {data,error}=await adminSupabase
    .from(packagesTable)
    .select('*')
    .order('created_at',{ascending:false});

  if (error) {
    throw error;
  }

  return data || [];
}

export async function savePackage(values,existingPackage) {
  const payload={
    name:values.name.trim(),
    description:values.description.trim(),
    price_inr:Number(values.priceInr || 0),
    billing_period:values.billingPeriod,
    features:values.features
      .split('\n')
      .map((feature)=> feature.trim())
      .filter(Boolean),
    is_published:values.isPublished,
    updated_at:new Date().toISOString()
  };

  const query=existingPackage
    ? adminSupabase
      .from(packagesTable)
      .update(payload)
      .eq('id',existingPackage.id)
      .select()
      .single()
    : adminSupabase
      .from(packagesTable)
      .insert(payload)
      .select()
      .single();

  const {data,error}=await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function setPackagePublished(packageId,isPublished) {
  const {data,error}=await adminSupabase
    .from(packagesTable)
    .update({
      is_published:isPublished,
      updated_at:new Date().toISOString()
    })
    .eq('id',packageId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAdminProfile() {
  const {data,error}=await adminSupabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}

export async function updateAdminProfile(values) {
  const {data,error}=await adminSupabase.auth.updateUser({
    data:{
      name:values.name.trim(),
      role:'Super administrator'
    }
  });

  if (error) {
    throw error;
  }

  return data.user;
}

export async function updateAdminPassword(password) {
  const {error}=await adminSupabase.auth.updateUser({password});

  if (error) {
    throw error;
  }
}

export async function listAdminTeamMembers() {
  const {data,error}=await adminSupabase
    .from(teamMembersTable)
    .select('*')
    .order('full_name');

  if (error) {
    throw error;
  }

  return data || [];
}

export async function saveAdminTeamMember(values,existingMember) {
  const payload={
    user_id:values.workspaceUserId,
    full_name:values.fullName.trim(),
    email:values.email.trim().toLowerCase(),
    phone_number:values.phoneNumber.trim(),
    role:values.role.trim() || 'Team member',
    status:values.status,
    updated_at:new Date().toISOString()
  };

  const query=existingMember
    ? adminSupabase
      .from(teamMembersTable)
      .update(payload)
      .eq('id',existingMember.id)
      .select()
      .single()
    : adminSupabase
      .from(teamMembersTable)
      .insert(payload)
      .select()
      .single();

  const {data,error}=await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function setAdminTeamMemberStatus(memberId,status) {
  const {data,error}=await adminSupabase
    .from(teamMembersTable)
    .update({
      status,
      updated_at:new Date().toISOString()
    })
    .eq('id',memberId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutAdmin() {
  await adminSupabase.auth.signOut();
}