import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      pending: '#fef3c7',
      confirmed: '#dbeafe',
      processing: '#fcd34d',
      packed: '#bfdbfe',
      shipped: '#fbbf24',
      delivered: '#d1fae5',
      cancelled: '#fee2e2'
    };
    return statusColors[status] || '#f3f4f6';
  };

  const getStatusTextColor = (status) => {
    const textColors = {
      pending: '#92400e',
      confirmed: '#1e40af',
      processing: '#854d0e',
      packed: '#1e40af',
      shipped: '#78350f',
      delivered: '#065f46',
      cancelled: '#7f1d1d'
    };
    return textColors[status] || '#374151';
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(searchTerm) ||
      (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getOrderCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };
  };

  const counts = getOrderCounts();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-dashboard-shell">
      {/* Sidebar */}
      <aside className={`customer-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🛍️</div>
            <div>
              <h2>ShopHub</h2>
              <p>Your Orders</p>
            </div>
          </div>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section">
            <p className="menu-label">Main</p>
            <a href="#" className="menu-item active">
              <span className="menu-icon">📊</span>
              <span>Dashboard</span>
            </a>
            <a href="#" className="menu-item">
              <span className="menu-icon">🛒</span>
              <span>Shop</span>
            </a>
          </div>

          <div className="menu-section">
            <p className="menu-label">Orders</p>
            <a href="#" className="menu-item">
              <span className="menu-icon">📦</span>
              <span>All Orders</span>
            </a>
            <a href="#" className="menu-item">
              <span className="menu-icon">⏳</span>
              <span>Pending</span>
            </a>
            <a href="#" className="menu-item">
              <span className="menu-icon">✈️</span>
              <span>Shipped</span>
            </a>
            <a href="#" className="menu-item">
              <span className="menu-icon">✓</span>
              <span>Delivered</span>
            </a>
          </div>

          <div className="menu-section">
            <p className="menu-label">Account</p>
            <a href="#" className="menu-item">
              <span className="menu-icon">👤</span>
              <span>Profile</span>
            </a>
            <a href="#" className="menu-item">
              <span className="menu-icon">💳</span>
              <span>Payments</span>
            </a>
            <a href="#" className="menu-item">
              <span className="menu-icon">❓</span>
              <span>Help & Support</span>
            </a>
          </div>

          <div className="menu-section">
            <a 
              href="#" 
              className="menu-item logout"
              onClick={(e) => {
                e.preventDefault();
                logout();
                navigate('/login');
              }}
            >
              <span className="menu-icon">🚪</span>
              <span>Logout</span>
            </a>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="customer-main">
        {/* Top Header */}
        <div className="customer-header">
          <div className="header-left">
            <button 
              className="mobile-menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text"
                placeholder="Search by order ID, name, or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <div className="header-right">
            <div className="header-info">
              <p className="date-time">📅 {new Date().toLocaleDateString()}</p>
              <div className="user-profile">
                <img src="https://via.placeholder.com/40" alt="User" className="avatar" />
                <div className="user-info">
                  <p className="user-name">{user?.name || 'Guest'}</p>
                  <p className="user-role">Customer</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="customer-content">
          <div className="page-header">
            <div>
              <h1 className="page-title">All Orders</h1>
              <p className="page-subtitle">Check all your orders at a single place. It's easy to manage.</p>
            </div>
            <button 
              className="export-btn"
              onClick={() => navigate('/products')}
            >
              📥 Continue Shopping
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="status-filters">
            <button 
              className={`filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All orders <span className="count">({counts.all})</span>
            </button>
            <button 
              className={`filter-pill ${filterStatus === 'pending' ? 'active' : ''}`}
              onClick={() => setFilterStatus('pending')}
            >
              Pending <span className="count">({counts.pending})</span>
            </button>
            <button 
              className={`filter-pill ${filterStatus === 'processing' ? 'active' : ''}`}
              onClick={() => setFilterStatus('processing')}
            >
              Processing <span className="count">({counts.processing})</span>
            </button>
            <button 
              className={`filter-pill ${filterStatus === 'shipped' ? 'active' : ''}`}
              onClick={() => setFilterStatus('shipped')}
            >
              Shipped <span className="count">({counts.shipped})</span>
            </button>
            <button 
              className={`filter-pill ${filterStatus === 'delivered' ? 'active' : ''}`}
              onClick={() => setFilterStatus('delivered')}
            >
              Delivered <span className="count">({counts.delivered})</span>
            </button>
          </div>

          {/* Orders List */}
          <div className="orders-container">
            {filteredOrders.length > 0 ? (
              filteredOrders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-card-header">
                    <div className="order-info">
                      <h3 className="order-title">Order ID: {order.id}</h3>
                      <p className="order-date">📅 {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <span 
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(order.status),
                        color: getStatusTextColor(order.status)
                      }}
                    >
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>

                  <div className="order-body">
                    <div className="order-details">
                      <div className="detail-item">
                        <label>Customer</label>
                        <p>{order.customer_name || 'You'}</p>
                      </div>
                      <div className="detail-item">
                        <label>Total Amount</label>
                        <p className="amount">${parseFloat(order.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Payment Status</label>
                        <p className="payment-status">{order.payment_status.toUpperCase()}</p>
                      </div>
                      <div className="detail-item">
                        <label>Items</label>
                        <p>{Math.floor(Math.random() * 5) + 1} item(s)</p>
                      </div>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button className="action-btn primary-btn">
                      📋 View Details
                    </button>
                    <button className="action-btn secondary-btn">
                      📥 Download Invoice
                    </button>
                    {order.status === 'shipped' && (
                      <button className="action-btn secondary-btn">
                        📍 Track Order
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <button className="action-btn secondary-btn">
                        ⭐ Leave Review
                      </button>
                    )}
                    {['pending', 'confirmed'].includes(order.status) && (
                      <button className="action-btn cancel-btn">
                        ✕ Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-orders">
                <div className="no-orders-icon">📦</div>
                <h3>No Orders Found</h3>
                <p>You haven't placed any orders yet. Start shopping now!</p>
                <button 
                  className="start-shopping-btn"
                  onClick={() => navigate('/products')}
                >
                  🛍️ Start Shopping
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomerDashboard;
