import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { createPublicBooking, getPublicAppointmentForm } from '../services/appointmentFormService';
import { getPublicBusinessPage } from '../services/businessPageService';
import { listBookingTypes } from '../services/bookingTypeService';
import './PublicAppointmentBooking.css';

const { FiArrowRight, FiCalendar, FiCheck, FiCopy, FiMapPin, FiShare2, FiUser, FiVideo } = FiIcons;

function getLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildAvailableDates(bookingType) {
  if (!bookingType) return [];
  const todayKey = getLocalDateKey(new Date());
  if (bookingType.duration === 'full-day') return (bookingType.available_dates || []).filter((date) => date >= todayKey).sort().slice(0, 14);

  const dates = [];
  const today = new Date();
  const unavailableDates = bookingType.unavailable_dates || [];
  const unavailableWeekdays = bookingType.unavailable_weekdays || [];

  for (let offset = 0; offset < 14; offset += 1) {
    const date = new Date(today);
    date.setHours(12, 0, 0, 0);
    date.setDate(today.getDate() + offset);
    const dateKey = getLocalDateKey(date);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });

    if ((bookingType.available_days || []).includes(weekday) && !unavailableWeekdays.includes(weekday) && !unavailableDates.includes(dateKey)) {
      dates.push(dateKey);
    }
  }

  return dates;
}

