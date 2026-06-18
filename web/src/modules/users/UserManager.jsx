import React, { useState, useEffect } from 'react';
import {
  Shield, Users, UserPlus, Key, Edit, Trash2, CheckSquare, Square,
  Save, X, RefreshCw, Search, Check, Info, Lock, Eye, EyeOff, UserCheck
} from 'lucide-react';
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
  { id: 'chat', label: 'Team Chat Access', desc: 'Allow user to participate in real-time internal messaging' },
  { id: 'users', label: 'User Manager', desc: 'Create and define staff access control' },
  { id: 'sync', label: 'Sync Queue Manager', desc: 'Monitor offline sync queues and errors' },
  { id: 'queue', label: 'Customer Queue Display', desc: 'Open the customer-facing order queue TV screen' }
];

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Editing/Creating states
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
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
    setShowFormPassword(false);
    setFormData({
      username: '',
      name: '',
      password: '',
      role: 'cashier',
      permissions: ['pos', 'tables']
    });
    setError('');
    setSuccess('');
  };

  const handleOpenEdit = (user) => {
    setEditMode(true);
    setSelectedUser(user);
    setFormOpen(true);
    setShowFormPassword(false);
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

      setTimeout(() => {
        setSelectedUser(null);
        setEditMode(false);
        setFormOpen(false);
      }, 1000);

    } catch (err) {
      setError('Network communication failed');
    }
  };

  const handleResetPin = async () => {
    if (!selectedUser) return;
    if (!window.confirm("Are you sure you want to reset this user's PIN? They will be asked to set a new one on their next login.")) return;

    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, reset_pin: true })
      });
      if (response.ok) {
        setSuccess('PIN reset successfully. User must set a new PIN on next login.');
        fetchUsers();
        setTimeout(() => {
          setSelectedUser(null);
          setEditMode(false);
          setFormOpen(false);
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reset PIN');
      }
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

  // Filter users by search term
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Statistics summaries
  const getRoleCount = (role) => users.filter(u => u.role === role).length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50/50 custom-scrollbar">
      <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">

        {/* Header Alert Notification */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl shadow-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-bold">⚠️</span>
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-sm flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <p className="text-sm text-emerald-700 font-bold">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600 font-bold">✕</button>
          </div>
        )}

        {/* Dashboard Title & Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <Shield className="text-orange-500" size={32} /> Staff Management Hub
            </h2>
            <p className="text-sm text-slate-500 font-semibold mt-1">Configure credentials, roles, and modular screen permissions dynamically.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-sm transition-all"
              title="Refresh Users"
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-6 py-3.5 bg-orange-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all text-sm"
            >
              <UserPlus size={18} /> Add New Staff
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Admins', count: getRoleCount('admin'), color: 'text-orange-600 bg-orange-50 border-orange-100' },
            { label: 'Cashiers', count: getRoleCount('cashier'), color: 'text-blue-600 bg-blue-50 border-blue-100' },
            { label: 'Waiters', count: getRoleCount('waiter'), color: 'text-purple-600 bg-purple-50 border-purple-100' },
            { label: 'Kitchen', count: getRoleCount('kitchen'), color: 'text-green-600 bg-green-50 border-green-100' },
            { label: 'Riders', count: getRoleCount('rider'), color: 'text-teal-600 bg-teal-50 border-teal-100' }
          ].map((item, idx) => (
            <div key={idx} className={`p-4 border rounded-2xl ${item.color} flex flex-col justify-between shadow-sm`}>
              <span className="text-[10px] font-black uppercase tracking-wider opacity-80">{item.label}</span>
              <span className="text-2xl font-black mt-1">{item.count}</span>
            </div>
          ))}
        </div>

        {/* Main Double Column Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Side: Users List & Search */}
          <div className={`${formOpen ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by username, name, or role..."
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all text-sm shadow-sm"
              />
            </div>

            {/* List Wrapper */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Active Staff Members</span>
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 font-bold rounded-full">{filteredUsers.length} Found</span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  <p className="text-sm font-semibold">Loading users list...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Users className="mx-auto mb-2 opacity-30" size={36} />
                  <p className="text-sm font-semibold">No registered staff users match your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredUsers.map(u => (
                    <div
                      key={u.id}
                      className={`p-2 rounded-lg border transition-all duration-300 flex items-center justify-between gap-2 ${selectedUser?.id === u.id
                        ? 'border-orange-500 bg-orange-50/10 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-black shrink-0 uppercase text-[10px]">
                          {u.username.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-slate-900 text-xs truncate leading-none">{u.name || u.username.toUpperCase()}</p>
                            <span className={`px-1 py-0.2 text-[7px] font-black tracking-wider uppercase rounded shrink-0 leading-none ${u.role === 'admin' ? 'bg-orange-100 text-orange-700' :
                              u.role === 'cashier' ? 'bg-blue-100 text-blue-700' :
                                u.role === 'waiter' ? 'bg-purple-100 text-purple-700' :
                                  u.role === 'kitchen' ? 'bg-green-100 text-green-700' :
                                    'bg-teal-100 text-teal-700'
                              }`}>
                              {u.role}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5 leading-none">@{u.username} · {u.permissions ? `${u.permissions.length} modules` : '0 modules'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1 bg-slate-50 border border-slate-200 rounded text-slate-600 hover:text-orange-500 hover:border-orange-200 transition-all"
                          title="Edit User"
                        >
                          <Edit size={10} />
                        </button>
                        {u.username !== 'admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1 bg-red-50 border border-red-100 rounded text-red-500 hover:bg-red-100 transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Create/Edit Form (Flow layout, scroll handled by page) */}
          <div className="lg:col-span-5">
            {formOpen ? (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-lg overflow-hidden flex flex-col animate-fadeIn">

                {/* Form Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <UserCheck className="text-orange-400" size={18} />
                    <h3 className="font-bold text-sm">
                      {editMode && selectedUser ? `Edit: ${selectedUser.username}` : 'Create Staff Member'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setFormOpen(false)}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form Element */}
                <form onSubmit={handleSubmit} className="flex flex-col bg-white" autoComplete="off">

                  {/* Input Area */}
                  <div className="p-6 space-y-5 bg-white">

                    {/* Username Input */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Username (ID)</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                        placeholder="e.g. hammad"
                        disabled={editMode && selectedUser?.username === 'admin'}
                        autoComplete="off"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-sm text-slate-800"
                      />
                    </div>

                    {/* Full Name Input */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Hammad"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-sm text-slate-800"
                      />
                    </div>

                    {/* Password Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {editMode ? 'New Access Key (Blank = No change)' : 'Access Key (Blank = Let User Set)'}
                        </label>
                        {editMode && (
                          <button
                            type="button"
                            onClick={handleResetPin}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 px-2 py-0.5 rounded"
                          >
                            FORCE PIN RESET
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3.5 text-slate-400" size={16} />
                        <input
                          type={showFormPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={editMode ? "••••••••" : "Enter access PIN/password"}
                          autoComplete="new-password"
                          className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-sm text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFormPassword(!showFormPassword)}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                        >
                          {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* System Role Selection */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Designated Role</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['admin', 'cashier', 'waiter', 'kitchen', 'rider'].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setFormData({ ...formData, role: r })}
                            className={`py-2 px-1 border rounded-lg text-center font-bold text-[10px] uppercase tracking-wider transition-all ${formData.role === r
                              ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Permissions Section */}
                    <div className="border-t border-slate-100 pt-4">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modules Allowed</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllPermissions}
                            className="text-[9px] font-black text-orange-600 uppercase hover:underline"
                          >
                            All
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={handleClearPermissions}
                            className="text-[9px] font-black text-slate-500 uppercase hover:underline"
                          >
                            None
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-100 rounded-xl p-2 bg-slate-50/50">
                        {AVAILABLE_PERMISSIONS.map(perm => {
                          const isChecked = formData.permissions.includes(perm.id);
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => handleTogglePermission(perm.id)}
                              className={`flex items-start gap-3 p-2 rounded-lg border text-left transition-all ${isChecked
                                ? 'bg-white border-orange-200 shadow-sm'
                                : 'bg-transparent border-transparent hover:bg-slate-100/50'
                                }`}
                            >
                              <span className="mt-0.5 text-orange-500">
                                {isChecked ? <CheckSquare size={16} /> : <Square size={16} className="text-slate-300" />}
                              </span>
                              <div>
                                <p className="text-xs font-bold text-slate-800">{perm.label}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 leading-snug">{perm.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Button Footer */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 text-white font-extrabold rounded-xl shadow hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <Save size={14} /> {editMode ? 'Save Settings' : 'Create Account'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormOpen(false)}
                      className="px-4 py-3 bg-white border border-slate-200 text-slate-700 font-extrabold rounded-xl hover:bg-slate-50 transition-all text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Placeholder State
              <div className="bg-slate-100/40 border border-dashed border-slate-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center h-[360px] space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shadow-inner">
                  <Shield size={26} />
                </div>
                <div>
                  <p className="font-extrabold text-slate-700 text-base">Select Staff Profile</p>
                  <p className="text-xs text-slate-400 font-semibold max-w-[220px] mx-auto mt-1 leading-relaxed">
                    Click the edit icon on any staff card to modify their credentials, role, and module permissions.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Create New Account
                </button>
              </div>
            )}
          </div>

        </div>
        <div className="h-24" />
      </div>
    </div>
  );
}
