import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import supabase from '../supabase/supabase';

function ProtectedRoute({ children }) {
  const [state, setState] = useState({
    loading: true,
    session: null
  });
  const location = useLocation();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setState({ loading: false, session: data.session });
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setState({ loading: false, session });
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (state.loading) {
    return (
      <main className="dashboard-loading">
        <div className="dashboard-loader" aria-label="Loading dashboard" />
      </main>
    );
  }

  if (!state.session) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;