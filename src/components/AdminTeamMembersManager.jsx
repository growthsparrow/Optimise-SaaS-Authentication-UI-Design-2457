import React,{useCallback,useEffect,useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  listAdminTeamMembers,
  listUsers,
  saveAdminTeamMember,
  setAdminTeamMemberStatus
} from '../services/adminService';
import './AdminTeamMembersManager.css';

const {FiEdit2,FiMail,FiPhone,FiPlus,FiSearch,FiUsers}=FiIcons;

const emptyValues={
  workspaceUserId:'',
  fullName:'',
  email:'',
  phoneNumber:'',
  role:'Team member',
  status:'active'
};

function AdminTeamMembersManager() {
  const [members,setMembers]=useState([]);
  const [users,setUsers]=useState([]);
  const [query,setQuery]=useState('');
  const [editor,setEditor]=useState(null);
  const [notice,setNotice]=useState('');
  const [loading,setLoading]=useState(true);

  const loadData=useCallback(async ()=> {
    try {
      const [memberRows,userRows]=await Promise.all([
        listAdminTeamMembers(),
        listUsers()
      ]);
      setMembers(memberRows);
      setUsers(userRows);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(()=> {
    loadData();
  },[loadData]);

  const save=async (values,member)=> {
    try {
      const saved=await saveAdminTeamMember(values,member);

      setMembers((current)=> member
        ? current.map((item)=> item.id===saved.id ? saved : item)
        : [...current,saved]
      );
      setEditor(null);
      setNotice(
        member
          ? 'Team member details updated.'
          : `Team member added. Login ID: ${saved.member_id}.`
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const toggleStatus=async (member)=> {
    const nextStatus=member.status==='active' ? 'inactive' : 'active';

    try {
      const updated=await setAdminTeamMemberStatus(member.id,nextStatus);

      setMembers((current)=> current.map((item)=>
        item.id===updated.id ? updated : item
      ));
      setNotice(
        nextStatus==='active'
          ? `${member.full_name} is now active.`
          : `${member.full_name} is now inactive.`
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const visibleMembers=members.filter((member)=>
    `${member.member_id} ${member.full_name} ${member.email} ${member.role}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <section className="admin-team-manager">
      <div className="admin-section-intro">
        <span className="admin-kicker">Workspace access</span>
        <h2>Team members</h2>
        <p>
          Create and manage team access across customer workspaces. Team
          members sign in with their OP ID and registered contact number.
        </p>
      </div>

      {notice && (
        <div className="admin-team-notice" role="status">{notice}</div>
      )}

      <div className="admin-team-toolbar">
        <label className="admin-team-search">
          <SafeIcon icon={FiSearch} />
          <input
            value={query}
            onChange={(event)=> setQuery(event.target.value)}
            placeholder="Search team members"
            aria-label="Search team members"
          />
        </label>

        <button
          className="admin-primary-button"
          type="button"
          onClick={()=> setEditor({member:null})}
        >
          <SafeIcon icon={FiPlus} />
          Add team member
        </button>
      </div>

      {loading ? (
        <div className="admin-team-state">Loading team members…</div>
      ) : visibleMembers.length ? (
        <div className="admin-team-table-wrap">
          <table className="admin-team-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Team member</th>
                <th>Workspace</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member)=> (
                <tr key={member.id}>
                  <td>
                    <strong className="admin-team-id">
                      {member.member_id || 'Assigning…'}
                    </strong>
                  </td>
                  <td>
                    <strong>{member.full_name}</strong>
                    <small>{member.email}</small>
                  </td>
                  <td>
                    {users.find((user)=> user.id===member.user_id)?.business_name ||
                      'Workspace unavailable'}
                  </td>
                  <td>
                    <span className="admin-team-contact">
                      <FiPhone />
                      {member.phone_number || 'Not provided'}
                    </span>
                    <span className="admin-team-contact">
                      <FiMail />
                      {member.email || 'Not provided'}
                    </span>
                  </td>
                  <td>{member.role}</td>
                  <td>
                    <button
                      className={`admin-team-status admin-team-status--${member.status}`}
                      type="button"
                      onClick={()=> toggleStatus(member)}
                    >
                      {member.status}
                    </button>
                  </td>
                  <td>
                    <button
                      className="admin-team-edit"
                      type="button"
                      onClick={()=> setEditor({member})}
                    >
                      <SafeIcon icon={FiEdit2} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-team-state">
          <SafeIcon icon={FiUsers} />
          <h3>No team members yet</h3>
          <p>Add a team member to begin managing workspace access.</p>
        </div>
      )}

      {editor && (
        <AdminTeamMemberForm
          member={editor.member}
          users={users}
          onClose={()=> setEditor(null)}
          onSaved={save}
        />
      )}
    </section>
  );
}

function AdminTeamMemberForm({member,users,onClose,onSaved}) {
  const [values,setValues]=useState({
    workspaceUserId:member?.user_id || '',
    fullName:member?.full_name || emptyValues.fullName,
    email:member?.email || emptyValues.email,
    phoneNumber:member?.phone_number || emptyValues.phoneNumber,
    role:member?.role || emptyValues.role,
    status:member?.status || emptyValues.status
  });
  const [saving,setSaving]=useState(false);

  const update=(key,value)=> {
    setValues((current)=> ({...current,[key]:value}));
  };

  const submit=async (event)=> {
    event.preventDefault();

    if (!values.workspaceUserId) {
      return;
    }

    setSaving(true);

    try {
      await onSaved(values,member);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-team-editor">
      <div className="admin-team-editor__heading">
        <div>
          <span className="admin-kicker">Workspace directory</span>
          <h3>{member ? 'Edit team member' : 'Add team member'}</h3>
        </div>
        <button type="button" onClick={onClose}>×</button>
      </div>

      <form onSubmit={submit}>
        <label>
          <span>Workspace owner</span>
          <select
            value={values.workspaceUserId}
            onChange={(event)=> update('workspaceUserId',event.target.value)}
            required
          >
            <option value="">Select a workspace</option>
            {users.map((user)=> (
              <option value={user.id} key={user.id}>
                {user.business_name || user.full_name || user.email}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Full name</span>
          <input
            value={values.fullName}
            onChange={(event)=> update('fullName',event.target.value)}
            required
          />
        </label>

        <label>
          <span>Email address</span>
          <input
            type="email"
            value={values.email}
            onChange={(event)=> update('email',event.target.value)}
            required
          />
        </label>

        <label>
          <span>Contact number / password</span>
          <input
            value={values.phoneNumber}
            onChange={(event)=> update(
              'phoneNumber',
              event.target.value.replace(/\D/g,'').slice(0,10)
            )}
            minLength="10"
            maxLength="10"
            pattern="[0-9]{10}"
            inputMode="numeric"
            required
          />
          <small>The registered contact number is used as the team member sign-in password.</small>
        </label>

        <label>
          <span>Role</span>
          <input
            value={values.role}
            onChange={(event)=> update('role',event.target.value)}
            required
          />
        </label>

        <label>
          <span>Status</span>
          <select
            value={values.status}
            onChange={(event)=> update('status',event.target.value)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <footer>
          <button type="button" onClick={onClose}>Cancel</button>
          <button className="admin-primary-button" disabled={saving}>
            {saving ? 'Saving…' : member ? 'Save changes' : 'Add member'}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default AdminTeamMembersManager;