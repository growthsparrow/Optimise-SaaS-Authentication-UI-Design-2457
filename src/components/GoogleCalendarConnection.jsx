import { useEffect, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {
  beginGoogleCalendarConnection,
  disconnectGoogleCalendar,
  getGoogleCalendarStatus
} from '../services/googleCalendarService';

const { FiCalendar, FiCheckCircle, FiLink, FiRefreshCw, FiUnlink } = FiIcons;

function GoogleCalendarConnection() {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setConnection((await getGoogleCalendarStatus()).connection);
    } catch (error) {
      setMessage(error.message || 'Google Calendar status could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const connect = async () => {
    setWorking(true);
    setMessage('');

    try {
      await beginGoogleCalendarConnection();
      await load();
      setMessage('Google Calendar is connected to this workspace.');
    } catch (error) {
      setMessage(error.message || 'Google Calendar connection failed.');
    } finally {
      setWorking(false);
    }
  };

  const disconnect = async () => {
    setWorking(true);
    setMessage('');

    try {
      await disconnectGoogleCalendar();
      setConnection(null);
      setMessage('Google Calendar disconnected. Existing bookings were preserved.');
    } catch (error) {
      setMessage(error.message || 'Google Calendar could not be disconnected.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="booking-types__notice">
        <SafeIcon icon={FiRefreshCw} />
        Checking Google Calendar connection…
      </div>
    );
  }

  const connected = connection?.status === 'connected';
  const hasPermissionError = connection?.status === 'permission_error';
  const isExpired = connection?.status === 'expired';

  return (
    <section className="google-calendar-connection" aria-label="Google Calendar integration">
      <div>
        <span className="dashboard-eyebrow">Online booking automation</span>
        <h3>Google Calendar & Meet</h3>
        <p>
          Connect the workspace owner’s Google account from this page. Confirmed
          online bookings will receive a Calendar event and Google Meet link.
          Offline bookings remain unchanged.
        </p>
        {connection?.google_email && <strong>{connection.google_email}</strong>}
        {hasPermissionError && (
          <small>
            Google Calendar permission was denied. Reconnect to grant access again.
          </small>
        )}
        {isExpired && (
          <small>
            The Google Calendar session expired. Reconnect to continue syncing.
          </small>
        )}
        {connection?.last_error && <small>{connection.last_error}</small>}
      </div>

      <div className="google-calendar-connection__actions">
        <span className={connected ? 'google-calendar-connection__status is-connected' : 'google-calendar-connection__status'}>
          <SafeIcon icon={connected ? FiCheckCircle : FiLink} />
          {connected ? 'Connected' : hasPermissionError ? 'Permission required' : 'Not connected'}
        </span>

        <button type="button" className="dashboard-primary" onClick={connect} disabled={working}>
          <SafeIcon icon={connected ? FiRefreshCw : FiCalendar} />
          {working ? 'Waiting for Google…' : connected ? 'Reconnect Google' : 'Connect Google Calendar'}
        </button>

        {connected && (
          <button type="button" className="google-calendar-connection__disconnect" onClick={disconnect} disabled={working}>
            <SafeIcon icon={FiUnlink} />
            Disconnect
          </button>
        )}
      </div>

      {working && (
        <p className="booking-types__notice" role="status">
          Complete Google authorization in the separate sign-in window. This Configure Bookings page will stay open.
        </p>
      )}

      {message && (
        <p className="booking-types__notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

export default GoogleCalendarConnection;