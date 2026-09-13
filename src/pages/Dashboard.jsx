import React,{useEffect,useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import DashboardSidebar from '../components/DashboardSidebar';
import ConsultationsManager from '../components/ConsultationsManager';
import DoctorsManager from '../components/DoctorsManager';
import LocationsManager from '../components/LocationsManager';
import ProfileManager from '../components/ProfileManager';
import Footer from '../components/Footer';
import {getCustomerId} from '../services/profileService';
import supabase from '../supabase/supabase';
import './Dashboard.css';
import './DashboardMotion.css';
import './DashboardPolish.css';
import './DashboardEditors.css';
import './DashboardAppointmentsFirst.css';
import './SidebarRefinements.css';
import './DashboardVisibility.css';

const {FiArrowUpRight,FiCalendar,FiClock,FiLogOut,FiUserCheck}=FiIcons;

function Dashboard() {
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [activeItem,setActiveItem]=useState('Appointments Overview');
  const [profile,setProfile]=useState(null);
  const [customerId,setCustomerId]=useState('');
  const [signingOut,setSigningOut]=useState(false);

  useEffect(()=> {
    let active=true;
    supabase.auth.getUser().then(async ({data})=> {
      if (!active) return;
      const currentUser=data.user;
      setProfile(currentUser);
      if (currentUser?.id) {
        try {
          setCustomerId(await getCustomerId(currentUser.id));
        } catch {
          setCustomerId('');
        }
      }
    });
    return ()=> {
      active=false;
    };
  },[]);

  const businessName=profile?.user_metadata?.business_name?.trim() || 'your workspace';
  const customerName=profile?.user_metadata?.name?.trim() || 'Customer';

  const handleSignOut=async ()=> {
    setSigningOut(true);
    await supabase.auth.signOut();
  };

  const selectItem=(item)=> {
    setActiveItem(item);
    setSidebarOpen(false);
  };

  return (
    <main className="dashboard-page">
      <DashboardSidebar
        open={sidebarOpen}
        onClose={()=> setSidebarOpen((current)=> !current)}
        activeItem={activeItem}
        onSelect={selectItem}
      />

      <section className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <span className="dashboard-eyebrow">Medical and Healthcare</span>
            <h1>Hello,{businessName}</h1>
            <p>
              Here is what is happening across your healthcare workspace today.
              {customerId && ` Customer ID: ${customerId}`}
            </p>
          </div>

          <div className="dashboard-header__actions">
            <span className="dashboard-user">{customerName}</span>
            <button
              className="dashboard-signout"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              <SafeIcon icon={FiLogOut} />
              {signingOut ? 'Signing out' : 'Sign out'}
            </button>
          </div>
        </header>

        {activeItem==='Manage Doctors' ? (
          <DoctorsManager />
        ) : activeItem==='Manage Consultations' ? (
          <ConsultationsManager />
        ) : activeItem==='Manage Locations' ? (
          <LocationsManager />
        ) : activeItem==='Profile Management' ? (
          <ProfileManager />
        ) : (
          <DashboardOverview />
        )}

        <div className="dashboard-section-footer">
          <Footer />
        </div>
      </section>
    </main>
  );
}

function DashboardOverview() {
  return (
    <>
      <div className="dashboard-toolbar">
        <div>
          <h2>Appointments Overview</h2>
          <span className="dashboard-date">Tuesday,June 24,2025</span>
        </div>
        <button className="dashboard-primary">New appointment</button>
      </div>

      <section className="dashboard-stats">
        <StatCard icon={FiCalendar} label="Appointments today" value="24" detail="+12.5% from last week" positive />
        <StatCard icon={FiUserCheck} label="Active doctors" value="18" detail="2 awaiting approval" />
        <StatCard icon={FiClock} label="Average wait time" value="12 min" detail="-8.4% from last week" positive />
        <StatCard icon={FiArrowUpRight} label="Booking conversion" value="68.4%" detail="+4.2% from last week" positive />
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card appointment-card">
          <div className="dashboard-card__heading">
            <div>
              <h3>Today&apos;s appointments</h3>
              <p>Your schedule at a glance</p>
            </div>
            <button className="dashboard-link">View all</button>
          </div>
          <Appointment time="09:30 AM" patient="Olivia Bennett" type="General consultation" doctor="Dr. Sarah Mitchell" status="Confirmed" />
          <Appointment time="11:00 AM" patient="Noah Williams" type="Follow-up consultation" doctor="Dr. James Carter" status="In progress" />
          <Appointment time="01:30 PM" patient="Emma Thompson" type="Health assessment" doctor="Dr. Sarah Mitchell" status="Confirmed" />
          <Appointment time="03:00 PM" patient="Liam Anderson" type="Specialist consultation" doctor="Dr. Michael Lee" status="Pending" />
        </div>
      </section>
    </>
  );
}

function StatCard({icon,label,value,detail,positive}) {
  return (
    <article className="stat-card">
      <div className="stat-card__top">
        <SafeIcon icon={icon} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <small className={positive ? 'stat-positive' : ''}>{detail}</small>
    </article>
  );
}

function Appointment({time,patient,doctor,type,status}) {
  return (
    <div className="appointment-row">
      <span className="appointment-time">{time}</span>
      <span className="appointment-avatar">
        {patient.split(' ').map((name)=> name[0]).join('')}
      </span>
      <span className="appointment-info">
        <strong>{patient}</strong>
        <small>{type} · {doctor}</small>
      </span>
      <span className={`appointment-status appointment-status--${status.toLowerCase().replace(' ','-')}`}>
        {status}
      </span>
    </div>
  );
}

export default Dashboard;