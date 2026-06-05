import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/sessions', label: 'Call Sessions', icon: '📞' },
  { to: '/resumes', label: 'CVs / Resumes', icon: '📝' },
  { to: '/documents', label: 'Documents', icon: '📄' },
  { to: '/test', label: 'Test Lab', icon: '🧪' },
];

const bottomItems = [
  { to: '/help', label: 'Get Help', icon: '❓', external: true },
  { to: '/tutorials', label: 'Video Tutorials', icon: '🎬', external: true },
  { to: '/download', label: 'Download Desktop App', icon: '⬇️', expand: true },
  { to: '/settings/api-keys', label: 'API Keys', icon: '🔑' },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">SA</div>
        <h1>Stealth AI</h1>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {bottomItems.map((item) =>
          item.external ? (
            <a
              key={item.label}
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="nav-link"
              onClick={(e) => item.to === '/help' && e.preventDefault()}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.expand && <span style={{ marginLeft: 'auto' }}>›</span>}
            </a>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          )
        )}
      </div>
    </aside>
  );
}

export default memo(Sidebar);
