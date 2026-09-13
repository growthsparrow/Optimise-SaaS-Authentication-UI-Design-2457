import React,{useEffect,useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  getAdminProfile,
  updateAdminPassword,
  updateAdminProfile
} from '../services/adminService';
import './AdminProfileManager.css';

const {FiCheckCircle,FiLock,FiMail,FiSave,FiShield,FiUser}=FiIcons;

function AdminProfileManager() {
  const [profile,setProfile]=useState(null);
  const [name,setName]=useState('');
  const [passwords,setPasswords]=useState({
    password:'',
    confirmPassword:''
  });
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [savingProfile,setSavingProfile]=useState(false);
  const [savingPassword,setSavingPassword]=useState(false);

  useEffect(()=> {
    getAdminProfile()
      .then((user)=> {
        setProfile(user);
        setName(user?.user_metadata?.name || '');
      })
      .catch((profileError)=> setError(profileError.message));
  },[]);

  const saveProfile=async (event)=> {
    event.preventDefault();
    setSavingProfile(true);
    setNotice('');
    setError('');

    try {
      const updated=await updateAdminProfile({name});
      setProfile(updated);
      setNotice('Administrator profile updated successfully.');
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword=async (event)=> {
    event.preventDefault();
    setNotice('');
    setError('');

    if (passwords.password.length<8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (passwords.password!==passwords.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSavingPassword(true);

    try {
      await updateAdminPassword(passwords.password);
      setPasswords({password:'',confirmPassword:''});
      setNotice('Administrator password updated successfully.');
    } catch (passwordError) {
      setError(passwordError.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section className="admin-profile-manager">
      <div className="admin-section-intro">
        <span className="admin-kicker">Security and identity</span>
        <h2>Profile management</h2>
        <p>
          Update the administrator identity shown in the control center and
          keep account access protected.
        </p>
      </div>

      {(notice || error) && (
        <p className={error ? 'admin-profile-notice admin-profile-notice--error' : 'admin-profile-notice'}>
          {error || notice}
        </p>
      )}

      <div className="admin-profile-grid">
        <form className="admin-profile-card" onSubmit={saveProfile}>
          <div className="admin-profile-card__heading">
            <span className="admin-profile-icon">
              <SafeIcon icon={FiUser} />
            </span>
            <div>
              <h3>Administrator details</h3>
              <p>Manage the profile information used by this portal.</p>
            </div>
          </div>

          <label className="admin-profile-field">
            <span>Display name</span>
            <input
              value={name}
              onChange={(event)=> setName(event.target.value)}
              placeholder="Super administrator"
              required
            />
          </label>

          <label className="admin-profile-field">
            <span>Administrator email</span>
            <span className="admin-profile-readonly">
              <SafeIcon icon={FiMail} />
              {profile?.email || 'Loading email…'}
            </span>
            <small>Email is managed by the secure authentication account.</small>
          </label>

          <div className="admin-profile-meta">
            <SafeIcon icon={FiShield} />
            <span>Super administrator access is enabled for this account.</span>
          </div>

          <button className="admin-primary-button" disabled={savingProfile}>
            <SafeIcon icon={savingProfile ? FiSave : FiCheckCircle} />
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        <form className="admin-profile-card" onSubmit={savePassword}>
          <div className="admin-profile-card__heading">
            <span className="admin-profile-icon">
              <SafeIcon icon={FiLock} />
            </span>
            <div>
              <h3>Update password</h3>
              <p>Use a strong password with at least 8 characters.</p>
            </div>
          </div>

          <label className="admin-profile-field">
            <span>New password</span>
            <input
              type="password"
              minLength="8"
              value={passwords.password}
              onChange={(event)=> setPasswords((current)=> ({
                ...current,
                password:event.target.value
              }))}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="admin-profile-field">
            <span>Confirm new password</span>
            <input
              type="password"
              minLength="8"
              value={passwords.confirmPassword}
              onChange={(event)=> setPasswords((current)=> ({
                ...current,
                confirmPassword:event.target.value
              }))}
              autoComplete="new-password"
              required
            />
          </label>

          <button className="admin-primary-button" disabled={savingPassword}>
            <SafeIcon icon={savingPassword ? FiSave : FiLock} />
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AdminProfileManager;