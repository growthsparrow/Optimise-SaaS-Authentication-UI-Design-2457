import React, { useCallback, useEffect, useState } from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import AdminPackageForm from '../components/AdminPackageForm';
import {
  listPackages,
  listUsers,
  savePackage,
  setPackagePublished,
  setUserEnabled,
  signOutAdmin
} from '../services/adminService';
import './Admin.css';

const {
  FiEdit2,
  FiLogOut,
  FiPackage,
  FiPlus,
  FiShield,
  FiUsers
} = FiIcons;

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [editor, setEditor] = useState(null);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [userRows, packageRows] = await Promise.all([
        listUsers(),
        listPackages()
      ]);

      setUsers(userRows);
      setPackages(packageRows);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleUser = async (user) => {
    try {
      const updated = await setUserEnabled(user.id, !user.is_enabled);
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setNotice(
        updated.is_enabled
          ? `${updated.email} has been enabled.`
          : `${updated.email} has been disabled.`
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const togglePackage = async (packageItem) => {
    try {
      const updated = await setPackagePublished(
        packageItem.id,
        !packageItem.is_published
      );
      setPackages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setNotice(
        updated.is_published
          ? `${updated.name} is now published.`
          : `${updated.name} is now unpublished.`
      );
    } catch (error) {
      setNotice(error.message);
    }
  };

  const save = async (values, packageItem) => {
    try {
      const saved = await savePackage(values, packageItem);
      setPackages((current) =>
        packageItem
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current]
      );
      setEditor(null);
      setNotice(packageItem ? 'Package updated.' : 'Package created.');
    } catch (error) {
      setNotice(error.message);
    }
  };

  if (loading) {
    return (
      <main className="admin-loading">
        <div className="admin-spinner" />
        <span>Loading control center…</span>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span className="admin-brand-mark">
            <SafeIcon icon={FiShield} />
          </span>
          <span>
            <strong>Growth Sparrow</strong>
            <small>Super admin</small>
          </span>
        </div>

        <nav className="admin-nav">
          <button
            className={activeTab === 'users' ? 'is-active' : ''}
            onClick={() => setActiveTab('users')}
          >
            <SafeIcon icon={FiUsers} />
            Users
          </button>
          <button
            className={activeTab === 'packages' ? 'is-active' : ''}
            onClick={() => setActiveTab('packages')}
          >
            <SafeIcon icon={FiPackage} />
            Packages
          </button>
        </nav>

        <button
          className="admin-signout"
          onClick={async () => {
            await signOutAdmin();
            window.location.assign('/gsadmin/');
          }}
        >
          <SafeIcon icon={FiLogOut} />
          Sign out
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <span className="admin-kicker">Growth Sparrow control center</span>
            <h1>{activeTab === 'users' ? 'Workspace users' : 'Subscription packages'}</h1>
            <p>
              {activeTab === 'users'
                ? 'Review new Optimise signups and control workspace access.'
                : 'Create, refine, and publish the plans available to customers.'}
            </p>
          </div>

          {activeTab === 'packages' && (
            <button
              className="admin-primary-button"
              onClick={() => setEditor({ packageItem: null })}
            >
              <SafeIcon icon={FiPlus} />
              Create package
            </button>
          )}
        </header>

        {notice && <p className="admin-notice">{notice}</p>}

        {activeTab === 'users' ? (
          <section className="admin-table-card">
            <div className="admin-card-heading">
              <div>
                <span className="admin-kicker">Account directory</span>
                <h2>All signups</h2>
              </div>
              <strong>{users.length}</strong>
            </div>

            {users.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Business</th>
                      <th>Joined</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.full_name || 'Unnamed user'}</strong>
                          <small>{user.email}</small>
                        </td>
                        <td>{user.business_name || 'No business name'}</td>
                        <td>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={
                              user.is_enabled
                                ? 'admin-status admin-status--enabled'
                                : 'admin-status admin-status--disabled'
                            }
                          >
                            {user.is_enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td>
                          <button
                            className="admin-row-action"
                            onClick={() => toggleUser(user)}
                          >
                            {user.is_enabled ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">No signups have been recorded yet.</div>
            )}
          </section>
        ) : (
          <section className="admin-package-grid">
            {editor && (
              <AdminPackageForm
                packageItem={editor.packageItem}
                onClose={() => setEditor(null)}
                onSaved={save}
              />
            )}

            {packages.map((packageItem) => (
              <article className="admin-package-card" key={packageItem.id}>
                <div className="admin-package-card__top">
                  <span
                    className={
                      packageItem.is_published
                        ? 'admin-status admin-status--enabled'
                        : 'admin-status admin-status--disabled'
                    }
                  >
                    {packageItem.is_published ? 'Published' : 'Unpublished'}
                  </span>
                  <button
                    className="admin-icon-button"
                    onClick={() => setEditor({ packageItem })}
                    aria-label={`Edit ${packageItem.name}`}
                  >
                    <SafeIcon icon={FiEdit2} />
                  </button>
                </div>

                <h2>{packageItem.name}</h2>
                <p>{packageItem.description}</p>
                <strong className="admin-package-price">
                  ₹{Number(packageItem.price_inr).toLocaleString('en-IN')}
                  <small> / {packageItem.billing_period}</small>
                </strong>

                <ul>
                  {packageItem.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <button
                  className="admin-secondary-button"
                  onClick={() => togglePackage(packageItem)}
                >
                  {packageItem.is_published ? 'Unpublish' : 'Publish'}
                </button>
              </article>
            ))}

            {!packages.length && !editor && (
              <div className="admin-empty">
                No packages yet. Create your first subscription package.
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}

export default AdminDashboard;