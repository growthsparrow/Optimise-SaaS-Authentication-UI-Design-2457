import React,{useState} from 'react';
import {useLocation,useNavigate} from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import adminSupabase from '../supabase/adminSupabase';
import {isSuperAdmin} from '../services/adminService';
import './Admin.css';

const {FiArrowRight,FiLock,FiShield}=FiIcons;

function AdminSignIn() {
  const navigate=useNavigate();
  const location=useLocation();
  const [values,setValues]=useState({
    email:'satish@growthsparrow.com',
    password:''
  });
  const [notice,setNotice]=useState('');
  const [saving,setSaving]=useState(false);

  const update=(key,value)=> {
    setValues((current)=> ({...current,[key]:value}));
    setNotice('');
  };

  const submit=async (event)=> {
    event.preventDefault();
    setSaving(true);
    setNotice('');

    const {error}=await adminSupabase.auth.signInWithPassword(values);

    if (error) {
      setNotice(error.message);
      setSaving(false);
      return;
    }

    try {
      const allowed=await isSuperAdmin();

      if (!allowed) {
        await adminSupabase.auth.signOut();
        setNotice('This account does not have super administrator access.');
        return;
      }

      navigate(
        location.state?.from?.pathname || '/gsadmin/admin-dashboard',
        {replace:true}
      );
    } catch (accessError) {
      await adminSupabase.auth.signOut();
      setNotice(accessError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-visual">
        <span className="admin-brand-mark">
          <SafeIcon icon={FiShield} />
        </span>
        <span className="admin-kicker">Growth Sparrow control center</span>
        <h1>
          Operate every Optimise workspace from one calm command center.
        </h1>
        <p>
          Review new accounts,control access,and publish subscription packages
          without leaving your administrator workspace.
        </p>
      </section>

      <section className="admin-auth-card">
        <div className="admin-auth-card__heading">
          <span className="admin-kicker">Super administrator</span>
          <h2>Welcome back</h2>
          <p>Sign in with your Growth Sparrow administrator account.</p>
        </div>

        <form className="admin-form" onSubmit={submit}>
          <label>
            <span>Email address</span>
            <input
              type="email"
              value={values.email}
              onChange={(event)=> update('email',event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <span className="admin-password-wrap">
              <SafeIcon icon={FiLock} />
              <input
                type="password"
                value={values.password}
                onChange={(event)=> update('password',event.target.value)}
                autoComplete="current-password"
                required
              />
            </span>
          </label>

          <button className="admin-primary-button" disabled={saving}>
            <SafeIcon icon={FiArrowRight} />
            {saving ? 'Signing in…' : 'Enter admin dashboard'}
          </button>

          {notice && (
            <p className="admin-notice admin-notice--error" role="status">
              {notice}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

export default AdminSignIn;