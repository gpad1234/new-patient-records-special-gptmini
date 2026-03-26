import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={closeMenu}>
          🏥 Diabetes EMR
        </Link>
        <button className="hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          <span className={`hamburger-line ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'active' : ''}`}></span>
          <span className={`hamburger-line ${isMenuOpen ? 'active' : ''}`}></span>
        </button>
        <ul className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <li><Link to="/" onClick={closeMenu}>Dashboard</Link></li>
          <li><Link to="/api/patients" onClick={closeMenu}>Patients</Link></li>
          {config.ALLOW_ADD_PATIENT ? (
            <li><Link to="/api/patients/new" onClick={closeMenu}>Add Patient</Link></li>
          ) : (
            <li><Link to="/admin/seed" onClick={closeMenu}>Import / Test Data</Link></li>
          )}
          {config.SHOW_RESEARCH && (
            <>
              <li><Link to="/research/ai" onClick={closeMenu}>🧠 AI Research</Link></li>
              <li><Link to="/predictions/ai" onClick={closeMenu}>🤖 AI Predictions</Link></li>
            </>
          )}
          <li><Link to="/admin/seed" onClick={closeMenu}>📊 Test Data</Link></li>
        </ul>
      </div>
    </nav>
  );
}
