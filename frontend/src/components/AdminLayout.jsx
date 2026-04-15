import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

const AdminLayout = ({
  activeSection,
  onSectionChange,
  children,
  stats = {},
  user = {}
}) => {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'products', label: 'Products', icon: '🛍️' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleMenuClick = (section) => {
    onSectionChange(section);
    setSidebarOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <Logo variant="sidebar" size="sm" showText={true} />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
              onClick={() => handleMenuClick(item.id)}
              aria-current={activeSection === item.id ? 'page' : undefined}
            >
              <span className="menu-icon">{item.icon}</span>
              <span className="menu-label">{item.label}</span>
              {activeSection === item.id && <span className="menu-indicator" />}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name || 'Admin'}</div>
              <div className="user-role">Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-main-wrapper">
        {/* Header/Navbar */}
        <header className="admin-header">
          <div className="header-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div className="header-title-section">
              <h1 className="page-title">
                {menuItems.find(m => m.id === activeSection)?.label || 'Dashboard'}
              </h1>
              <p className="page-subtitle">Manage your store efficiently</p>
            </div>
          </div>

          <div className="header-right">
              <div className="header-stats">
              <div className="stat-item">
                <span className="stat-icon">📦</span>
                <div>
                  <div className="stat-value">{stats.totalOrders || 0}</div>
                  <div className="stat-label">Orders</div>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">💰</span>
                <div>
                  <div className="stat-value">{stats.totalRevenue ? `Rs. ${(stats.totalRevenue / 1000).toFixed(1)}K` : 'Rs. 0'}</div>
                  <div className="stat-label">Revenue</div>
                </div>
              </div>
            </div>

            <div className="header-actions">
              <button className="logout-btn" onClick={logout}>
                <span>🚪</span> Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
