import React,{useEffect,useState} from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import supabase from '../supabase/supabase';
import {isUserEnabled} from '../services/adminService';
import {getTeamMemberSession} from '../services/teamMemberService';

function ProtectedRoute({children}) {
  const [state,setState]=useState({
    loading:true,
    session:null,
    member:null,
    isEnabled:false
  });
  const location=useLocation();

  useEffect(()=> {
    let active=true;

    const checkAccess=async ()=> {
      const [{data:sessionData},member]=await Promise.all([
        supabase.auth.getSession(),
        Promise.resolve(getTeamMemberSession())
      ]);

      if (!active) {
        return;
      }

      if (member) {
        setState({
          loading:false,
          session:null,
          member,
          isEnabled:true
        });
        return;
      }

      const session=sessionData.session;

      if (!session) {
        setState({
          loading:false,
          session:null,
          member:null,
          isEnabled:false
        });
        return;
      }

      let enabled=false;

      try {
        enabled=await isUserEnabled();
      } catch {
        enabled=false;
      }

      if (active) {
        setState({
          loading:false,
          session,
          member:null,
          isEnabled:enabled
        });
      }
    };

    checkAccess();

    const {data}=supabase.auth.onAuthStateChange((_event,session)=> {
      if (!active) {
        return;
      }

      if (!session) {
        setState({
          loading:false,
          session:null,
          member:getTeamMemberSession(),
          isEnabled:false
        });
        return;
      }

      isUserEnabled()
        .then((enabled)=> {
          if (active) {
            setState({
              loading:false,
              session,
              member:null,
              isEnabled:enabled
            });
          }
        })
        .catch(()=> {
          if (active) {
            setState({
              loading:false,
              session,
              member:null,
              isEnabled:false
            });
          }
        });
    });

    return ()=> {
      active=false;
      data.subscription.unsubscribe();
    };
  },[]);

  if (state.loading) {
    return (
      <main className="dashboard-loading">
        <div className="dashboard-loader" aria-label="Loading dashboard" />
      </main>
    );
  }

  if (!state.session && !state.member) {
    return <Navigate to="/" replace state={{from:location}} />;
  }

  if (!state.isEnabled && !state.member) {
    return <Navigate to="/" replace state={{disabled:true}} />;
  }

  return children;
}

export default ProtectedRoute;