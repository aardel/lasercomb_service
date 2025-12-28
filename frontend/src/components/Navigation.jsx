import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

function Navigation() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h2>Travel Cost Automation</h2>
      </div>
      <ul className="nav-links">
        <li>
          <Link
            to="/"
            className={isActive('/') || isActive('/trips/wizard') ? 'active' : ''}
          >
            Prepare Quote
          </Link>
        </li>
        <li>
          <Link
            to="/trips"
            className={isActive('/trips') ? 'active' : ''}
          >
            Trips
          </Link>
        </li>
        <li>
          <Link
            to="/settings"
            className={isActive('/settings') ? 'active' : ''}
          >
            ⚙️ Settings
          </Link>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;

