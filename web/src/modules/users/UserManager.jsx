import React, { useState, useEffect } from 'react';
import { Shield, Users, UserPlus, Key, Edit, Trash2, CheckSquare, Square, Save, X, RefreshCw } from 'lucide-react';
import { API_BASE } from '../../config';

// Predefined available permission keys and their user-friendly labels
const AVAILABLE_PERMISSIONS = [
  { id: 'pos', label: 'Point of Sale (POS)', desc: 'Place orders, bills, and handle cashier' },
  { id: 'delivery', label: 'Home Delivery', desc: 'Manage delivery orders, riders, status' },
  { id: 'tables', label: 'Table Manager', desc: 'Configure tables and floors layout' },
  { id: 'kds', label: 'Kitchen Display (KDS)', desc: 'Prepare and manage incoming KOTs' },
  { id: 'inventory', label: 'Menu Manager', desc: 'Add/edit food categories and items' },
  { id: 'stock', label: 'Kitchen Stock', desc: 'Monitor stock levels and log ingredients' },
  { id: 'suppliers', label: 'Suppliers Hub', desc: 'Supplier details and financial ledgers' },
  { id: 'khata', label: 'Khata Hub', desc: 'Credit accounts ledger for clients' },
  { id: 'expenses', label: 'Expense Tracker', desc: 'Log daily expenditures and bills' },
  { id: 'reports', label: 'Financial Reports', desc: 'View sales, cost, and cashflows' },
  { id: 'settings', label: 'System Settings', desc: 'Configure printer and server variables' },
  { id: 'users', label: 'User Manager', desc: 'Create and define staff access control' }
];

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing/Creating states
  const [editMode, setEditMode] = useState(false); // true if editing existing user
  const [selectedUser, setSelectedUser] = useState(null); // User currently being edited/created
  const [formOpen, setFormOpen] = useState(false); // Track if form panel is open
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    password: '',
    role: 'cashier',
    permissions: []
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('Failed to fetch users list');
      }
    } catch (err) {
      setError('Error connecting to backend server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditMode(false);
    setSelectedUser(null);
    setFormOpen(true);
    setFormData({
      username: '',
      name: '',
      password: '',
      role: 'cashier',
      permissions: ['pos', 'tables'] // default permissions
    });
    setError('');
    setSuccess('');
  };

  const handleOpenEdit = (user) => {
    setEditMode(true);
    setSelectedUser(user);
    setFormOpen(true);
    setFormData({
      username: user.username,
      name: user.name || '',
      password: '', // blank by default, only updated if filled
      role: user.role,
      permissions: user.permissions || []
    });
    setError('');
    setSuccess('');
  };

  const handleTogglePermission = (permId) => {
    setFormData(prev => {
      const isSet = prev.permissions.includes(permId);
      const updatedPerms = isSet
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: updatedPerms };
    });
  };

  const handleSelectAllPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: AVAILABLE_PERMISSIONS.map(p => p.id)
    }));
  };

  const handleClearPermissions = () => {
    setFormData(prev => ({
      ...prev,
      permissions: []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!editMode && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    try {
      let url = `${API_BASE}/users`;
      let method = 'POST';

      if (editMode && selectedUser) {
        url = `${API_BASE}/users/${selectedUser.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'Failed to save user configuration');
        return;
      }

      setSuccess(editMode ? 'User settings updated successfully!' : 'User created successfully!');
      fetchUsers();
      
      // Close/reset editing pane after a delay
      setTimeout(() => {
        setSelectedUser(null);
        setEditMode(false);
        setFormOpen(false);
      }, 1000);

    } catch (err) {
      setError('Network communication failed');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`${API_BASE}/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('User deleted successfully!');
        fetchUsers();
      } else {
        setError('Could not delete user account');
      }
    } catch (err) {
      setError('Failed to contact server');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-10">
          <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Alert Notification */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <p className="text-sm text-red-700 font-bold">{error}</p>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <p className="text-sm text-green-700 font-bold">{success}</p>
            <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">✕</button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Shield className="text-orange-500" size={26} /> Staff Role & Permission Control
            </h2>
            <p className="text-sm text-gray-500 font-semibold mt-1">Configure cashier credentials and screen permissions dynamically.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchUsers}
              className="p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 shadow-sm transition-all"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-5 py-3 bg-zinc-950 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-zinc-950/20 hover:bg-zinc-800 transition-all text-sm"
            >
              <UserPlus size={18} /> Add New User
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Side: Users List */}
          <div className={`${formOpen ? 'lg:col-span-6' : 'lg:col-span-12'} bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300`}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users size={18} className="text-gray-400" /> Active Users List
              </h3>
              <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 font-bold rounded-full">{users.length} Users</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-gray-400">
                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm font-semibold">Loading users list...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Users className="mx-auto mb-2 opacity-30" size={36} />
                <p className="text-sm font-semibold">No registered staff users found.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] uppercase font-black tracking-wider text-gray-400">
                      <th className="p-4 pl-6">Username</th>
                      <th className="p-4">Designated Role</th>
                      <th className="p-4">Permitted Modules</th>
                      <th className="p-4 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="p-4 pl-6 font-bold text-gray-900">{u.username}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-full ${
                            u.role === 'admin' ? 'bg-orange-50 text-orange-600' :
                            u.role === 'cashier' ? 'bg-blue-50 text-blue-600' :
                            u.role === 'waiter' ? 'bg-purple-50 text-purple-600' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-gray-500 font-semibold max-w-[240px] truncate">
                            {u.permissions && u.permissions.length > 0 
                              ? u.permissions.join(', ')
                              : 'No access granted'}
                          </p>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:text-orange-500 hover:border-orange-200 transition-all"
                            >
                              <Edit size={14} />
                            </button>
                            {u.username !== 'admin' && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 bg-red-50 border border-red-100 rounded-lg text-red-500 hover:bg-red-100 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Side: Create/Edit Form */}
          {formOpen && (
            <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-visible animate-slideUp flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-zinc-950 text-white flex-shrink-0">
                <h3 className="font-bold flex items-center gap-2">
                  <Shield size={18} className="text-orange-400" />
                  {editMode && selectedUser ? `Edit User: ${selectedUser.username}` : 'Create Staff Member'}
                </h3>
                <button 
                  onClick={() => setFormOpen(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col">
                {/* Scrollable content area */}
                <div className="px-6 pt-6 pb-4 space-y-6">
                
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Username</label>
                  <input 
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    placeholder="Enter unique staff username..."
                    disabled={editMode && selectedUser?.username === 'admin'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-sm text-gray-800"
                  />
                </div>

                {/* Full Name Input */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter staff member's full name..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-sm text-gray-800"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                    {editMode ? 'New Password (Leave empty to keep current)' : 'Password'}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-3 text-gray-400" size={18} />
                    <input 
                      type="password" 
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editMode ? '••••••••' : 'Enter pass key...'}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:outline-none focus:border-orange-400 focus:bg-white transition-all text-sm text-gray-800"
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">System Role</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['admin', 'cashier', 'waiter', 'kitchen'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: r })}
                        className={`py-3 px-2 border rounded-xl text-center font-bold text-xs uppercase tracking-wide transition-all ${
                          formData.role === r 
                            ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Permissions Toggles */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Module Permissions</label>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={handleSelectAllPermissions}
                        className="text-[10px] font-black text-orange-600 uppercase hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button 
                        type="button" 
                        onClick={handleClearPermissions}
                        className="text-[10px] font-black text-gray-500 uppercase hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50/50 custom-scrollbar">
                    {AVAILABLE_PERMISSIONS.map(perm => {
                      const isChecked = formData.permissions.includes(perm.id);
                      return (
                        <button
                          key={perm.id}
                          type="button"
                          onClick={() => handleTogglePermission(perm.id)}
                          className={`flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all ${
                            isChecked 
                              ? 'bg-white border-orange-200 shadow-sm' 
                              : 'bg-transparent border-transparent hover:bg-gray-100/50'
                          }`}
                        >
                          <span className="mt-0.5 text-orange-500">
                            {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-gray-300" />}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{perm.label}</p>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5 leading-snug">{perm.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </div>

                {/* Fixed button area */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3 flex-shrink-0 sticky bottom-0">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-zinc-950 text-white font-bold rounded-xl shadow-lg shadow-zinc-900/10 hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Save size={16} /> {editMode ? 'Save Settings' : 'Create Account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-5 py-3.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all text-sm whitespace-nowrap"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
        </div>
        </div>
      </div>
    </div>
  );
}
