import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiActivity,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiChevronRight,
  FiClipboard,
  FiMapPin,
  FiMenu,
  FiUsers,
  FiX
} = FiIcons;

const menuItems = [
  { label: 'Manage Doctors', icon: FiUsers },
  { label: 'Manage Consultations', icon: FiClipboard },
  { label: 'Manage Locations', icon: FiMapPin },
  { label: 'Manage Team Members', icon: FiUsers },
  { label: 'Manage Booking Page', icon: FiBookOpen },
  { label: 'Appointments Overview', icon: FiCalendar },
  { label: 'Analytics and Reports', icon: FiBarChart2 },
  { label: 'Profile Management', icon: FiActivity }
];

function DashboardSidebar({ open, onClose, activeItem, onSelect }) {
  return (
    <>
      {open && <button className="sidebar-overlay" onClick={onClose} aria-label="Close menu" />}
      <aside className={`dashboard-sidebar ${open ? 'dashboard-sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-logo">O</span>
          <span>Optimise</span>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <SafeIcon icon={FiX} />
          </button>
        </div>

        <div className="sidebar-label">Workspace</div>
        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {menuItems.map((item) => (
            <button
              className={`dashboard-nav__item ${activeItem === item.label ? 'dashboard-nav__item--active' : ''}`}
              key={item.label}
              onClick={() => onSelect(item.label)}
            >
              <SafeIcon icon={item.icon} />
              <span>{item.label}</span>
              <SafeIcon icon={FiChevronRight} className="dashboard-nav__arrow" />
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <SafeIcon icon={FiActivity} />
          <span>Healthcare workspace</span>
        </div>
      </aside>
      <button className="dashboard-menu-button" onClick={onClose} aria-label="Open menu">
        <SafeIcon icon={FiMenu} />
      </button>
    </>
  );
}

export default DashboardSidebar;