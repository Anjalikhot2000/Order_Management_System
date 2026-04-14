import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../components/currency';
import CustomerManagement from './CustomerManagement';

const AdminDashboard = ({ initialSection = 'dashboard' }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState({});
  const [salesReport, setSalesReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (location.pathname === '/customers') {
      setActiveSection('customers');
      return;
    }

    if (location.pathname === '/reports') {
      setActiveSection('reports');
      if (salesReport.length === 0) {
        fetchSalesReport();
      }
      return;
    }

    if (location.pathname === '/settings') {
      setActiveSection('settings');
      return;
    }

    if (location.pathname === '/admin/dashboard' || location.pathname === '/admin-dashboard') {
      setActiveSection((prev) => (prev === 'reports' || prev === 'settings' ? prev : 'dashboard'));
    }
  }, [location.pathname]);

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

  const fetchSalesReport = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/dashboard/sales-report?period=month');
      setSalesReport(response.data);
    } catch (error) {
      console.error('Error fetching sales report:', error);
    }
  };

  const handleMenuClick = (section) => {
    setActiveSection(section);
    if (section === 'dashboard') {
      navigate('/admin/dashboard');
      return;
    }

    if (section === 'customers') {
      console.log('[AdminDashboard] Customers menu clicked');
      navigate('/customers');
      return;
    }

    if (section === 'reports') {
      console.log('[AdminDashboard] Reports menu clicked');
      navigate('/reports');
      if (salesReport.length === 0) fetchSalesReport();
      return;
    }

    if (section === 'settings') {
      console.log('[AdminDashboard] Settings menu clicked');
      navigate('/settings');
      return;
    }

    if (section === 'orders') {
      navigate('/orders');
      return;
    }

    if (section === 'products') {
      navigate('/products');
      return;
    }

    if (section === 'reports' && salesReport.length === 0) fetchSalesReport();
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
          <button className={`sidebar-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => handleMenuClick('dashboard')}>Dashboard</button>
          <button className={`sidebar-item ${activeSection === 'orders' ? 'active' : ''}`} onClick={() => handleMenuClick('orders')}>Orders</button>
          <button className={`sidebar-item ${activeSection === 'products' ? 'active' : ''}`} onClick={() => handleMenuClick('products')}>Products</button>
          <button className={`sidebar-item ${activeSection === 'customers' ? 'active' : ''}`} onClick={() => handleMenuClick('customers')}>Customers</button>
          <button className={`sidebar-item ${activeSection === 'reports' ? 'active' : ''}`} onClick={() => handleMenuClick('reports')}>Reports</button>
          <button className={`sidebar-item ${activeSection === 'settings' ? 'active' : ''}`} onClick={() => handleMenuClick('settings')}>Settings</button>
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
              <span>Total Orders</span>
              <strong>{stats.totalOrders || 0}</strong>
            </div>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </header>

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <>
            <section className="dashboard-grid">
              <div className="metrics-grid">
                <div className="metric-card blue-card">
                  <div className="metric-title">Total Sales</div>
                  <div className="metric-value">{formatCurrency(stats.totalRevenue)}</div>
                  <div className="metric-note">Paid orders only</div>
                </div>
                <div className="metric-card purple-card">
                  <div className="metric-title">Orders</div>
                  <div className="metric-value">{stats.totalOrders || 0}</div>
                  <div className="metric-note">Total all time</div>
                </div>
                <div className="metric-card green-card">
                  <div className="metric-title">Products</div>
                  <div className="metric-value">{stats.totalProducts || 0}</div>
                  <div className="metric-note">In catalog</div>
                </div>
                <div className="metric-card yellow-card">
                  <div className="metric-title">Low Stock</div>
                  <div className="metric-value">{stats.lowStockProducts || 0}</div>
                  <div className="metric-note">Items below 10 units</div>
                </div>
              </div>

              <div className="overview-card">
                <div className="overview-header">
                  <h2>Top Selling Products</h2>
                  <span>By quantity sold</span>
                </div>
                <div style={{padding:'1rem 0'}}>
                  {stats.topProducts?.map((p, i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'0.6rem 0',borderBottom:'1px solid #f1f5f9'}}>
                      <span>{p.name}</span>
                      <strong>{p.total_sold} sold</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="dashboard-bottom">
              <div className="recent-table-card">
                <div className="section-heading">
                  <h3>Recent Activity</h3>
                  <span>{stats.recentOrders?.length || 0} latest orders</span>
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
                        <td>{formatCurrency(order.total_amount)}</td>
                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
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
                    <span>Low Stock Items</span>
                    <strong>{stats.lowStockProducts || 0}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Total Revenue</span>
                    <strong>{formatCurrency(stats.totalRevenue)}</strong>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Customers Section */}
        {activeSection === 'customers' && <CustomerManagement />}

        {/* Reports Section */}
        {activeSection === 'reports' && (
          <section className="dashboard-bottom" style={{flexDirection:'column',padding:'2rem'}}>
            <div className="recent-table-card" style={{width:'100%'}}>
              <div className="section-heading">
                <h3>Monthly Sales Report</h3>
                <span>Revenue by month</span>
              </div>
              {salesReport.length > 0 ? (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Orders</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReport.map((row, i) => (
                      <tr key={i}>
                        <td>{row.period}</td>
                        <td>{row.order_count}</td>
                        <td>{formatCurrency(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{padding:'2rem',color:'#64748b',textAlign:'center'}}>No sales data available.</p>
              )}
            </div>
            <div className="side-summary-card" style={{width:'100%',marginTop:'1.5rem'}}>
              <div className="section-heading"><h3>Overview Metrics</h3></div>
              <div className="summary-list">
                <div className="summary-item"><span>Total Orders</span><strong>{stats.totalOrders || 0}</strong></div>
                <div className="summary-item"><span>Total Revenue</span><strong>{formatCurrency(stats.totalRevenue)}</strong></div>
                <div className="summary-item"><span>Pending Orders</span><strong>{stats.pendingOrders || 0}</strong></div>
                <div className="summary-item"><span>Total Products</span><strong>{stats.totalProducts || 0}</strong></div>
              </div>
            </div>
          </section>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <section className="dashboard-bottom" style={{flexDirection:'column',padding:'2rem'}}>
            <div className="recent-table-card" style={{width:'100%'}}>
              <div className="section-heading"><h3>Settings</h3><span>System configuration</span></div>
              <div style={{padding:'1.5rem',display:'flex',flexDirection:'column',gap:'1.5rem'}}>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                  <label style={{fontWeight:700,color:'#374151'}}>Admin Name</label>
                  <input defaultValue={user?.name} style={{padding:'0.75rem 1rem',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:'0.95rem'}} readOnly />
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                  <label style={{fontWeight:700,color:'#374151'}}>Email</label>
                  <input defaultValue={user?.email} style={{padding:'0.75rem 1rem',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:'0.95rem'}} readOnly />
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:'0.5rem'}}>
                  <label style={{fontWeight:700,color:'#374151'}}>Role</label>
                  <input defaultValue={user?.role} style={{padding:'0.75rem 1rem',border:'1.5px solid #e5e7eb',borderRadius:10,fontSize:'0.95rem',textTransform:'capitalize'}} readOnly />
                </div>
                <div style={{padding:'1rem',background:'#fef3c7',borderRadius:10,color:'#92400e',fontSize:'0.9rem'}}>
                  ⚙️ Advanced settings such as database management and user role configuration are available via the API.
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
