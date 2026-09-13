import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AuthShell from '../components/AuthShell';
import PasswordField from '../components/PasswordField';
import supabase from '../supabase/supabase';

const { FiArrowRight, FiMail } = FiIcons;

function SignIn() {
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice('');

    const values = new FormData(event.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.get('email'),
      password: values.get('password')
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <AuthShell alternateText="New to Optimise?" alternateLabel="Create an account" alternateTo="/sign-up">
      <div className="form-heading">
        <span className="eyebrow eyebrow--dark">Welcome back</span>
        <h2>Sign in to Optimise</h2>
        <p>Manage your schedule, customers and team from one place.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field" htmlFor="email">
          <span>Email address</span>
          <span className="input-wrap">
            <SafeIcon icon={FiMail} className="input-icon" aria-hidden="true" />
            <input id="email" name="email" type="email" autoComplete="email" placeholder="you@business.com" required />
          </span>
        </label>

        <PasswordField id="password" label="Password" />
        <button className="text-button" type="button">Forgot password?</button>

        <button className="primary-button" type="submit">
          Sign in <SafeIcon icon={FiArrowRight} aria-hidden="true" />
        </button>

        {notice && <p className="form-notice" role="status">{notice}</p>}
      </form>
    </AuthShell>
  );
}

export default SignIn;