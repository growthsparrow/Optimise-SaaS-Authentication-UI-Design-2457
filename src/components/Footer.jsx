import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__links">
        <Link to="/terms">Terms of use</Link>
        <Link to="/privacy">Privacy policy</Link>
      </div>
      <p>
        © {new Date().getFullYear()} Optimise. Crafted by{' '}
        <a href="https://growthsparrow.com" target="_blank" rel="noreferrer">
          Growth Sparrow
        </a>
      </p>
    </footer>
  );
}

export default Footer;