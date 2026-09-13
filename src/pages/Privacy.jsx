import React from 'react';
import LegalPage from './LegalPage';

const sections = [
  {
    title: '1. Information we collect',
    body: 'We collect information you provide when creating an account, including your name, contact details and business information. We may also process booking and usage data needed to operate the service.'
  },
  {
    title: '2. How information is used',
    body: 'Information is used to provide and secure Optimise, manage appointments, support your account, improve product performance and communicate essential service updates.'
  },
  {
    title: '3. Data sharing',
    body: 'We do not sell personal information. Data may be shared with trusted service providers that help us operate Optimise, subject to appropriate confidentiality and security obligations.'
  },
  {
    title: '4. Data retention and security',
    body: 'We retain information only for as long as necessary for the purposes described here or to meet legal obligations. We apply organisational and technical controls designed to protect stored data.'
  },
  {
    title: '5. Your choices',
    body: 'Depending on your location, you may request access, correction, export or deletion of personal information. You may also update account details through your workspace settings.'
  }
];

function Privacy() {
  return (
    <LegalPage
      eyebrow="Your data"
      title="Privacy policy"
      introduction="This policy describes how Optimise handles information when businesses and their teams use our appointment-booking platform."
      sections={sections}
    />
  );
}

export default Privacy;