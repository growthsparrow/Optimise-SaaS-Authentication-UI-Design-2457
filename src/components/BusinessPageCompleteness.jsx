import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import './BusinessPageCompleteness.css';

const {FiCheckCircle, FiCircle, FiLink, FiPercent} = FiIcons;

const businessFields = [
  ['business_name', 'Business name'],
  ['business_category', 'Business category'],
  ['business_address', 'Business address'],
  ['pincode', 'Pincode'],
  ['business_expertise', 'Business expertise'],
  ['about_us', 'About us'],
  ['services_offered', 'Services offered'],
  ['primary_contact_number', 'Contact number'],
  ['email_id', 'Business email']
];

function getBusinessProgress(page) {
  const completed = businessFields.filter(([key]) => String(page?.[key] || '').trim());
  return Math.round((completed.length / businessFields.length) * 40);
}

function BusinessPageCompleteness({page, bookingTypeCount}) {
  const businessProgress = getBusinessProgress(page);
  const bookingProgress = bookingTypeCount > 0 ? 60 : 0;
  const total = Math.min(100, businessProgress + bookingProgress);
  const remainingBusinessFields = businessFields
    .filter(([key]) => !String(page?.[key] || '').trim())
    .map(([, label]) => label);

  return (
    <section className="business-completeness">
      <div className="business-completeness__heading">
        <div>
          <span className="dashboard-eyebrow">Workspace readiness</span>
          <h3>My Business Page is {total}% complete</h3>
          <p>
            Business information contributes 40%. Creating at least one booking
            type contributes the remaining 60%.
          </p>
        </div>
        <span className="business-completeness__score">
          <SafeIcon icon={FiPercent} />
          {total}%
        </span>
      </div>

      <div className="business-completeness__bar">
        <span style={{width: `${total}%`}} />
      </div>

      <div className="business-completeness__items">
        <CompletionItem
          complete={businessProgress === 40}
          icon={FiCircle}
          title="Business information"
          detail={`${businessProgress} / 40% completed`}
        />
        <CompletionItem
          complete={bookingProgress === 60}
          icon={FiLink}
          title="Booking type"
          detail={bookingProgress ? '60 / 60% completed' : 'Create a booking type for 60%'}
        />
      </div>

      {remainingBusinessFields.length > 0 && (
        <p className="business-completeness__hint">
          Still needed: {remainingBusinessFields.join(', ')}.
        </p>
      )}
    </section>
  );
}

function CompletionItem({complete, icon, title, detail}) {
  return (
    <div className={complete ? 'business-completeness__item is-complete' : 'business-completeness__item'}>
      <SafeIcon icon={complete ? FiCheckCircle : icon} />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

export default BusinessPageCompleteness;