import React from 'react';
import { Link } from 'react-router-dom';
import AuthVisual from './AuthVisual';
import Brand from './Brand';
import Footer from './Footer';

function AuthShell({ children, alternateText, alternateLabel, alternateTo }) {
  return (
    <main className="auth-layout">
      <AuthVisual />
      <section className="auth-panel">
        <header className="mobile-header">
          <Brand compact />
          <Link to={alternateTo}>{alternateLabel}</Link>
        </header>
        <div className="auth-panel__inner">
          {children}
          <p className="auth-switch">
            {alternateText} <Link to={alternateTo}>{alternateLabel}</Link>
          </p>
        </div>
        <Footer />
      </section>
    </main>
  );
}

export default AuthShell;