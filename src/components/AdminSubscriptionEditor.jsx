import React,{useEffect,useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import './AdminSubscriptionEditor.css';

const {FiCalendar,FiCheck,FiX}=FiIcons;

const statuses=[
  {value:'not_subscribed',label:'Not subscribed'},
  {value:'trialing',label:'Trialing'},
  {value:'active',label:'Active'},
  {value:'past_due',label:'Past due'},
  {value:'cancelled',label:'Cancelled'},
  {value:'expired',label:'Expired'}
];

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0,10) : '';
}

function AdminSubscriptionEditor({user,packages,onClose,onSaved}) {
  const [values,setValues]=useState({
    subscriptionPackage:user.subscription_package || '',
    subscriptionStatus:user.subscription_status || 'not_subscribed',
    subscriptionStartDate:toDateInput(user.subscription_start_date),
    subscriptionEndDate:toDateInput(user.subscription_end_date),
    nextRenewalDate:toDateInput(user.next_renewal_date)
  });
  const [saving,setSaving]=useState(false);

  useEffect(()=> {
    setValues({
      subscriptionPackage:user.subscription_package || '',
      subscriptionStatus:user.subscription_status || 'not_subscribed',
      subscriptionStartDate:toDateInput(user.subscription_start_date),
      subscriptionEndDate:toDateInput(user.subscription_end_date),
      nextRenewalDate:toDateInput(user.next_renewal_date)
    });
  },[user]);

  const update=(key,value)=> {
    setValues((current)=> ({...current,[key]:value}));
  };

  const submit=async (event)=> {
    event.preventDefault();
    setSaving(true);

    try {
      await onSaved(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-subscription-editor">
      <div className="admin-subscription-editor__header">
        <div>
          <span className="admin-kicker">Subscription controls</span>
          <h3>{user.full_name || user.email || 'Customer account'}</h3>
          <p>{user.customer_id || user.id}</p>
        </div>
        <button
          type="button"
          className="admin-icon-button"
          onClick={onClose}
          aria-label="Close subscription editor"
        >
          <SafeIcon icon={FiX} />
        </button>
      </div>

      <form onSubmit={submit}>
        <div className="admin-subscription-editor__grid">
          <label>
            <span>Subscribed package</span>
            <select
              value={values.subscriptionPackage}
              onChange={(event)=> update(
                'subscriptionPackage',
                event.target.value
              )}
            >
              <option value="">Not subscribed</option>
              {packages.map((packageItem)=> (
                <option value={packageItem.name} key={packageItem.id}>
                  {packageItem.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Subscription status</span>
            <select
              value={values.subscriptionStatus}
              onChange={(event)=> update(
                'subscriptionStatus',
                event.target.value
              )}
            >
              {statuses.map((status)=> (
                <option value={status.value} key={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>

          <DateField
            label="Subscription start date"
            value={values.subscriptionStartDate}
            onChange={(value)=> update('subscriptionStartDate',value)}
          />
          <DateField
            label="Subscription end date"
            value={values.subscriptionEndDate}
            onChange={(value)=> update('subscriptionEndDate',value)}
          />
          <DateField
            label="Next renewal date"
            value={values.nextRenewalDate}
            onChange={(value)=> update('nextRenewalDate',value)}
          />
        </div>

        <div className="admin-subscription-editor__actions">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="admin-primary-button"
            disabled={saving}
          >
            <SafeIcon icon={FiCheck} />
            {saving ? 'Saving…' : 'Save subscription'}
          </button>
        </div>
      </form>
    </div>
  );
}

function DateField({label,value,onChange}) {
  return (
    <label>
      <span>{label}</span>
      <span className="admin-subscription-date-input">
        <SafeIcon icon={FiCalendar} />
        <input
          type="date"
          value={value}
          onChange={(event)=> onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

export default AdminSubscriptionEditor;