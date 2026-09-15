import React,{useCallback,useEffect,useState} from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import BookingTypeForm from './BookingTypeForm';
import {
  archiveBookingType,
  listBookingTypes,
  saveBookingType,
  setBookingTypeEnabled
} from '../services/bookingTypeService';
import './BookingTypes.css';

const {FiEdit2,FiLink,FiMapPin,FiPlus,FiRefreshCw,FiTrash2}=FiIcons;

function BookingTypes() {
  const [bookingTypes,setBookingTypes]=useState([]);
  const [editor,setEditor]=useState(null);
  const [notice,setNotice]=useState('');
  const [loading,setLoading]=useState(true);

  const load=useCallback(async()=>{
    try {
      setBookingTypes(await listBookingTypes());
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  },[]);

  useEffect(()=>{
    load();
  },[load]);

  const save=async(values,existing)=>{
    try {
      const saved=await saveBookingType(values,existing);

      setBookingTypes((current)=>existing
        ? current.map((item)=>item.id===saved.id?saved:item)
        : [saved,...current]
      );

      setEditor(null);
      setNotice(existing?'Booking type updated.':'Booking type created.');
    } catch (error) {
      setNotice(error.message);
    }
  };

  const toggleEnabled=async(item)=>{
    try {
      const updated=await setBookingTypeEnabled(item.id,!item.is_enabled);

      setBookingTypes((current)=>current.map((row)=>
        row.id===updated.id ? {...row,...updated} : row
      ));

      setNotice(
        updated.is_enabled
          ? `${item.booking_name} is enabled for booking.`
          : `${item.booking_name} is disabled for booking.`
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const archive=async(item)=>{
    if (!window.confirm(`Archive ${item.booking_name}?`)) {
      return;
    }

    try {
      await archiveBookingType(item.id);
      setBookingTypes((current)=>current.filter((row)=>row.id!==item.id));
      setNotice('Booking type archived.');
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <section className="booking-types">
      <header className="booking-types__header">
        <div>
          <span className="dashboard-eyebrow">Booking catalogue</span>
          <h2>Configure Bookings</h2>
          <p>
            Create polished booking experiences with custom availability, branding, and client date selection.
          </p>
        </div>

        <button
          className="dashboard-primary"
          type="button"
          onClick={()=>setEditor({bookingType:null})}
        >
          <SafeIcon icon={FiPlus}/>
          Create booking type
        </button>
      </header>

      {editor&&(
        <BookingTypeForm
          bookingType={editor.bookingType}
          onClose={()=>setEditor(null)}
          onSaved={save}
        />
      )}

      {notice&&<p className="booking-types__notice" role="status">{notice}</p>}

      {loading ? (
        <div className="booking-types__state">
          <SafeIcon icon={FiRefreshCw}/>
          Loading booking types…
        </div>
      ) : bookingTypes.length ? (
        <div className="booking-type-grid">
          {bookingTypes.map((item)=>(
            <BookingTypeCard
              item={item}
              key={item.id}
              onEdit={()=>setEditor({bookingType:item})}
              onArchive={()=>archive(item)}
              onToggle={()=>toggleEnabled(item)}
            />
          ))}
        </div>
      ) : (
        <div className="booking-types__state">
          No booking types yet. Create one to begin.
        </div>
      )}
    </section>
  );
}

function BookingTypeCard({item,onEdit,onArchive,onToggle}) {
  const isEnabled=item.is_enabled !==false;
  const isFullDay=item.duration==='full-day';

  return (
    <article className="booking-type-card">
      <div className="booking-type-card__glow"/>
      <div className="booking-type-card__top">
        <span className="booking-type-badge">
          {isFullDay?'Full day booking':item.booking_type}
        </span>

        <div className="booking-type-card__actions">
          <button type="button" onClick={onEdit} aria-label="Edit booking type">
            <SafeIcon icon={FiEdit2}/>
          </button>
          <button type="button" onClick={onArchive} aria-label="Archive booking type">
            <SafeIcon icon={FiTrash2}/>
          </button>
        </div>
      </div>

      <div className="booking-type-card__identity">
        <div className="booking-type-card__photo">
          {item.photo_url ? (
            <img src={item.photo_url} alt={`${item.booking_name} avatar`}/>
          ) : (
            <SafeIcon icon={item.booking_type==='offline'?FiMapPin:FiLink}/>
          )}
        </div>

        <div>
          <h3>{item.booking_name}</h3>
          <p>
            {item.professional_name||'Professional not specified'}
            {' · '}
            {item.professional_expertise||'Expertise not specified'}
          </p>
        </div>
      </div>

      <div className="booking-type-card__meta">
        <span className={isEnabled?'is-active':'is-disabled'}>
          <i/>
          {isEnabled?'Available to clients':'Hidden from clients'}
        </span>
        <span>{isFullDay?'Client calendar':'Time slots'}</span>
      </div>

      <button
        type="button"
        className={isEnabled
          ? 'booking-status-toggle booking-status-toggle--enabled'
          : 'booking-status-toggle booking-status-toggle--disabled'}
        onClick={onToggle}
        aria-pressed={isEnabled}
      >
        <span className="booking-status-toggle__dot"/>
        {isEnabled?'Enabled':'Disabled'}
      </button>

      <dl>
        <div>
          <dt>Availability</dt>
          <dd>
            {item.available_days?.join(', ') || 'No days selected'}
          </dd>
        </div>

        <div>
          <dt>{isFullDay?'Client dates':'Selected slots'}</dt>
          <dd>
            {isFullDay
              ? `${item.available_dates?.length || 0} dates`
              : `${item.selected_time_slots?.length || 0} slots`}
          </dd>
        </div>

        <div>
          <dt>Cost</dt>
          <dd>
            {item.show_cost
              ? `₹${Number(item.cost_inr||0).toLocaleString('en-IN')}`
              : 'Hidden while booking'}
          </dd>
        </div>

        <div>
          <dt>Mode</dt>
          <dd>
            <SafeIcon icon={item.booking_type==='offline'?FiMapPin:FiLink}/>
            {item.booking_type}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default BookingTypes;