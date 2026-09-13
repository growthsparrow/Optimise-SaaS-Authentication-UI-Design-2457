import React, { useEffect, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiCheck, FiX } = FiIcons;

function AdminPackageForm({ packageItem, onClose, onSaved }) {
  const [values, setValues] = useState({
    name: packageItem?.name || '',
    description: packageItem?.description || '',
    priceInr: packageItem?.price_inr || '',
    billingPeriod: packageItem?.billing_period || 'monthly',
    features: packageItem?.features?.join('\n') || '',
    isPublished: packageItem?.is_published || false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues({
      name: packageItem?.name || '',
      description: packageItem?.description || '',
      priceInr: packageItem?.price_inr || '',
      billingPeriod: packageItem?.billing_period || 'monthly',
      features: packageItem?.features?.join('\n') || '',
      isPublished: packageItem?.is_published || false
    });
  }, [packageItem]);

  const update = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      await onSaved(values, packageItem);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="admin-editor">
      <div className="admin-editor__heading">
        <div>
          <span className="admin-kicker">Package editor</span>
          <h3>{packageItem ? 'Edit package' : 'Create package'}</h3>
        </div>
        <button type="button" className="admin-icon-button" onClick={onClose}>
          <SafeIcon icon={FiX} />
        </button>
      </div>

      <form className="admin-package-form" onSubmit={submit}>
        <label>
          <span>Package name</span>
          <input
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Growth"
            required
          />
        </label>

        <label>
          <span>Description</span>
          <textarea
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Everything a growing team needs."
            rows="3"
            required
          />
        </label>

        <div className="admin-form-grid">
          <label>
            <span>Price in INR</span>
            <input
              type="number"
              min="0"
              value={values.priceInr}
              onChange={(event) => update('priceInr', event.target.value)}
              required
            />
          </label>

          <label>
            <span>Billing period</span>
            <select
              value={values.billingPeriod}
              onChange={(event) => update('billingPeriod', event.target.value)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="one-time">One time</option>
            </select>
          </label>
        </div>

        <label>
          <span>Features</span>
          <textarea
            value={values.features}
            onChange={(event) => update('features', event.target.value)}
            placeholder={'Unlimited appointments\nTeam access\nAdvanced reports'}
            rows="5"
          />
          <small>Use one feature per line.</small>
        </label>

        <label className="admin-toggle">
          <input
            type="checkbox"
            checked={values.isPublished}
            onChange={(event) => update('isPublished', event.target.checked)}
          />
          <span>Publish this package immediately</span>
        </label>

        <div className="admin-editor__actions">
          <button type="button" className="admin-secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="admin-primary-button" disabled={saving}>
            <SafeIcon icon={FiCheck} />
            {saving ? 'Saving…' : 'Save package'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AdminPackageForm;