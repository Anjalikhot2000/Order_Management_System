import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Orders = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('Orders');
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formData, setFormData] = useState({
    status: '',
    payment_status: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(searchTerm) ||
      (order.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`http://localhost:5000/api/orders/${orderId}`);
        setOrders(orders.filter(order => order.id !== orderId));
        alert('Order deleted successfully');
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
      }
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      status: order.status,
      payment_status: order.payment_status
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`http://localhost:5000/api/orders/${editingOrder.id}`, {
        status: formData.status,
        payment_status: formData.payment_status
      });
      
      setOrders(orders.map(order => 
        order.id === editingOrder.id ? { ...order, ...formData } : order
      ));
      setShowEditModal(false);
      setEditingOrder(null);
      alert('Order updated successfully');
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order');
    }
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    switch(menu) {
      case 'Dashboard':
        navigate('/admin-dashboard');
        break;
      case 'Products':
        navigate('/products');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p>Loading orders...</p>
      </div>
    </div>;
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">OM</div>
          <div>
            <p className="brand-title">Order Management</p>
            <p className="brand-subtitle">Admin Panel</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`sidebar-item ${activeMenu === 'Dashboard' ? 'active' : ''}`}
            onClick={() => handleMenuClick('Dashboard')}
          >
            📊 Dashboard
          </button>
          <button 
            className={`sidebar-item ${activeMenu === 'Orders' ? 'active' : ''}`}
          >
            📦 Orders
          </button>
          <button 
            className={`sidebar-item ${activeMenu === 'Products' ? 'active' : ''}`}
            onClick={() => handleMenuClick('Products')}
          >
            🛍️ Products
          </button>
          <button 
            className={`sidebar-item ${activeMenu === 'Customers' ? 'active' : ''}`}
          >
            👥 Customers
          </button>
          <button 
            className={`sidebar-item ${activeMenu === 'Reports' ? 'active' : ''}`}
          >
            📈 Reports
          </button>
          <button 
            className={`sidebar-item ${activeMenu === 'Settings' ? 'active' : ''}`}
          >
            ⚙️ Settings
          </button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header-pro">
          <div className="header-content">
            <p className="dashboard-subtitle">Management Suite</p>
            <h1 className="dashboard-title">Orders</h1>
          </div>
          <div className="header-actions">
            <div className="header-stat-pro">
              <span>Total Orders</span>
              <strong>{filteredOrders.length}</strong>
            </div>
            <button onClick={logout} className="logout-btn-pro">Logout</button>
          </div>
        </header>

        <section className="orders-section-pro">
          <div className="filters-card">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input 
                type="text"
                placeholder="Search by Order ID or Customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-pro"
              />
            </div>
            <div className="filter-box">
              <label>Filter by Status:</label>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select-pro"
              >
                <option value="all">All Orders</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="orders-table-container-pro">
            {filteredOrders.length > 0 ? (
              <table className="orders-table-pro">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Order Status</th>
                    <th>Payment Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="order-id">#{order.id}</td>
                      <td>{order.customer_name || 'N/A'}</td>
                      <td className="amount">${parseFloat(order.total_amount).toFixed(2)}</td>
                      <td>
                        <span className={`status-badge ${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <span className={`payment-badge ${order.payment_status}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td className="date">{new Date(order.created_at).toLocaleDateString()}</td>
                      <td className="action-cell">
                        <button 
                          className="action-btn edit-btn-pro"
                          onClick={() => handleEdit(order)}
                          title="Edit Order"
                        >
                          ✎
                        </button>
                        <button 
                          className="action-btn delete-btn-pro"
                          onClick={() => handleDelete(order.id)}
                          title="Delete Order"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="no-data-container">
                <p className="no-data-text">No orders found matching your criteria</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {showEditModal && (
        <div className="modal-overlay-pro" onClick={() => setShowEditModal(false)}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-pro">
              <div>
                <p className="modal-label">Edit Order</p>
                <h2>Order #{editingOrder.id}</h2>
              </div>
              <button 
                className="modal-close-pro"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body-pro">
              <div className="modal-section">
                <h3>Order Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Customer</label>
                    <p>{editingOrder.customer_name}</p>
                  </div>
                  <div className="info-item">
                    <label>Amount</label>
                    <p>${parseFloat(editingOrder.total_amount).toFixed(2)}</p>
                  </div>
                  <div className="info-item">
                    <label>Date</label>
                    <p>{new Date(editingOrder.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>Update Status</h3>
                <div className="form-grid">
                  <div className="form-group-pro">
                    <label>Order Status</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="form-input-pro"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="packed">Packed</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="form-group-pro">
                    <label>Payment Status</label>
                    <select 
                      value={formData.payment_status}
                      onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
                      className="form-input-pro"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer-pro">
              <button 
                className="btn-outline"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
