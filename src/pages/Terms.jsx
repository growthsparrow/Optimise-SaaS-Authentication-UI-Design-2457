import React from 'react';
import LegalPage from './LegalPage';

const sections = [
  {
    title: '1. Using Optimise',
    body: 'You may use Optimise to manage legitimate appointment-booking activities for your organisation. You are responsible for maintaining accurate account information and protecting access to your workspace.'
  },
  {
    title: '2. Your responsibilities',
    body: 'You must have the authority to provide customer and staff information entered into the service. You agree not to misuse the platform, interfere with its operation or use it for unlawful purposes.'
  },
  {
    title: '3. Service availability',
    body: 'We work to provide a dependable service, but availability may occasionally be affected by maintenance, security updates or events outside our reasonable control.'
  },
  {
    title: '4. Accounts and termination',
    body: 'You may stop using Optimise at any time. We may restrict access when an account presents a security risk, violates these terms or is used in a way that could harm other customers.'
  },
  {
    title: '5. Changes to these terms',
    body: 'We may update these terms as Optimise evolves. Material updates will be communicated through the service or by email before they take effect.'
  }
];

function Terms() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of use"
      introduction="These terms explain the rules that apply when you create an account and use the Optimise appointment-booking platform."
      sections={sections}
    />
  );
}

export default Terms;