import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchSuperAdminUsers, secureDeleteAdminUser } from '../../services/authApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { toast } from 'sonner';
import UserDetailDrawer from '../../components/admin/UserDetailDrawer.jsx';
import SecureDeleteModal from '../../components/admin/SecureDeleteModal.jsx';

function VerificationBadge({ status }) {
  if (!status) return <span className="text-xs text-[var(--mh-text-muted)]">—</span>;
  const tones = {
    Approved: 'mh-badge-emerald',
    Pending: 'mh-badge-amber',
    Rejected: 'mh-badge-rose',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${tones[status] || 'mh-badge-indigo'}`}>
      {status}
    </span>
  );
}

export default function UsersDirectory() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    emailVerified: '',
    tutorVerification: '',
    hasRestriction: false,
    hasWarnings: false,
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const take = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchSuperAdminUsers({
        token,
        skip: (page - 1) * take,
        take,
        search,
        role: filters.role,
        emailVerified: filters.emailVerified === '' ? null : filters.emailVerified === 'true',
        tutorVerification: filters.tutorVerification,
        hasRestriction: filters.hasRestriction || null,
        hasWarnings: filters.hasWarnings || null,
      });
      setUsers(response.items || []);
      setTotalCount(response.totalCount || 0);
    } catch {
      toast.error('Failed to load users directory');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSecureDelete = async ({ adminPassword, reason }) => {
    setIsDeleting(true);
    try {
      await secureDeleteAdminUser({
        userId: deleteTarget.id,
        token,
        adminPassword,
        reason,
      });
      toast.success(`User ${deleteTarget.fullName} removed`);
      setDeleteTarget(null);
      setSelectedUserId(null);
      loadUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to remove user');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / take) || 1;

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6">
        <h2 className="font-heading text-2xl font-bold text-[var(--mh-text)]">User Directory</h2>
        <p className="mt-1 text-sm text-[var(--mh-text-muted)]">Search, filter, inspect profiles, and manage accounts securely.</p>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="mh-input flex-1 text-sm"
          />
          <select
            value={filters.role}
            onChange={(e) => { setFilters((f) => ({ ...f, role: e.target.value })); setPage(1); }}
            className="mh-input text-sm"
          >
            <option value="">All roles</option>
            <option value="Tutor">Tutor</option>
            <option value="Student">Student</option>
          </select>
          <select
            value={filters.tutorVerification}
            onChange={(e) => { setFilters((f) => ({ ...f, tutorVerification: e.target.value })); setPage(1); }}
            className="mh-input text-sm"
          >
            <option value="">Tutor verification</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            value={filters.emailVerified}
            onChange={(e) => { setFilters((f) => ({ ...f, emailVerified: e.target.value })); setPage(1); }}
            className="mh-input text-sm"
          >
            <option value="">Email status</option>
            <option value="true">Email verified</option>
            <option value="false">Email unverified</option>
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--mh-text)]">
            <input
              type="checkbox"
              checked={filters.hasRestriction}
              onChange={(e) => { setFilters((f) => ({ ...f, hasRestriction: e.target.checked })); setPage(1); }}
            />
            Restricted only
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--mh-border)] bg-[var(--mh-input-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--mh-text)]">
            <input
              type="checkbox"
              checked={filters.hasWarnings}
              onChange={(e) => { setFilters((f) => ({ ...f, hasWarnings: e.target.checked })); setPage(1); }}
            />
            Has warnings
          </label>
        </div>
      </div>

      <div className="mh-table-wrap shadow-sm">
        <div className="overflow-x-auto">
          <table className="mh-table">
            <thead>
              <tr>
                <th className="px-6 py-4 font-bold">User</th>
                <th className="px-6 py-4 font-bold">Role</th>
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">Tutor status</th>
                <th className="px-6 py-4 font-bold">Flags</th>
                <th className="px-6 py-4 font-bold">Joined</th>
                <th className="px-6 py-4 font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-[var(--mh-text-muted)]">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-8 text-center text-[var(--mh-text-muted)]">No users found.</td></tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="cursor-pointer transition-colors hover:bg-indigo-500/10"
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[var(--mh-text)]">{user.fullName}</div>
                      <div className="mh-cell-sub">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        user.role === 'Tutor' ? 'mh-badge-indigo' : 'mh-badge-sky'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isEmailVerified ? (
                        <span className="mh-badge-emerald text-xs font-bold">Verified</span>
                      ) : (
                        <span className="mh-badge-amber text-xs font-bold">Unverified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <VerificationBadge status={user.tutorVerificationStatus} />
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {user.hasActiveRestriction && <span className="mr-1 mh-badge-rose px-1.5 py-0.5 font-bold">Restricted</span>}
                      {user.activeWarningCount > 0 && (
                        <span className="mh-badge-amber px-1.5 py-0.5 font-bold">
                          {user.activeWarningCount} warn
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">{new Date(user.createdAtUtc).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/chat?partner=${encodeURIComponent(user.authUserId)}`)}
                          className="mh-btn-secondary text-xs"
                        >
                          Chat
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/super-admin/moderation?email=${encodeURIComponent(user.email)}`)}
                          className="mh-btn-manage"
                        >
                          Moderate
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(user)}
                          className="mh-btn-danger-soft"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--mh-border)] bg-[var(--mh-input-bg)] px-6 py-3">
            <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="mh-btn-secondary rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-[var(--mh-text-muted)]">Page {page} of {totalPages} ({totalCount} users)</span>
            <button type="button" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="mh-btn-secondary rounded-lg px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          token={token}
          onClose={() => setSelectedUserId(null)}
          onRequestDelete={(u) => setDeleteTarget({ id: u.id, fullName: u.fullName, email: u.email })}
        />
      )}

      {deleteTarget && (
        <SecureDeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleSecureDelete}
          isSubmitting={isDeleting}
        />
      )}
    </div>
  );
}
