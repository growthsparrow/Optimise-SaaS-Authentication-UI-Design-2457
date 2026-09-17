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
  },
  {
    title: '6. Account and booking information',
    body: 'When you use Optimise, we may process account details, business information, appointment settings, booking forms, appointment records and information submitted by patients or customers through your public booking pages. Workspace owners are responsible for deciding what information to collect and for using it lawfully.'
  },
  {
    title: '7. Information collected automatically',
    body: 'We may collect technical and usage information such as browser type, device information, operating system, IP address, pages viewed, access times, referring pages, feature usage and error details. This information helps us maintain reliability, improve the service and detect misuse.'
  },
  {
    title: '8. Cookies and similar technologies',
    body: 'Optimise may use cookies, local storage and similar technologies to maintain secure sessions, remember preferences, support application functionality and understand how the platform is used. Disabling these technologies may affect some features.'
  },
  {
    title: '9. Google Calendar integration',
    body: 'If you connect Google Calendar, Optimise processes the permissions and calendar information necessary to create or manage eligible appointment events and related meeting details. OAuth credentials are handled server-side and protected using encryption. You can disconnect the integration from your workspace controls. Disconnecting does not delete calendar events that were already created.'
  },
  {
    title: '10. How information is shared',
    body: 'We do not sell or rent personal information. We may share information with trusted providers that host, secure, store, analyze or support Optimise, or with service providers needed for features you request. We may also disclose information when required by law, legal process or to protect the rights, safety and security of Optimise, our users or others.'
  },
  {
    title: '11. Data security',
    body: 'We use reasonable administrative, technical and organisational safeguards designed to protect information against unauthorized access, alteration, disclosure or destruction. These measures may include authentication controls, row-level security, encryption in transit, server-side handling of sensitive credentials and restricted administrative access. No online service can guarantee complete security.'
  },
  {
    title: '12. Your privacy rights',
    body: 'Subject to applicable law, you may request access to, correction of, export of or deletion of personal information associated with your account. You may also update eligible account details through your workspace settings and disconnect optional integrations. We may verify your identity before completing a request and may retain information where required by law or legitimate security and recordkeeping needs.'
  },
  {
    title: '13. Data retention',
    body: 'We retain information for as long as necessary to provide the service, maintain security and business records, resolve disputes, enforce agreements and meet legal or regulatory obligations. Workspace owners may have additional responsibilities for retaining or deleting information collected through their own booking pages.'
  },
  {
    title: '14. Children’s privacy',
    body: 'Optimise is intended for businesses and authorized users and is not directed to children below the minimum age required to use online services in their jurisdiction. We do not knowingly collect personal information directly from children without appropriate authorization.'
  },
  {
    title: '15. International processing',
    body: 'Information may be processed or stored in countries other than the country where you live or operate. Where required by applicable law, we take appropriate steps to support lawful international transfers and apply suitable protections to personal information.'
  },
  {
    title: '16. Changes to this policy',
    body: 'We may update this Privacy Policy when our services, legal requirements or privacy practices change. The updated version will be posted on this page with a revised effective date. Continued use of Optimise after an update acknowledges the revised policy to the extent permitted by law.'
  },
  {
    title: '17. Contact us',
    body: 'If you have questions about this Privacy Policy, want to exercise a privacy right or need help understanding how your information is handled, please contact the Optimise support team through the support channel provided in your account or through the official Optimise contact details.'
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