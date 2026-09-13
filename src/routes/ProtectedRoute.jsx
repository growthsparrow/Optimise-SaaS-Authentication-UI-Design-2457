import React, {useEffect, useState} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import supabase from '../supabase/supabase';
import {getTeamMemberSession} from '../services/teamMemberService';

function ProtectedRoute({children}) {
  const [state, setState] = useState({
    loading: true,
    session: null,
    member: null
  });
  const location = useLocation();

  useEffect(() => {
    let active = true;

    Promise.all([
      supabase.auth.getSession(),
      Promise.resolve(getTeamMemberSession())
    ]).then(([sessionResult, member]) => {
      if (active) {
        setState({
          loading: false,
          session: sessionResult.data.session,
          member
        });
      }
    });

    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setState((current) => ({
          ...current,
          loading: false,
          session
        }));
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

  if (!state.session && !state.member) {
    return <Navigate to="/" replace state={{from: location}} />;
  }

  return children;
}

export default ProtectedRoute;