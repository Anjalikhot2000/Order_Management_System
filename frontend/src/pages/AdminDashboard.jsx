import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/dashboard/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (menu) => {
    switch(menu) {
      case 'Orders':
        navigate('/orders');
        break;
      case 'Products':
        navigate('/products');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-slate-900 text-white">Loading...</div>;
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">OM</div>
          <div>
            <p className="brand-title">Order Management</p>
            <p className="brand-subtitle">Admin Dashboard</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="sidebar-item active">Dashboard</button>
          <button className="sidebar-item" onClick={() => handleMenuClick('Orders')}>Orders</button>
          <button className="sidebar-item" onClick={() => handleMenuClick('Products')}>Products</button>
          <button className="sidebar-item">Customers</button>
          <button className="sidebar-item">Reports</button>
          <button className="sidebar-item">Settings</button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="dashboard-subtitle">Order Management Dashboard</p>
            <h1 className="dashboard-title">Welcome back, {user?.name || 'Admin'}</h1>
          </div>
          <div className="header-actions">
            <div className="header-stat">
              <span>Visitors</span>
              <strong>{stats.visitors || '43,292'}</strong>
            </div>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="metrics-grid">
            <div className="metric-card blue-card">
              <div className="metric-title">Total Sales</div>
              <div className="metric-value">${stats.totalRevenue || '3,499.00'}</div>
              <div className="metric-note">+12.4% from last week</div>
            </div>
            <div className="metric-card purple-card">
              <div className="metric-title">Orders</div>
              <div className="metric-value">{stats.totalOrders || '1,239'}</div>
              <div className="metric-note">High volume today</div>
            </div>
            <div className="metric-card green-card">
              <div className="metric-title">Revenue</div>
              <div className="metric-value">${stats.totalRevenue || '5,261'}</div>
              <div className="metric-note">Revenue goal met</div>
            </div>
            <div className="metric-card yellow-card">
              <div className="metric-title">Visitors</div>
              <div className="metric-value">{stats.visitors || '43,292'}</div>
              <div className="metric-note">3.4% increase</div>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-header">
              <h2>Sales Overview</h2>
              <span>Last 7 days</span>
            </div>
            <div className="chart-placeholder">Graph placeholder</div>
          </div>
        </section>

        <section className="dashboard-bottom">
          <div className="recent-table-card">
            <div className="section-heading">
              <h3>Recent Activity</h3>
              <span>{stats.recentOrders?.length || 5} latest orders</span>
            </div>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders?.slice(0, 6).map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.customer_name}</td>
                    <td><span className={`status-pill ${order.status}`}>{order.status}</span></td>
                    <td>${order.total_amount}</td>
                    <td>{new Date(order.order_date || Date.now()).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="side-summary-card">
            <div className="section-heading">
              <h3>Performance</h3>
              <span>Key metrics</span>
            </div>
            <div className="summary-list">
              <div className="summary-item">
                <span>Total Products</span>
                <strong>{stats.totalProducts || 0}</strong>
              </div>
              <div className="summary-item">
                <span>Pending Orders</span>
                <strong>{stats.pendingOrders || 0}</strong>
              </div>
              <div className="summary-item">
                <span>Confirmed Orders</span>
                <strong>{stats.confirmedOrders || 0}</strong>
              </div>
              <div className="summary-item">
                <span>Shipped Orders</span>
                <strong>{stats.shippedOrders || 0}</strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
