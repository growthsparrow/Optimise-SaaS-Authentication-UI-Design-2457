import React from 'react';
import { Link } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Brand from '../components/Brand';
import Footer from '../components/Footer';

const { FiArrowLeft } = FiIcons;

function LegalPage({ eyebrow, title, introduction, sections }) {
  return (
    <main className="legal-page">
      <nav className="legal-nav">
        <Brand compact />
        <Link className="back-link" to="/">
          <SafeIcon icon={FiArrowLeft} /> Back to sign in
        </Link>
      </nav>
      <article className="legal-card">
        <header>
          <span className="eyebrow eyebrow--dark">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{introduction}</p>
          <small>Last updated: June 2025</small>
        </header>
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </article>
      <Footer />
    </main>
  );
}

export default LegalPage;