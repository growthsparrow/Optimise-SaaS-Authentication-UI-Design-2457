import React,{useEffect,useState} from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import {isSuperAdmin} from '../services/adminService';

function AdminRoute({children}) {
  const location=useLocation();
  const [state,setState]=useState({
    loading:true,
    allowed:false
  });

  useEffect(()=> {
    let active=true;

    isSuperAdmin()
      .then((allowed)=> {
        if (active) {
          setState({
            loading:false,
            allowed
          });
        }
      })
      .catch(()=> {
        if (active) {
          setState({
            loading:false,
            allowed:false
          });
        }
      });

    return ()=> {
      active=false;
    };
  },[]);

  if (state.loading) {
    return (
      <main className="admin-loading">
        <div className="admin-spinner" />
        <span>Verifying administrator access…</span>
      </main>
    );
  }

  if (!state.allowed) {
    return (
      <Navigate
        to="/gsadmin/"
        replace
        state={{from:location}}
      />
    );
  }

  return children;
}

export default AdminRoute;