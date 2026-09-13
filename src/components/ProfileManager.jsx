import React,{useEffect,useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import supabase from '../supabase/supabase';
import {requestEmailChange,updatePassword,updateProfile,uploadProfilePhoto} from '../services/profileService';
import './ProfileManager.css';

const {FiCamera,FiLock,FiMail,FiSave,FiUser}=FiIcons;

function ProfileManager() {
  const [user,setUser]=useState(null);
  const [values,setValues]=useState({
    name: '',
    businessName: '',
    contactNumber: '',
    photoUrl: ''
  });
  const [passwords,setPasswords]=useState({password: '',confirmPassword: ''});
  const [emailRequest,setEmailRequest]=useState({requestedEmail: '',message: ''});
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  useEffect(()=> {
    supabase.auth.getUser().then(({data})=> {
      const currentUser=data.user;
      const metadata=currentUser?.user_metadata || {};

      setUser(currentUser);
      setValues({
        name: metadata.name || '',
        businessName: metadata.business_name || '',
        contactNumber: metadata.contact_number || '',
        photoUrl: metadata.photo_url || ''
      });
    });
  },[]);

  const updateValue=(key,value)=> {
    setValues((current)=> ({...current,[key]: value}));
  };

  const handleProfileSave=async (event)=> {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    setError('');

    try {
      const updated=await updateProfile(values);
      setUser(updated);
      setNotice('Profile details saved.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto=async (event)=> {
    const file=event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    setSaving(true);
    setNotice('');
    setError('');

    try {
      const photoUrl=await uploadProfilePhoto(file,user.id);
      const updated=await updateProfile({...values,photoUrl});
      setValues((current)=> ({...current,photoUrl}));
      setUser(updated);
      setNotice('Profile photo updated.');
    } catch (photoError) {
      setError(photoError.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave=async (event)=> {
    event.preventDefault();
    setNotice('');
    setError('');

    if (passwords.password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (passwords.password !==passwords.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await updatePassword(passwords.password);
      setPasswords({password: '',confirmPassword: ''});
      setNotice('Password updated successfully.');
    } catch (passwordError) {
      setError(passwordError.message);
    }
  };

  const handleEmailRequest=async (event)=> {
    event.preventDefault();
    setNotice('');
    setError('');

    try {
      await requestEmailChange(emailRequest,user.email);
      setEmailRequest({requestedEmail: '',message: ''});
      setNotice('Your email change request has been submitted for review.');
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className="profile-manager">
      <div className="profile-toolbar">
        <div>
          <span className="dashboard-eyebrow">Workspace settings</span>
          <h2>Profile management</h2>
          <p>Update your identity and workspace details.</p>
        </div>
      </div>

      {(notice || error) && (
        <div className={error ? 'profile-notice profile-notice--error' : 'profile-notice'}>
          {error || notice}
        </div>
      )}

      <form className="profile-card profile-card--identity" onSubmit={handleProfileSave}>
        <div className="profile-card__heading">
          <div className="profile-heading-icon">
            <SafeIcon icon={FiUser} />
          </div>
          <div>
            <h3>Profile details</h3>
            <p>These details identify your workspace.</p>
          </div>
        </div>

        <div className="profile-photo-row">
          <div className="profile-avatar">
            {values.photoUrl ? (
              <img src={values.photoUrl} alt="" />
            ) : (
              <SafeIcon icon={FiUser} />
            )}
          </div>

          <label className="profile-photo-button">
            <SafeIcon icon={FiCamera} /> Change photo
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </label>
        </div>

        <div className="profile-grid">
          <label className="profile-field">
            <span>Name</span>
            <input value={values.name} onChange={(event)=> updateValue('name',event.target.value)} required />
          </label>

          <label className="profile-field">
            <span>Business name</span>
            <input value={values.businessName} onChange={(event)=> updateValue('businessName',event.target.value)} required />
          </label>

          <label className="profile-field">
            <span>Contact number</span>
            <input
              value={values.contactNumber}
              onChange={(event)=> updateValue('contactNumber',event.target.value.replace(/\D/g,'').slice(0,10))}
              inputMode="numeric"
              maxLength="10"
            />
          </label>

          <label className="profile-field">
            <span>Registration email</span>
            <span className="profile-readonly">
              <SafeIcon icon={FiMail} /> {user?.email || 'Loading email'}
            </span>
            <small>Email cannot be edited here.</small>
          </label>
        </div>

        <div className="profile-card__footer">
          <button className="dashboard-primary" disabled={saving}>
            <SafeIcon icon={FiSave} /> {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <form className="profile-card" onSubmit={handlePasswordSave}>
        <div className="profile-card__heading">
          <div className="profile-heading-icon">
            <SafeIcon icon={FiLock} />
          </div>
          <div>
            <h3>Change password</h3>
            <p>Use a strong password with at least 8 characters.</p>
          </div>
        </div>

        <div className="profile-grid">
          <label className="profile-field">
            <span>New password</span>
            <input
              type="password"
              value={passwords.password}
              onChange={(event)=> setPasswords({...passwords,password: event.target.value})}
              minLength="8"
              required
            />
          </label>

          <label className="profile-field">
            <span>Confirm new password</span>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(event)=> setPasswords({...passwords,confirmPassword: event.target.value})}
              minLength="8"
              required
            />
          </label>
        </div>

        <div className="profile-card__footer">
          <button className="dashboard-primary">
            <SafeIcon icon={FiLock} /> Update password
          </button>
        </div>
      </form>

      <form className="profile-card" onSubmit={handleEmailRequest}>
        <div className="profile-card__heading">
          <div className="profile-heading-icon">
            <SafeIcon icon={FiMail} />
          </div>
          <div>
            <h3>Request email change</h3>
            <p>Your registration email stays locked for account security.</p>
          </div>
        </div>

        <div className="profile-grid">
          <label className="profile-field">
            <span>Requested email</span>
            <input
              type="email"
              value={emailRequest.requestedEmail}
              onChange={(event)=> setEmailRequest({...emailRequest,requestedEmail: event.target.value})}
              required
            />
          </label>

          <label className="profile-field">
            <span>Reason or note</span>
            <input
              value={emailRequest.message}
              onChange={(event)=> setEmailRequest({...emailRequest,message: event.target.value})}
              placeholder="Optional"
            />
          </label>
        </div>

        <div className="profile-card__footer">
          <button className="dashboard-primary">
            <SafeIcon icon={FiMail} /> Submit request
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProfileManager;