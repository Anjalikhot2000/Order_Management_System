import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../components/currency';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, CircularProgress,
} from '@mui/material';

/* ── inline style tokens ───────────────────────────────────── */
const card = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #e5e7eb',
  boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
};

const btnBase = {
  border: 'none',
  cursor: 'pointer',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: '0.78rem',
  padding: '0.35rem 0.85rem',
  transition: 'opacity .15s',
  whiteSpace: 'nowrap',
};

const STATUS_COLORS = {
  active:  { bg: '#dcfce7', color: '#16a34a' },
  blocked: { bg: '#fee2e2', color: '#dc2626' },
};

const ITEMS_PER_PAGE = 10;

/* ═══════════════════════════════════════════════════════════ */
const CustomerManagement = () => {
  const { user } = useAuth();

  /* ── state ─────────────────────────────────────────────── */
  const [customers,   setCustomers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterStatus,setFilterStatus]= useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // view modal
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewOrders,   setViewOrders]   = useState([]);
  const [viewLoading,  setViewLoading]  = useState(false);

  // edit modal
  const [editCustomer, setEditCustomer] = useState(null);
  const [editForm,     setEditForm]     = useState({ name:'', email:'', phone:'', city:'', country:'' });
  const [editErrors,   setEditErrors]   = useState({});

  // add modal
  const [addOpen,      setAddOpen]      = useState(false);
  const [addForm,      setAddForm]      = useState({ name:'', email:'', password:'', phone:'', role:'customer' });
  const [addErrors,    setAddErrors]    = useState({});

  // delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : {};
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/customers', getAuthConfig());
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── fetch ─────────────────────────────────────────────── */
  useEffect(() => {
    if (user?.role === 'admin') fetchCustomers();
  }, [user, fetchCustomers]);

  /* ── toast helper ───────────────────────────────────────── */
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── access guard (after all hooks) ────────────────────── */
  if (user?.role !== 'admin') {
    return (
      <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>
        <div style={{ ...card, padding:'2.5rem 3rem', textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>🚫</div>
          <p style={{ color:'#dc2626', fontWeight:700, fontSize:'1.1rem', margin:0 }}>
            Access Denied: Admins only
          </p>
        </div>
      </div>
    );
  }

  /* ── filtering ─────────────────────────────────────────── */
  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'blocked' ? c.status === 'blocked' : c.status !== 'blocked');
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const goPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  /* ── view ───────────────────────────────────────────────── */
  const handleView = async (customer) => {
    setViewCustomer(customer);
    setViewOrders([]);
    setViewLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/customers/${customer.id}`, getAuthConfig());
      setViewOrders(res.data.orders || []);
    } catch {
      setViewOrders([]);
    } finally {
      setViewLoading(false);
    }
  };

  /* ── edit ───────────────────────────────────────────────── */
  const openEdit = (c) => {
    setEditCustomer(c);
    setEditForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', city: c.city || '', country: c.country || '' });
    setEditErrors({});
  };

  const openAdd = () => {
    setAddOpen(true);
    setAddForm({ name:'', email:'', password:'', phone:'', role:'customer' });
    setAddErrors({});
  };

  const validateAdd = () => {
    const errs = {};
    if (!addForm.name.trim()) errs.name = 'Name is required';
    if (!addForm.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) errs.email = 'Invalid email address';
    if (!addForm.password) errs.password = 'Password is required';
    return errs;
  };

  const saveAdd = async () => {
    const errs = validateAdd();
    if (Object.keys(errs).length) {
      setAddErrors(errs);
      return;
    }

    setActionLoading(true);
    try {
      await axios.post('http://localhost:5000/api/customers', {
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password,
        phone: addForm.phone.trim(),
        role: 'customer',
      }, getAuthConfig());
      setAddOpen(false);
      setCurrentPage(1);
      await fetchCustomers();
      showToast('Customer added successfully');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to add customer';
      if (/email/i.test(message)) {
        setAddErrors((prev) => ({ ...prev, email: message }));
      }
      showToast(message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const validateEdit = () => {
    const errs = {};
    if (!editForm.name.trim())  errs.name  = 'Name is required';
    if (!editForm.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) errs.email = 'Invalid email address';
    return errs;
  };

  const saveEdit = async () => {
    const errs = validateEdit();
    if (Object.keys(errs).length) { setEditErrors(errs); return; }
    setActionLoading(true);
    try {
      await axios.put(`http://localhost:5000/api/customers/${editCustomer.id}`, editForm, getAuthConfig());
      setCustomers(prev => prev.map(c => c.id === editCustomer.id ? { ...c, ...editForm } : c));
      setEditCustomer(null);
      showToast('Customer updated successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── block / unblock ────────────────────────────────────── */
  const handleBlock = async (customerId) => {
    const normalizedId = Number.parseInt(customerId, 10);
    console.log('[CustomerManagement] handleBlock triggered for customer:', customerId, 'normalized:', normalizedId);
    const targetCustomer = customers.find((customer) => customer.id === normalizedId || customer.user_id === normalizedId);
    if (!targetCustomer) {
      console.warn('[CustomerManagement] Customer not found for block toggle:', customerId);
      showToast('Customer not found', 'error');
      return;
    }

    const previousStatus = targetCustomer.status;
    const newStatus = previousStatus === 'blocked' ? 'active' : 'blocked';

    setCustomers((prev) => prev.map((customer) => (
      customer.id === targetCustomer.id
        ? { ...customer, status: newStatus }
        : customer
    )));

    if (viewCustomer?.id === targetCustomer.id) {
      setViewCustomer((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }

    setActionLoading(true);
    try {
      try {
        await axios.put(
          `http://localhost:5000/api/customers/${targetCustomer.id}/block`,
          { status: newStatus },
          getAuthConfig()
        );
      } catch (primaryError) {
        console.warn('[CustomerManagement] Primary block request failed, retrying with user_id:', targetCustomer.user_id, primaryError);
        if (!targetCustomer.user_id) throw primaryError;
        await axios.put(
          `http://localhost:5000/api/customers/${targetCustomer.user_id}/block`,
          { status: newStatus },
          getAuthConfig()
        );
      }
      showToast(`Customer ${newStatus === 'blocked' ? 'blocked' : 'unblocked'}`);
    } catch (err) {
      console.error('[CustomerManagement] Block toggle failed for customer:', customerId, err);
      setCustomers((prev) => prev.map((customer) => (
        customer.id === targetCustomer.id
          ? { ...customer, status: previousStatus }
          : customer
      )));
      if (viewCustomer?.id === targetCustomer.id) {
        setViewCustomer((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      }
      showToast(err.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── delete ─────────────────────────────────────────────── */
  const handleDelete = (customerId) => {
    const normalizedId = Number.parseInt(customerId, 10);
    console.log('[CustomerManagement] handleDelete triggered for customer:', customerId, 'normalized:', normalizedId);
    const targetCustomer = customers.find((customer) => customer.id === normalizedId || customer.user_id === normalizedId);
    if (!targetCustomer) {
      console.warn('[CustomerManagement] Customer not found for delete:', customerId);
      showToast('Customer not found', 'error');
      return;
    }
    setDeleteTarget(targetCustomer);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const selectedId = deleteTarget.id;
    const selectedUserId = deleteTarget.user_id;
    console.log('[CustomerManagement] confirmDelete triggered for customer:', selectedId);
    const previousCustomers = customers;

    setCustomers((prev) => prev.filter((customer) => customer.id !== selectedId));
    if (viewCustomer?.id === selectedId) {
      setViewCustomer(null);
      setViewOrders([]);
    }
    setDeleteTarget(null);
    setActionLoading(true);
    try {
      try {
        await axios.delete(`http://localhost:5000/api/customers/${selectedId}`, getAuthConfig());
      } catch (primaryError) {
        console.warn('[CustomerManagement] Primary delete request failed, retrying with user_id:', selectedUserId, primaryError);
        if (!selectedUserId) throw primaryError;
        await axios.delete(`http://localhost:5000/api/customers/${selectedUserId}`, getAuthConfig());
      }
      setCurrentPage((prev) => {
        const nextCount = previousCustomers.length - 1;
        const nextTotalPages = Math.max(1, Math.ceil(nextCount / ITEMS_PER_PAGE));
        return Math.min(prev, nextTotalPages);
      });
      showToast('Customer deleted');
    } catch (err) {
      console.error('[CustomerManagement] Delete failed for customer:', selectedId, err);
      setCustomers(previousCustomers);
      showToast(err.response?.data?.message || 'Delete failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ── render ─────────────────────────────────────────────── */
  return (
    <section style={{ padding:'2rem', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position:'fixed', top:24, right:24, zIndex:9999,
          background: toast.type === 'error' ? '#dc2626' : '#16a34a',
          color:'#fff', padding:'0.85rem 1.5rem', borderRadius:10,
          fontWeight:600, fontSize:'0.95rem',
          boxShadow:'0 4px 24px rgba(0,0,0,0.18)',
          pointerEvents:'none',
        }}>
          {toast.message}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h2 style={{ margin:0, fontWeight:800, fontSize:'1.5rem', color:'#0f172a' }}>Customer Management</h2>
          <p style={{ margin:'0.25rem 0 0', color:'#64748b', fontSize:'0.9rem' }}>
            {filtered.length} customer{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
          <button
            onClick={openAdd}
            style={{ ...btnBase, background:'#16a34a', color:'#fff', padding:'0.5rem 1.25rem', fontSize:'0.875rem' }}
          >
            ➕ Add Customer
          </button>
          <button
            onClick={fetchCustomers}
            style={{ ...btnBase, background:'#0f4c81', color:'#fff', padding:'0.5rem 1.25rem', fontSize:'0.875rem' }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Search & Filter ─────────────────────────────────── */}
      <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap', alignItems:'center' }}>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="customer-management-search"
        />
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          style={{
            padding:'0.65rem 1rem', border:'1.5px solid #e5e7eb',
            borderRadius:10, fontSize:'0.9rem', background:'#fff',
            cursor:'pointer', outline:'none', minWidth:140,
          }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div style={{ ...card, overflowX:'auto' }}>
        {loading ? (
          <div style={{ padding:'3rem', textAlign:'center' }}>
            <CircularProgress size={32} />
          </div>
        ) : paginated.length === 0 ? (
          <p style={{ padding:'3rem', textAlign:'center', color:'#64748b', margin:0 }}>
            No customers match your search.
          </p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.9rem' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e5e7eb' }}>
                {['ID','Name','Email','Total Orders','Status','Joined','Actions'].map(h => (
                  <th key={h} style={{
                    padding:'0.85rem 1rem', textAlign:'left',
                    fontWeight:700, color:'#374151', fontSize:'0.82rem',
                    letterSpacing:'0.03em', whiteSpace:'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((c, idx) => {
                const sc = STATUS_COLORS[c.status] || STATUS_COLORS.active;
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding:'0.85rem 1rem', color:'#64748b', fontWeight:600 }}>#{c.id}</td>
                    <td style={{ padding:'0.85rem 1rem', fontWeight:700, color:'#0f172a' }}>{c.name}</td>
                    <td style={{ padding:'0.85rem 1rem', color:'#475569' }}>{c.email}</td>
                    <td style={{ padding:'0.85rem 1rem', textAlign:'center', fontWeight:700, color:'#0f172a' }}>
                      {c.total_orders ?? 0}
                    </td>
                    <td style={{ padding:'0.85rem 1rem' }}>
                      <span style={{
                        display:'inline-block', padding:'0.22rem 0.8rem',
                        borderRadius:999, fontWeight:700, fontSize:'0.78rem',
                        background: sc.bg, color: sc.color,
                      }}>
                        {c.status === 'blocked' ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding:'0.85rem 1rem', color:'#64748b', whiteSpace:'nowrap' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding:'0.85rem 1rem' }}>
                      <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                        {/* View — Blue */}
                        <button
                          onClick={() => handleView(c)}
                          style={{ ...btnBase, background:'#3b82f6', color:'#fff' }}
                          title="View Details"
                        >View</button>
                        {/* Edit — Purple */}
                        <button
                          onClick={() => openEdit(c)}
                          style={{ ...btnBase, background:'#7c3aed', color:'#fff' }}
                          title="Edit Customer"
                        >Edit</button>
                        {/* Block/Unblock — Orange / Green */}
                        <button
                          onClick={() => handleBlock(c.id)}
                          disabled={actionLoading}
                          style={{ ...btnBase, background: c.status === 'blocked' ? '#16a34a' : '#ea580c', color:'#fff' }}
                          title={c.status === 'blocked' ? 'Unblock Customer' : 'Block Customer'}
                        >
                          {c.status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                        {/* Delete — Red */}
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{ ...btnBase, background:'#dc2626', color:'#fff' }}
                          title="Delete Customer"
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display:'flex', gap:'0.4rem', justifyContent:'center', alignItems:'center', flexWrap:'wrap' }}>
          <button onClick={() => goPage(currentPage - 1)} disabled={currentPage === 1}
            style={{ ...btnBase, background:'#e5e7eb', color:'#374151', padding:'0.4rem 0.8rem' }}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => goPage(i + 1)}
              style={{
                ...btnBase,
                background: currentPage === i + 1 ? '#0f4c81' : '#e5e7eb',
                color:      currentPage === i + 1 ? '#fff'    : '#374151',
                padding:'0.4rem 0.8rem',
              }}
            >{i + 1}</button>
          ))}
          <button onClick={() => goPage(currentPage + 1)} disabled={currentPage === totalPages}
            style={{ ...btnBase, background:'#e5e7eb', color:'#374151', padding:'0.4rem 0.8rem' }}>›</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          VIEW DETAILS MODAL
      ════════════════════════════════════════════════════ */}
      <Dialog open={!!viewCustomer} onClose={() => setViewCustomer(null)} maxWidth="md" fullWidth
        PaperProps={{ style:{ borderRadius:16, overflow:'hidden' } }}>
        <DialogTitle style={{ background:'#0f4c81', color:'#fff', fontWeight:800, fontSize:'1.15rem' }}>
          Customer Details — {viewCustomer?.name}
        </DialogTitle>
        <DialogContent dividers style={{ padding:'1.5rem' }}>
          {viewCustomer && (
            <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
              {/* Info grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'1rem' }}>
                {[
                  ['Customer ID', `#${viewCustomer.id}`],
                  ['Name',        viewCustomer.name],
                  ['Email',       viewCustomer.email],
                  ['Phone',       viewCustomer.phone || '—'],
                  ['City',        viewCustomer.city || '—'],
                  ['Country',     viewCustomer.country || '—'],
                  ['Total Orders',viewCustomer.total_orders ?? 0],
                  ['Status',      viewCustomer.status === 'blocked' ? '🔴 Blocked' : '🟢 Active'],
                  ['Joined',      viewCustomer.created_at ? new Date(viewCustomer.created_at).toLocaleDateString() : '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ background:'#f8fafc', borderRadius:10, padding:'0.85rem 1rem' }}>
                    <p style={{ margin:0, fontSize:'0.75rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
                    <p style={{ margin:'0.3rem 0 0', fontWeight:700, color:'#0f172a', fontSize:'0.95rem', wordBreak:'break-all' }}>{String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Address */}
              {viewCustomer.address && (
                <div style={{ background:'#f8fafc', borderRadius:10, padding:'0.85rem 1rem' }}>
                  <p style={{ margin:0, fontSize:'0.75rem', color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>Address</p>
                  <p style={{ margin:'0.3rem 0 0', color:'#0f172a', fontSize:'0.95rem' }}>{viewCustomer.address}</p>
                </div>
              )}

              {/* Order history */}
              <div>
                <h4 style={{ margin:'0 0 0.75rem', fontWeight:800, color:'#0f172a' }}>Order History</h4>
                {viewLoading ? (
                  <div style={{ textAlign:'center', padding:'1.5rem' }}><CircularProgress size={28} /></div>
                ) : viewOrders.length === 0 ? (
                  <p style={{ color:'#64748b', fontStyle:'italic' }}>No orders found for this customer.</p>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.875rem' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e5e7eb' }}>
                          {['Order #','Status','Payment','Total','Date'].map(h => (
                            <th key={h} style={{ padding:'0.6rem 0.85rem', textAlign:'left', fontWeight:700, color:'#374151', fontSize:'0.8rem' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {viewOrders.map(o => (
                          <tr key={o.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                            <td style={{ padding:'0.6rem 0.85rem', fontWeight:700 }}>#{o.id}</td>
                            <td style={{ padding:'0.6rem 0.85rem' }}>
                              <span style={{ fontSize:'0.78rem', fontWeight:700, padding:'0.2rem 0.65rem', borderRadius:999, background:'#e0f2fe', color:'#0369a1' }}>
                                {o.status}
                              </span>
                            </td>
                            <td style={{ padding:'0.6rem 0.85rem', color:'#475569' }}>{o.payment_status}</td>
                            <td style={{ padding:'0.6rem 0.85rem', fontWeight:700 }}>{formatCurrency(o.total_amount)}</td>
                            <td style={{ padding:'0.6rem 0.85rem', color:'#64748b' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
        <DialogActions style={{ padding:'1rem 1.5rem', gap:'0.5rem' }}>
          <Button
            variant="contained"
            onClick={() => viewCustomer && handleBlock(viewCustomer.id)}
            disabled={actionLoading}
            style={{
              background: viewCustomer?.status === 'blocked' ? '#16a34a' : '#ea580c',
              borderRadius:8, fontWeight:700, textTransform:'none',
            }}
          >
            {viewCustomer?.status === 'blocked' ? 'Unblock Customer' : 'Block Customer'}
          </Button>
          <Button onClick={() => setViewCustomer(null)} style={{ borderRadius:8, fontWeight:700, textTransform:'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          EDIT MODAL
      ════════════════════════════════════════════════════ */}
      <Dialog open={!!editCustomer} onClose={() => setEditCustomer(null)} maxWidth="sm" fullWidth
        PaperProps={{ style:{ borderRadius:16 } }}>
        <DialogTitle style={{ fontWeight:800, fontSize:'1.1rem', color:'#0f172a' }}>
          Edit Customer — {editCustomer?.name}
        </DialogTitle>
        <DialogContent dividers style={{ padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
          <TextField
            label="Full Name" fullWidth size="small"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            error={!!editErrors.name} helperText={editErrors.name}
          />
          <TextField
            label="Email Address" fullWidth size="small" type="email"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            error={!!editErrors.email} helperText={editErrors.email}
          />
          <TextField
            label="Phone" fullWidth size="small"
            value={editForm.phone}
            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
          />
          <TextField
            label="City" fullWidth size="small"
            value={editForm.city}
            onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
          />
          <TextField
            label="Country" fullWidth size="small"
            value={editForm.country}
            onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}
          />
        </DialogContent>
        <DialogActions style={{ padding:'1rem 1.5rem', gap:'0.5rem' }}>
          <Button onClick={() => setEditCustomer(null)} style={{ textTransform:'none', fontWeight:700, borderRadius:8 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveEdit}
            disabled={actionLoading}
            style={{ background:'#7c3aed', textTransform:'none', fontWeight:700, borderRadius:8 }}
          >
            {actionLoading ? <CircularProgress size={18} style={{ color:'#fff' }} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          ADD CUSTOMER MODAL
      ════════════════════════════════════════════════════ */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ style:{ borderRadius:16 } }}>
        <DialogTitle style={{ fontWeight:800, fontSize:'1.1rem', color:'#0f172a' }}>
          Add Customer
        </DialogTitle>
        <DialogContent dividers style={{ padding:'1.25rem 1.5rem', display:'flex', flexDirection:'column', gap:'1rem' }}>
          <TextField
            label="Full Name" fullWidth size="small"
            value={addForm.name}
            onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
            error={!!addErrors.name} helperText={addErrors.name}
          />
          <TextField
            label="Email Address" fullWidth size="small" type="email"
            value={addForm.email}
            onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
            error={!!addErrors.email} helperText={addErrors.email}
          />
          <TextField
            label="Password" fullWidth size="small" type="password"
            value={addForm.password}
            onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))}
            error={!!addErrors.password} helperText={addErrors.password}
          />
          <TextField
            label="Phone (Optional)" fullWidth size="small"
            value={addForm.phone}
            onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
          />
          <TextField
            label="Role" fullWidth size="small"
            value={addForm.role}
            slotProps={{ input: { readOnly: true } }}
            disabled
            helperText="Customers created here are always assigned the customer role."
          />
        </DialogContent>
        <DialogActions style={{ padding:'1rem 1.5rem', gap:'0.5rem' }}>
          <Button onClick={() => setAddOpen(false)} style={{ textTransform:'none', fontWeight:700, borderRadius:8 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveAdd}
            disabled={actionLoading}
            style={{ background:'#16a34a', textTransform:'none', fontWeight:700, borderRadius:8 }}
          >
            {actionLoading ? <CircularProgress size={18} style={{ color:'#fff' }} /> : 'Create Customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ════════════════════════════════════════════════════ */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs"
        PaperProps={{ style:{ borderRadius:16 } }}>
        <DialogTitle style={{ fontWeight:800, color:'#dc2626' }}>Delete Customer</DialogTitle>
        <DialogContent style={{ padding:'0 1.5rem 1rem' }}>
          <p style={{ color:'#374151', margin:0 }}>
            Are you sure you want to permanently delete{' '}
            <strong>{deleteTarget?.name}</strong>?
            This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions style={{ padding:'1rem 1.5rem', gap:'0.5rem' }}>
          <Button onClick={() => setDeleteTarget(null)} style={{ textTransform:'none', fontWeight:700, borderRadius:8 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmDelete}
            disabled={actionLoading}
            style={{ background:'#dc2626', textTransform:'none', fontWeight:700, borderRadius:8 }}
          >
            {actionLoading ? <CircularProgress size={18} style={{ color:'#fff' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

    </section>
  );
};

export default CustomerManagement;
