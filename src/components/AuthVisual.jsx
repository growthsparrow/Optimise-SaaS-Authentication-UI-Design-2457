import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import Brand from './Brand';

const { FiCalendar, FiCheck, FiClock, FiUsers } = FiIcons;

function AuthVisual() {
  return (
    <aside className="auth-visual">
      <Brand />
      <div className="visual-copy">
        <span className="eyebrow">One workspace. Every appointment.</span>
        <h1>Make time work better for your business.</h1>
        <p>
          Bring bookings, clients and teams together in one calm,
          intelligent workspace.
        </p>
      </div>
      <div className="schedule-card">
        <div className="schedule-card__header">
          <span><SafeIcon icon={FiCalendar} /> Today</span>
          <span className="live-pill">Live</span>
        </div>
        <div className="schedule-item">
          <span className="schedule-time">09:30</span>
          <span className="schedule-avatar">AL</span>
          <span><b>Consultation</b><small>Alex Morgan</small></span>
          <SafeIcon icon={FiCheck} className="schedule-check" />
        </div>
        <div className="schedule-item">
          <span className="schedule-time">11:00</span>
          <span className="schedule-avatar schedule-avatar--gold">JD</span>
          <span><b>Strategy session</b><small>Jamie Davis</small></span>
          <SafeIcon icon={FiClock} className="schedule-clock" />
        </div>
      </div>
      <div className="visual-metric">
        <SafeIcon icon={FiUsers} />
        <span><b>2,400+</b><small>appointments coordinated</small></span>
      </div>
      <span className="orb orb--one" />
      <span className="orb orb--two" />
    </aside>
  );
}

export default AuthVisual;