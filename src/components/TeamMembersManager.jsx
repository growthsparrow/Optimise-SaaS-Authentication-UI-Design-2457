import React, {useCallback, useEffect, useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  listTeamMembers,
  saveTeamMember,
  setTeamMemberStatus
} from '../services/teamMemberService';
import './TeamMembers.css';

const {
  FiEdit2,
  FiMail,
  FiPhone,
  FiPlus,
  FiSearch,
  FiUsers
} = FiIcons;

const emptyValues = {
  fullName: '',
  email: '',
  phoneNumber: '',
  role: 'Team member',
  status: 'active'
};

function TeamMembersManager() {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async () => {
    try {
      setMembers(await listTeamMembers());
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const save = async (values, member) => {
    try {
      const saved = await saveTeamMember(values, member);

      setMembers((current) =>
        member
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved]
      );
      setModal(null);
      setNotice(
        member
          ? 'Team member details updated.'
          : `Team member added. Login ID: ${saved.member_id}. Password: registered contact number.`
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const toggleStatus = async (member) => {
    const nextStatus = member.status === 'active' ? 'inactive' : 'active';

    try {
      const updated = await setTeamMemberStatus(member.id, nextStatus);
      setMembers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setNotice(
        nextStatus === 'active'
          ? `${member.full_name} is now active.`
          : `${member.full_name} was marked inactive.`
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const visibleMembers = members.filter((member) =>
    `${member.member_id} ${member.full_name} ${member.email} ${member.role}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <section className="team-members-manager">
      <div className="team-members-toolbar">
        <div>
          <span className="dashboard-eyebrow">Workspace access</span>
          <h2>Manage Team Members</h2>
          <p>
            Each active team member receives a unique OP ID and signs in with
            that ID and their contact number.
          </p>
        </div>
        <button
          className="dashboard-primary"
          type="button"
          onClick={() => setModal({member: null})}
        >
          <SafeIcon icon={FiPlus} />
          Add team member
        </button>
      </div>

      {notice && (
        <div className="team-members-notice" role="status">
          {notice}
        </div>
      )}

      <div className="team-members-filter">
        <SafeIcon icon={FiSearch} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search team members"
          aria-label="Search team members"
        />
      </div>

      {loading ? (
        <div className="team-members-state">Loading team members…</div>
      ) : visibleMembers.length ? (
        <div className="team-members-table-wrap">
          <table className="team-members-table">
            <thead>
              <tr>
                <th>Member ID</th>
                <th>Team member</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>{member.member_id || 'Assigning…'}</strong>
                  </td>
                  <td>
                    <div className="team-member-identity">
                      <span className="team-member-avatar">
                        {member.full_name.slice(0, 1).toUpperCase() || 'T'}
                      </span>
                      <strong>{member.full_name}</strong>
                    </div>
                  </td>
                  <td>
                    <div className="team-member-contact">
                      <span>
                        <SafeIcon icon={FiMail} />
                        {member.email || 'No email provided'}
                      </span>
                      <span>
                        <SafeIcon icon={FiPhone} />
                        {member.phone_number || 'No phone provided'}
                      </span>
                    </div>
                  </td>
                  <td>{member.role}</td>
                  <td>
                    <button
                      className={`team-member-status team-member-status--${member.status}`}
                      type="button"
                      onClick={() => toggleStatus(member)}
                    >
                      {member.status}
                    </button>
                  </td>
                  <td>
                    <button
                      className="team-member-edit"
                      type="button"
                      onClick={() => setModal({member})}
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
        <div className="team-members-state">
          <SafeIcon icon={FiUsers} />
          <h3>No team members yet</h3>
          <p>Add a team member to begin building your workspace directory.</p>
          <button
            className="dashboard-primary"
            type="button"
            onClick={() => setModal({member: null})}
          >
            <SafeIcon icon={FiPlus} />
            Add first team member
          </button>
        </div>
      )}

      {modal && (
        <TeamMemberForm
          member={modal.member}
          onClose={() => setModal(null)}
          onSaved={save}
        />
      )}
    </section>
  );
}

function TeamMemberForm({member, onClose, onSaved}) {
  const [values, setValues] = useState({
    fullName: member?.full_name || emptyValues.fullName,
    email: member?.email || emptyValues.email,
    phoneNumber: member?.phone_number || emptyValues.phoneNumber,
    role: member?.role || emptyValues.role,
    status: member?.status || emptyValues.status
  });
  const [saving, setSaving] = useState(false);

  const update = (key, value) => {
    setValues((current) => ({...current, [key]: value}));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSaved(values, member);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-member-modal-backdrop">
      <section className="team-member-modal" role="dialog" aria-modal="true">
        <header>
          <div>
            <span className="dashboard-eyebrow">Workspace directory</span>
            <h2>{member ? 'Edit team member' : 'Add team member'}</h2>
            <p>
              {member
                ? `Login ID: ${member.member_id}`
                : 'A unique OP ID is generated after saving.'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close form">
            ×
          </button>
        </header>

        <form onSubmit={submit}>
          <label>
            <span>Full name</span>
            <input
              value={values.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              required
            />
          </label>

          <label>
            <span>Email address</span>
            <input
              type="email"
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              required
            />
          </label>

          <label>
            <span>Phone number / password</span>
            <input
              value={values.phoneNumber}
              onChange={(event) =>
                update(
                  'phoneNumber',
                  event.target.value.replace(/\D/g, '').slice(0, 10)
                )
              }
              inputMode="numeric"
              minLength="10"
              maxLength="10"
              pattern="[0-9]{10}"
              placeholder="10-digit contact number"
              required
            />
          </label>

          <label>
            <span>Role</span>
            <input
              value={values.role}
              onChange={(event) => update('role', event.target.value)}
              placeholder="Team member"
              required
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={values.status}
              onChange={(event) => update('status', event.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <footer>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="dashboard-primary" disabled={saving}>
              {saving ? 'Saving…' : member ? 'Save changes' : 'Add member'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default TeamMembersManager;