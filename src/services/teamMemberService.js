import supabase from '../supabase/supabase';

const teamMembersTable = 'team_members_1789325000000';

export async function listTeamMembers() {
  const {data, error} = await supabase
    .from(teamMembersTable)
    .select('*')
    .order('full_name');

  if (error) {
    throw error;
  }

  return data || [];
}

export async function saveTeamMember(values, existingMember) {
  const payload = {
    full_name: values.fullName.trim(),
    email: values.email.trim().toLowerCase(),
    phone_number: values.phoneNumber.trim(),
    role: values.role.trim() || 'Team member',
    status: values.status,
    updated_at: new Date().toISOString()
  };

  const query = existingMember
    ? supabase
        .from(teamMembersTable)
        .update(payload)
        .eq('id', existingMember.id)
        .select()
        .single()
    : supabase
        .from(teamMembersTable)
        .insert(payload)
        .select()
        .single();

  const {data, error} = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function setTeamMemberStatus(memberId, status) {
  const {data, error} = await supabase
    .from(teamMembersTable)
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function authenticateTeamMember(memberId, password) {
  const {data, error} = await supabase.rpc(
    'authenticate_team_member_1789330000000',
    {
      member_id_value: memberId,
      password_value: password
    }
  );

  if (error) {
    throw error;
  }

  const member = data?.[0];

  if (!member) {
    throw new Error('Invalid member ID, contact number, or inactive account.');
  }

  return member;
}

export function saveTeamMemberSession(member) {
  sessionStorage.setItem('optimise_team_member', JSON.stringify(member));
}

export function getTeamMemberSession() {
  try {
    return JSON.parse(sessionStorage.getItem('optimise_team_member') || 'null');
  } catch {
    return null;
  }
}

export function clearTeamMemberSession() {
  sessionStorage.removeItem('optimise_team_member');
}