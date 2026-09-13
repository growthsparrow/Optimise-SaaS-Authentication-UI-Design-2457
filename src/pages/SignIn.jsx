import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AuthShell from '../components/AuthShell';
import PasswordField from '../components/PasswordField';
import supabase from '../supabase/supabase';
import {
  authenticateTeamMember,
  saveTeamMemberSession
} from '../services/teamMemberService';

const {FiArrowRight, FiKey, FiMail, FiUser} = FiIcons;

function SignIn() {
  const [memberMode, setMemberMode] = useState(false);
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  const handleOwnerSubmit = async (event) => {
    event.preventDefault();
    setNotice('');

    const values = new FormData(event.currentTarget);
    const {error} = await supabase.auth.signInWithPassword({
      email: values.get('email'),
      password: values.get('password')
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    navigate('/dashboard');
  };

  const handleMemberSubmit = async (event) => {
    event.preventDefault();
    setNotice('');

    const values = new FormData(event.currentTarget);

    try {
      const member = await authenticateTeamMember(
        values.get('member-id'),
        values.get('member-password')
      );

      saveTeamMemberSession(member);
      navigate('/dashboard');
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <AuthShell
      alternateText="New to Optimise?"
      alternateLabel="Create an account"
      alternateTo="/sign-up"
    >
      <div className="form-heading">
        <span className="eyebrow eyebrow--dark">
          {memberMode ? 'Team access' : 'Welcome back'}
        </span>
        <h2>{memberMode ? 'Team member sign in' : 'Sign in to Optimise'}</h2>
        <p>
          {memberMode
            ? 'Use your OP member ID and registered contact number.'
            : 'Manage your schedule, customers and team from one place.'}
        </p>
      </div>

      {memberMode ? (
        <form className="auth-form" onSubmit={handleMemberSubmit}>
          <label className="field" htmlFor="member-id">
            <span>Member ID</span>
            <span className="input-wrap">
              <SafeIcon
                icon={FiUser}
                className="input-icon"
                aria-hidden="true"
              />
              <input
                id="member-id"
                name="member-id"
                placeholder="OP2345"
                autoComplete="username"
                pattern="OP[0-9]{4}"
                title="Enter an ID such as OP2345"
                required
              />
            </span>
          </label>

          <label className="field" htmlFor="member-password">
            <span>Contact number</span>
            <span className="input-wrap">
              <SafeIcon
                icon={FiKey}
                className="input-icon"
                aria-hidden="true"
              />
              <input
                id="member-password"
                name="member-password"
                type="password"
                inputMode="numeric"
                maxLength="10"
                placeholder="Registered contact number"
                autoComplete="current-password"
                required
              />
            </span>
          </label>

          <button className="primary-button" type="submit">
            Sign in as team member
            <SafeIcon icon={FiArrowRight} aria-hidden="true" />
          </button>

          <button
            className="text-button"
            type="button"
            onClick={() => {
              setMemberMode(false);
              setNotice('');
            }}
          >
            Sign in as workspace owner
          </button>

          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleOwnerSubmit}>
          <label className="field" htmlFor="email">
            <span>Email address</span>
            <span className="input-wrap">
              <SafeIcon
                icon={FiMail}
                className="input-icon"
                aria-hidden="true"
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@business.com"
                required
              />
            </span>
          </label>

          <PasswordField id="password" label="Password" />

          <button className="text-button" type="button">
            Forgot password?
          </button>

          <button className="primary-button" type="submit">
            Sign in
            <SafeIcon icon={FiArrowRight} aria-hidden="true" />
          </button>

          <button
            className="text-button"
            type="button"
            onClick={() => {
              setMemberMode(true);
              setNotice('');
            }}
          >
            Sign in as team member
          </button>

          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
        </form>
      )}
    </AuthShell>
  );
}

export default SignIn;