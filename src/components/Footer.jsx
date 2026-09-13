import React from 'react';

function Footer() {
  return (
    <footer className="site-footer">
      <p>
        {new Date().getFullYear()} © Optimise. Product by{' '}
        <a href="https://growthsparrow.com" target="_blank" rel="noreferrer">
          Growth Sparrow
        </a>
        {' · '}Version 1.01
      </p>
    </footer>
  );
}

export default Footer;