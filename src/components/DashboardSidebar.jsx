import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const {
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiChevronRight,
  FiEdit3,
  FiLink,
  FiMenu,
  FiUser,
  FiUsers,
  FiX
} = FiIcons;

const logoUrl = 'https://media-manager-c.questera.ai/greta-media/b00cad02cfeb55a1b54773f1814a28783966fac1191f97d55bc1db6658c27e2897de2ada8340abcbb890f1cad119b01d/images/aW1hZ2UvcG5n/583122e1068a93e947bbf988744900e9.png';

const ownerMenuItems = [
  { label: 'My Business Page', icon: FiBriefcase },
  { label: 'Configure Bookings', icon: FiLink },
  { label: 'Manage Appointments', icon: FiCalendar },
  { label: 'Appointment Form', icon: FiEdit3 },
  { label: 'Team Members', icon: FiUsers },
  { label: 'Profile Management', icon: FiUser }
];

const memberMenuItems = [];

function DashboardSidebar({ open, onClose, activeItem, onSelect, memberMode }) {
  const menuItems = memberMode ? memberMenuItems : ownerMenuItems;

  return (
    <>
      {open && (
        <button className="sidebar-overlay" type="button" onClick={onClose} aria-label="Close menu" />
      )}

      <aside className={`dashboard-sidebar ${open ? 'dashboard-sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-logo">
            <img src={logoUrl} alt="Optimise logo" />
          </span>
          <span>Optimise</span>
          <button className="sidebar-close" type="button" onClick={onClose} aria-label="Close menu">
            <SafeIcon icon={FiX} />
          </button>
        </div>

        <div className="sidebar-label">
          {memberMode ? 'Team member access' : 'Workspace'}
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {menuItems.map((item) => (
            <button
              className={`dashboard-nav__item ${activeItem === item.label ? 'dashboard-nav__item--active' : ''}`}
              type="button"
              key={item.label}
              onClick={() => onSelect(item.label)}
            >
              <SafeIcon icon={item.icon} />
              <span>{item.label}</span>
              <SafeIcon icon={FiChevronRight} className="dashboard-nav__arrow" />
            </button>
          ))}
        </nav>

        <div className="sidebar-footer-spacer" aria-hidden="true" />
      </aside>

      <button
        className="dashboard-menu-button"
        type="button"
        onClick={onClose}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <SafeIcon icon={open ? FiX : FiMenu} />
      </button>
    </>
  );
}

export default DashboardSidebar;