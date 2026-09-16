import React,{useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AuthShell from '../components/AuthShell';
import PasswordField from '../components/PasswordField';
import businessDomains from '../data/businessDomains';
import supabase from '../supabase/supabase';

const {FiArrowRight,FiBriefcase,FiMail,FiPhone,FiUser}=FiIcons;

function TextField({id,label,icon,type='text',placeholder,autoComplete,...inputProps}) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="input-wrap">
        <SafeIcon icon={icon} className="input-icon" aria-hidden="true"/>
        <input id={id} name={id} type={type} placeholder={placeholder} autoComplete={autoComplete} required {...inputProps}/>
      </span>
    </label>
  );
}

function SignUp() {
  const [notice,setNotice]=useState('');
  const navigate=useNavigate();

  const handleSubmit=async(event)=>{
    event.preventDefault();
    setNotice('');

    const values=new FormData(event.currentTarget);
    const password=values.get('password');
    const confirmPassword=values.get('confirm-password');

    if (password !== confirmPassword) {
      setNotice('Passwords do not match. Please check both fields.');
      return;
    }

    const {data,error}=await supabase.auth.signUp({
      email: values.get('email'),
      password,
      options: {
        data: {
          name: values.get('name'),
          contact_number: values.get('contact-number'),
          business_name: values.get('business-name'),
          business_domain: values.get('business-domain')
        }
      }
    });

    if (error) {
      setNotice(error.message);
      return;
    }

    if (data.session) {
      navigate('/dashboard',{replace:true,state:{activeItem:'My Business Page'}});
      return;
    }

    setNotice('Your account has been created. Please sign in to continue, then complete My Business Page.');
  };

  return (
    <AuthShell alternateText="Already have an account?" alternateLabel="Sign in" alternateTo="/">
      <div className="form-heading">
        <span className="eyebrow eyebrow--dark">Start optimising</span>
        <h2>Create your workspace</h2>
        <p>Set up your business and start organising appointments.</p>
      </div>

      <form className="auth-form auth-form--signup" onSubmit={handleSubmit}>
        <div className="form-grid">
          <TextField id="name" label="Full name" icon={FiUser} placeholder="Your full name" autoComplete="name"/>
          <TextField id="contact-number" label="Contact number" icon={FiPhone} type="tel" placeholder="10-digit phone number" autoComplete="tel" minLength="10" maxLength="10" pattern="[0-9]{10}" inputMode="numeric" title="Enter a 10-digit phone number"/>
          <TextField id="email" label="Email address" icon={FiMail} type="email" placeholder="you@business.com" autoComplete="email"/>
          <TextField id="business-name" label="Business name" icon={FiBriefcase} placeholder="Your business name" autoComplete="organization"/>
        </div>

        <label className="field" htmlFor="business-domain">
          <span>Business domain</span>
          <select id="business-domain" name="business-domain" defaultValue="" required>
            <option value="" disabled>Select your business category</option>
            {businessDomains.map((domain)=><option key={domain}>{domain}</option>)}
          </select>
        </label>

        <div className="form-grid">
          <PasswordField id="password" label="Password" autoComplete="new-password"/>
          <PasswordField id="confirm-password" label="Confirm password" autoComplete="new-password"/>
        </div>

        <label className="consent">
          <input type="checkbox" required/>
          <span>I agree to the <Link to="/terms">Terms of use</Link> and acknowledge the <Link to="/privacy">Privacy policy</Link>.</span>
        </label>

        <button className="primary-button" type="submit">
          Create account <SafeIcon icon={FiArrowRight} aria-hidden="true"/>
        </button>

        {notice && <p className="form-notice" role="status">{notice}</p>}
      </form>
    </AuthShell>
  );
}

export default SignUp;