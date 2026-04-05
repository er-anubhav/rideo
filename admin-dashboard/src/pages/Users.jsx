import { useEffect, useState } from 'react';
import { Search, Ban, Trash2 } from 'lucide-react';
import { adminService } from '../services/api';
import { formatDate } from '../utils/helpers';

const roleTone = {
  admin: 'status-pill status-pill-strong',
  driver: 'status-pill',
  rider: 'status-pill status-pill-soft',
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (roleFilter) params.role = roleFilter;
      if (search) params.search = search;

      const response = await adminService.getUsers(params);
      setUsers(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers();
  };

  const handleBlockUser = async (userId) => {
    if (!confirm('Are you sure you want to block or unblock this user?')) return;
    try {
      await adminService.blockUser(userId);
      loadUsers();
    } catch (error) {
      alert('Failed to block user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await adminService.deleteUser(userId);
      loadUsers();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="page-kicker">Accounts</span>
          <h1 className="page-title">
            User <span className="display-accent">management</span>
          </h1>
          <p className="page-subtitle">Search, segment, and moderate every account from one structured review surface.</p>
        </div>
      </div>

      <div className="filter-shell">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_260px]">
          <div className="input-combo">
            <input
              type="text"
              placeholder="Search by name, phone, or email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="form-control"
            />
            <button onClick={handleSearch} className="button-primary" aria-label="Search users">
              <Search className="h-5 w-5" />
            </button>
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="form-control">
            <option value="">All Roles</option>
            <option value="rider">Riders</option>
            <option value="driver">Drivers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-semibold text-black">{user.name}</div>
                      <div className="table-note mt-1">{user.email || 'No email'}</div>
                    </td>
                    <td className="muted-number">{user.phone}</td>
                    <td>
                      <span className={roleTone[user.role] || 'status-pill status-pill-muted'}>{user.role}</span>
                    </td>
                    <td>
                      <span className={user.is_active ? 'status-pill status-pill-strong' : 'status-pill status-pill-muted'}>
                        {user.is_active ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="table-note">{formatDate(user.created_at)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBlockUser(user.id)}
                          className="button-icon"
                          title={user.is_active ? 'Block User' : 'Unblock User'}
                        >
                          <Ban className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="button-icon button-icon-danger"
                          title="Delete User"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 20 && (
        <div className="pagination-shell">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="button-secondary">
            Previous
          </button>
          <span className="table-note">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="button-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Users;