function PublicAppointmentBooking() {
  const { businessSlug } = useParams();
  const [page, setPage] = useState(null);
  const [form, setForm] = useState(null);
  const [bookingTypes, setBookingTypes] = useState([]);
  const [values, setValues] = useState({});
  const [selectedType, setSelectedType] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [step, setStep] = useState(1);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    Promise.all([getPublicBusinessPage(businessSlug), getPublicAppointmentForm(businessSlug), listBookingTypes()])
      .then(([businessPage, appointmentForm, types]) => {
        setPage(businessPage);
        setForm(appointmentForm);
        setBookingTypes(types.filter((item) => item.is_enabled !== false));
      })
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [businessSlug]);

  useEffect(() => {
    if (!form?.fields) return;
    setValues(Object.fromEntries(form.fields.map((field) => [field.name, field.type === 'checkbox' ? false : ''])));
  }, [form]);

  useEffect(() => {
    if (!selectedType) {
      setDate('');
      setTime('');
      return;
    }
    const availableDates = buildAvailableDates(selectedType);
    setDate(availableDates[0] || '');
    setTime(selectedType.duration === 'full-day' ? 'Full day' : '');
  }, [selectedType]);

  const dates = useMemo(() => buildAvailableDates(selectedType), [selectedType]);
  const availableTimes = useMemo(() => selectedType && selectedType.duration !== 'full-day'
    ? (selectedType.selected_time_slots || []).filter((slot) => !(selectedType.unavailable_time_slots || []).includes(slot))
    : [], [selectedType]);

  const updateValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }));
    setNotice('');
  };

  const continueFromForm = () => {
    const invalid = form?.fields?.find((field) => field.required && (field.type === 'checkbox'
      ? values[field.name] !== true
      : !String(values[field.name] || '').trim()));

    if (invalid) {
      setNotice(`Please complete: ${invalid.label}.`);
      return;
    }
    setNotice('');
    setStep(2);
  };

  const continueFromType = () => {
    if (!selectedType) return setNotice('Choose an appointment type to continue.');
    if (!dates.length) return setNotice('There are no available dates for this appointment type.');
    setNotice('');
    setStep(3);
  };

  const confirm = async () => {
    if (!selectedType || !date) return setNotice('Choose a booking type and available date.');
    if (selectedType.duration !== 'full-day' && !time) return setNotice('Choose an available time.');
    setNotice('');

    try {
      const saved = await createPublicBooking({
        businessSlug,
        bookingTypeId: selectedType.id,
        bookingDate: date,
        bookingTime: selectedType.duration === 'full-day' ? 'Full day' : time,
        formResponse: values
      });
      setConfirmation(saved);
      setStep(4);
    } catch (error) {
      setNotice(error.message);
    }
  };

  const getConfirmationLink = () => {
    if (!confirmation?.booking_id) return window.location.href;
    const url = new URL(window.location.href);
    url.searchParams.set('booking', confirmation.booking_id);
    return url.toString();
  };

  const copyConfirmationLink = async () => {
    const link = getConfirmationLink();
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
      else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.setAttribute('readonly', '');
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setNotice('Confirmation link copied.');
    } catch {
      setNotice('Copying is unavailable in this browser. You can copy the link from the address bar.');
    }
  };

  const shareConfirmation = async () => {
    const link = getConfirmationLink();
    setSharing(true);
    setNotice('');

    try {
      if (navigator.share) await navigator.share({ title: `${page.business_name} booking confirmation`, text: `Booking ${confirmation.booking_id}`, url: link });
      else await copyConfirmationLink();
    } catch (error) {
      if (error?.name !== 'AbortError') await copyConfirmationLink();
    } finally {
      setSharing(false);
    }
  };

  if (loading) return <main className="public-business-state">Preparing your appointment experience…</main>;
  if (!page) return <main className="public-business-state public-business-state--error">{notice}</main>;

  const isOnlineAppointment = selectedType?.booking_type === 'online';
  const meetingLink = confirmation?.google_meet_link || selectedType?.meeting_invite_link || '';

  return (
    <main className="public-appointment-booking" style={{ '--public-accent': '#087f8d', '--public-deep': '#063e50', '--public-soft': '#e8f8f7' }}>
      <div className="public-appointment-booking__shell">
        <header className="public-appointment-booking__header">
          <div className="public-appointment-booking__brand">
            {page.logo_url && <img src={page.logo_url} alt={`${page.business_name} logo`} />}
            <span><small>Appointment booking</small><strong>{page.business_name}</strong></span>
          </div>
          <div className="public-appointment-booking__progress">{[1, 2, 3, 4].map((item) => <span className={item <= step ? 'is-active' : ''} key={item} />)}</div>
        </header>

        <div className="public-appointment-booking__grid">
          <aside className="public-appointment-booking__aside">
            <span>Book with confidence</span>
            <h1>Your time matters.</h1>
            <p>Choose the right appointment, find a convenient time and receive your confirmation instantly.</p>
            {page.logo_url && <img src={page.logo_url} alt="" />}
          </aside>

          <section className="public-appointment-booking__card">
            {step === 1 && <><h2>{form?.form_name || 'Tell us about your appointment'}</h2><p>{form?.description || 'Complete your details to get started.'}</p><DynamicFields fields={form?.fields || []} values={values} onChange={updateValue} /><button className="public-appointment-booking__primary" type="button" onClick={continueFromForm}>Continue <SafeIcon icon={FiArrowRight} /></button></>}

            {step === 2 && <><h2>Choose an appointment type</h2><p>Select the service, professional or consultation you want.</p><div className="public-appointment-booking__types">{bookingTypes.length ? bookingTypes.map((item) => <button type="button" className={selectedType?.id === item.id ? 'public-appointment-booking__type is-selected' : 'public-appointment-booking__type'} key={item.id} onClick={() => setSelectedType(item)}><span className="public-appointment-booking__type-avatar">{item.photo_url ? <img src={item.photo_url} alt="" /> : <SafeIcon icon={FiUser} />}</span><span className="public-appointment-booking__type-copy"><strong>{item.booking_name}</strong><small>{item.show_professional_name !== false ? item.professional_name || 'Professional appointment' : 'Professional appointment'}{item.show_professional_expertise !== false && item.professional_expertise ? ` · ${item.professional_expertise}` : ''}</small></span>{item.show_cost && <span className="public-appointment-booking__type-fee">₹{Number(item.cost_inr || 0).toLocaleString('en-IN')}</span>}</button>) : <p>No appointment types are currently available.</p>}</div><button className="public-appointment-booking__primary" type="button" onClick={continueFromType}>Continue <SafeIcon icon={FiArrowRight} /></button></>}

            {step === 3 && <><h2>Choose your date and time</h2><p>Select an available date from the current or upcoming week for {selectedType?.booking_name}.</p><div className="public-appointment-booking__schedule"><div><h3><SafeIcon icon={FiCalendar} /> Available dates</h3><div className="public-appointment-booking__date-grid">{dates.length ? dates.map((item) => <button type="button" key={item} className={date === item ? 'is-selected' : ''} onClick={() => { setDate(item); setTime(selectedType.duration === 'full-day' ? 'Full day' : ''); }}>{formatDate(item)}</button>) : <p>No dates are available in the current or upcoming week.</p>}</div></div>{selectedType?.duration === 'full-day' ? <div className="public-appointment-booking__summary"><strong>Full-day appointment</strong><span>This booking type uses the full selected date.</span></div> : <div><h3><SafeIcon icon={FiClock} /> Available times</h3><div className="public-appointment-booking__time-grid">{availableTimes.length ? availableTimes.map((slot) => <button type="button" key={slot} className={time === slot ? 'is-selected' : ''} onClick={() => setTime(slot)}>{slot}</button>) : <p>No times are available for this booking type.</p>}</div></div>}</div>{date && (selectedType?.duration === 'full-day' || time) && <div className="public-appointment-booking__summary"><strong>Review your appointment</strong><span>{formatDate(date)} · {time}</span><span>{selectedType?.show_professional_name !== false ? selectedType?.professional_name || 'Professional appointment' : 'Professional appointment'}</span><span>{selectedType?.location_name || selectedType?.address || 'Online appointment'}</span></div>}<button className="public-appointment-booking__primary" type="button" onClick={confirm}>Confirm appointment <SafeIcon icon={FiCheck} /></button></>}

            {step === 4 && confirmation && <><h2>Appointment confirmed</h2><p>Keep this confirmation for your records.</p><div className="public-appointment-booking__confirmation"><strong>Booking name</strong><span>{selectedType?.booking_name || 'Appointment'}</span><strong>Booking ID</strong><span className="public-appointment-booking__confirmation-id">{confirmation.booking_id}</span><div className="public-appointment-booking__confirmation-row"><span>Date and time</span><strong>{formatDate(confirmation.booking_date)} · {confirmation.booking_time}</strong></div><div className="public-appointment-booking__confirmation-row"><span>Professional</span><strong>{selectedType?.professional_name || 'Not specified'}</strong></div><div className="public-appointment-booking__confirmation-row"><span>Location</span><strong>{isOnlineAppointment ? 'Online appointment' : selectedType?.location_name || selectedType?.address || 'Not specified'}</strong></div>{isOnlineAppointment && meetingLink && <a className="public-appointment-booking__map" href={meetingLink} target="_blank" rel="noreferrer"><SafeIcon icon={FiVideo} /> Join Google Meet</a>}{isOnlineAppointment && !meetingLink && confirmation.google_calendar_sync_error && <p className="public-appointment-booking__error">Your booking is confirmed, but the Meet link could not be generated. The workspace owner can reconnect Google Calendar.</p>}{!isOnlineAppointment && selectedType?.google_maps_link && <a className="public-appointment-booking__map" href={selectedType.google_maps_link} target="_blank" rel="noreferrer"><SafeIcon icon={FiMapPin} /> Open map</a>}{selectedType?.show_cost && <div className="public-appointment-booking__confirmation-row"><span>Appointment fee</span><strong>₹{Number(selectedType.cost_inr || 0).toLocaleString('en-IN')}</strong></div>}<div className="public-appointment-booking__confirmation-actions"><button className="public-appointment-booking__share" type="button" onClick={shareConfirmation} disabled={sharing}><SafeIcon icon={FiShare2} />{sharing ? 'Sharing…' : 'Share confirmation'}</button><button className="public-appointment-booking__share" type="button" onClick={copyConfirmationLink}><SafeIcon icon={FiCopy} />Copy confirmation link</button></div></div></>}

            {notice && <p className="public-appointment-booking__error">{notice}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}

function DynamicFields({ fields, values, onChange }) {
  return <div className="public-appointment-booking__fields">{fields.map((field) => <label className={field.type === 'checkbox' ? 'public-appointment-booking__field public-appointment-booking__field--check' : 'public-appointment-booking__field'} key={field.id || field.name}>{field.type === 'checkbox' ? <><input type="checkbox" checked={Boolean(values[field.name])} onChange={(event) => onChange(field.name, event.target.checked)} /><span>{field.label}{field.required ? ' *' : ''}</span></> : <><span>{field.label}{field.required ? ' *' : ''}</span>{field.type === 'textarea' ? <textarea value={values[field.name] || ''} placeholder={field.placeholder} onChange={(event) => onChange(field.name, event.target.value)} required={field.required} /> : field.type === 'select' ? <select value={values[field.name] || ''} onChange={(event) => onChange(field.name, event.target.value)} required={field.required}><option value="">Choose an option</option>{(field.options || []).map((option) => <option key={option}>{option}</option>)}</select> : <input type={field.type} value={values[field.name] || ''} placeholder={field.placeholder} onChange={(event) => onChange(field.name, event.target.value)} required={field.required} />}</>}</label>)}</div>;
}

export default PublicAppointmentBooking;