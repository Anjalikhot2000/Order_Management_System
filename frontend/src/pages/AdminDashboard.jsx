import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../components/currency';
import CustomerManagement from './CustomerManagement';
import AdminLayout from '../components/AdminLayout';

const AdminDashboard = ({ initialSection = 'dashboard' }) => {
  const { user } = useAuth();
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
      const response = await axios.get('/api/dashboard/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    try {
      const response = await axios.get('/api/dashboard/sales-report?period=month');
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
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ color: '#64748b', fontWeight: 600 }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={handleMenuClick}
      stats={stats}
      user={user}
    >
      {/* Dashboard Section */}
      {activeSection === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Summary Cards */}
          <section className="dashboard-grid">
            <div className="metrics-grid">
              <div className="metric-card blue-card">
                <div className="metric-title">?? Total Sales</div>
                <div className="metric-value">{formatCurrency(stats.totalRevenue)}</div>
                <div className="metric-note">Paid orders only</div>
              </div>
              <div className="metric-card purple-card">
                <div className="metric-title">?? Total Orders</div>
                <div className="metric-value">{stats.totalOrders || 0}</div>
                <div className="metric-note">All time</div>
              </div>
              <div className="metric-card green-card">
                <div className="metric-title">??? Products</div>
                <div className="metric-value">{stats.totalProducts || 0}</div>
                <div className="metric-note">In catalog</div>
              </div>
              <div className="metric-card yellow-card">
                <div className="metric-title">?? Low Stock</div>
                <div className="metric-value">{stats.lowStockProducts || 0}</div>
                <div className="metric-note">Below 10 units</div>
              </div>
            </div>

            <div className="overview-card">
              <div className="overview-header">
                <h2>?? Top Selling Products</h2>
                <span>By quantity sold</span>
              </div>
              <div style={{ padding: '1rem 0' }}>
                {stats.topProducts && stats.topProducts.length > 0 ? (
                  stats.topProducts.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 0',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'all 0.2s ease'
                    }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{p.name}</span>
                      <strong style={{ color: '#6366f1', fontSize: '1rem' }}>{p.total_sold} sold</strong>
                    </div>
                  ))
                ) : (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>No products available</p>
                )}
              </div>
            </div>
          </section>

          {/* Recent Orders & Performance */}
          <section className="dashboard-bottom">
            <div className="recent-table-card">
              <div className="section-heading">
                <h3>?? Recent Orders</h3>
                <span>{stats.recentOrders?.length || 0} latest</span>
              </div>
              {stats.recentOrders && stats.recentOrders.length > 0 ? (
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentOrders.slice(0, 6).map((order) => (
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
              ) : (
                <p style={{ padding: '2rem', color: '#94a3b8', textAlign: 'center' }}>No orders yet</p>
              )}
            </div>

            <div className="side-summary-card">
              <div className="section-heading">
                <h3>?? Performance</h3>
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
        </div>
      )}

      {/* Customers Section */}
      {activeSection === 'customers' && <CustomerManagement />}

      {/* Reports Section */}
      {activeSection === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="recent-table-card">
            <div className="section-heading">
              <h3>?? Monthly Sales Report</h3>
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
              <p style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>No sales data available.</p>
            )}
          </div>
          <div className="side-summary-card">
            <div className="section-heading"><h3>Overview Metrics</h3></div>
            <div className="summary-list">
              <div className="summary-item"><span>Total Orders</span><strong>{stats.totalOrders || 0}</strong></div>
              <div className="summary-item"><span>Total Revenue</span><strong>{formatCurrency(stats.totalRevenue)}</strong></div>
              <div className="summary-item"><span>Pending Orders</span><strong>{stats.pendingOrders || 0}</strong></div>
              <div className="summary-item"><span>Total Products</span><strong>{stats.totalProducts || 0}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Section */}
      {activeSection === 'settings' && (
        <div className="recent-table-card">
          <div className="section-heading"><h3>?? Settings</h3><span>System configuration</span></div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>Admin Name</label>
              <input
                defaultValue={user?.name}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  background: '#f8fafc',
                  color: '#0f172a'
                }}
                readOnly
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>Email</label>
              <input
                defaultValue={user?.email}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  background: '#f8fafc',
                  color: '#0f172a'
                }}
                readOnly
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>Role</label>
              <input
                defaultValue={user?.role || 'admin'}
                style={{
                  padding: '0.75rem 1rem',
                  border: '1.5px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  background: '#f8fafc',
                  color: '#0f172a',
                  textTransform: 'capitalize'
                }}
                readOnly
              />
            </div>
            <div style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              borderRadius: '10px',
              color: '#92400e',
              fontSize: '0.9rem',
              fontWeight: 600,
              border: '1px solid #fcd34d'
            }}>
              ?? Advanced settings such as database management and user role configuration are available via the API.
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;

