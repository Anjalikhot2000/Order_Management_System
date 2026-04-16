import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../components/currency';

const Orders = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('Orders');
  const [editingOrder, setEditingOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [adminMessageInput, setAdminMessageInput] = useState('');
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
      const response = await axios.get('/api/orders');
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

  const formatTrackingClass = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const returnStatusLabel = (order) => order.return_status || (order.status === 'returned' ? 'Requested' : 'N/A');
  const refundStatusLabel = (order) => order.refund_status || 'Not Initiated';

  const loadOrderDetails = async (orderId) => {
    const response = await axios.get(`/api/orders/${orderId}`);
    return response.data;
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`/api/orders/${orderId}`);
        setOrders(orders.filter(order => order.id !== orderId));
        alert('Order deleted successfully');
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order');
      }
    }
  };

  const handleEdit = async (order) => {
    try {
      setEditLoading(true);
      const details = await loadOrderDetails(order.id);
      setEditingOrder(details);
      setFormData({
        status: details.status,
        payment_status: details.payment_status
      });
      setAdminMessageInput('');
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading order details:', error);
      alert('Failed to load order details');
    } finally {
      setEditLoading(false);
    }
  };

  const refreshEditingOrder = async (orderId) => {
    const details = await loadOrderDetails(orderId);
    setEditingOrder(details);
  };

  const handleApproveReturn = async () => {
    if (!editingOrder) return;

    try {
      setAdminActionLoading(true);
      await axios.put(`/api/orders/${editingOrder.id}/approve`);
      await fetchOrders();
      await refreshEditingOrder(editingOrder.id);
      alert('Return approved and refund moved to Processing.');
    } catch (error) {
      console.error('Error approving return:', error);
      alert(error?.response?.data?.message || 'Failed to approve return');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleRejectReturn = async () => {
    if (!editingOrder) return;

    if (!adminMessageInput.trim()) {
      alert('Please provide a rejection message.');
      return;
    }

    try {
      setAdminActionLoading(true);
      await axios.put(`/api/orders/${editingOrder.id}/reject`, {
        admin_message: adminMessageInput.trim()
      });
      await fetchOrders();
      await refreshEditingOrder(editingOrder.id);
      setAdminMessageInput('');
      alert('Return rejected successfully.');
    } catch (error) {
      console.error('Error rejecting return:', error);
      alert(error?.response?.data?.message || 'Failed to reject return');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleCompleteRefund = async () => {
    if (!editingOrder) return;

    try {
      setAdminActionLoading(true);
      await axios.put(`/api/orders/${editingOrder.id}/refund-complete`);
      await fetchOrders();
      await refreshEditingOrder(editingOrder.id);
      alert('Refund marked as Completed.');
    } catch (error) {
      console.error('Error completing refund:', error);
      alert(error?.response?.data?.message || 'Failed to complete refund');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`/api/orders/${editingOrder.id}`, {
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
    console.log('[Orders] Sidebar click:', menu);
    setActiveMenu(menu);
    switch(menu) {
      case 'Dashboard':
        navigate('/admin/dashboard');
        break;
      case 'Products':
        navigate('/products');
        break;
      case 'Customers':
        navigate('/customers');
        break;
      case 'Reports':
        navigate('/reports');
        break;
      case 'Settings':
        navigate('/settings');
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
            onClick={() => handleMenuClick('Customers')}
          >
            👥 Customers
          </button>
          <button 
            className={`sidebar-item ${activeMenu === 'Reports' ? 'active' : ''}`}
            onClick={() => handleMenuClick('Reports')}
          >
            📈 Reports
          </button>
          <button 
            className={`sidebar-item ${activeMenu === 'Settings' ? 'active' : ''}`}
            onClick={() => handleMenuClick('Settings')}
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
                <option value="returned">Returned</option>
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
                    <th>Return Status</th>
                    <th>Refund Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="order-id">#{order.id}</td>
                      <td>{order.customer_name || 'N/A'}</td>
                      <td className="amount">{formatCurrency(order.total_amount)}</td>
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
                      <td>
                        <span className={`tracking-badge ${formatTrackingClass(returnStatusLabel(order))}`}>
                          {returnStatusLabel(order)}
                        </span>
                      </td>
                      <td>
                        <span className={`tracking-badge ${formatTrackingClass(refundStatusLabel(order))}`}>
                          {refundStatusLabel(order)}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button 
                          className="action-btn edit-btn-pro"
                          onClick={() => handleEdit(order)}
                          disabled={editLoading}
                          title="Edit Order"
                        >
                          {editLoading ? '⏳' : '✎'}
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
                    <p>{formatCurrency(editingOrder.total_amount)}</p>
                  </div>
                  <div className="info-item">
                    <label>Date</label>
                    <p>{new Date(editingOrder.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="info-item">
                    <label>Return Status</label>
                    <p>
                        <span className={`tracking-badge ${formatTrackingClass(returnStatusLabel(editingOrder))}`}>
                          {returnStatusLabel(editingOrder)}
                      </span>
                    </p>
                  </div>
                  <div className="info-item">
                    <label>Refund Status</label>
                    <p>
                        <span className={`tracking-badge ${formatTrackingClass(refundStatusLabel(editingOrder))}`}>
                          {refundStatusLabel(editingOrder)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>Product Details</h3>
                {(editingOrder.items || []).length > 0 ? (
                  <table className="payments-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(editingOrder.items || []).map((item) => (
                        <tr key={item.id || `${item.product_id}-${item.product_name}`}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.price)}</td>
                          <td>{formatCurrency(parseFloat(item.price || 0) * parseInt(item.quantity || 0, 10))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="info-item">
                    <p>No product details available.</p>
                  </div>
                )}
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
                      <option value="returned">Returned</option>
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

              <div className="modal-section">
                <h3>Return Details</h3>
                {editingOrder.return_reason || editingOrder.return_comment || editingOrder.return_image ? (
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Reason</label>
                      <p>{editingOrder.return_reason || 'Not provided'}</p>
                    </div>
                    <div className="info-item">
                      <label>Customer Comment</label>
                      <p>{editingOrder.return_comment || 'No additional comments'}</p>
                    </div>
                    <div className="info-item">
                      <label>Proof Image</label>
                      {editingOrder.return_image ? (
                        <img
                          src={editingOrder.return_image}
                          alt={`Return proof for order ${editingOrder.id}`}
                          className="return-preview-image"
                        />
                      ) : (
                        <p>No image uploaded</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="info-item">
                    <p>No return details available for this order.</p>
                  </div>
                )}
                {editingOrder.admin_message && (
                  <div className="rejection-message-box">
                    <strong>Admin Message</strong>
                    <p>{editingOrder.admin_message}</p>
                  </div>
                )}
              </div>

              <div className="modal-section">
                <h3>Return Approval Actions</h3>
                <div className="form-group-pro">
                  <label>Rejection Message (required when rejecting)</label>
                  <textarea
                    className="review-textarea"
                    placeholder="Add reason for rejection..."
                    value={adminMessageInput}
                    onChange={(e) => setAdminMessageInput(e.target.value)}
                    rows={3}
                    maxLength={500}
                    disabled={adminActionLoading}
                  />
                </div>
                <div className="order-actions" style={{ paddingLeft: 0, paddingRight: 0, borderTop: 'none' }}>
                  <button
                    className="action-btn primary-btn"
                    onClick={handleApproveReturn}
                    disabled={adminActionLoading || editingOrder.status !== 'returned' || editingOrder.return_status !== 'Requested'}
                  >
                    {adminActionLoading ? 'Processing...' : 'Approve Return'}
                  </button>
                  <button
                    className="action-btn cancel-btn"
                    onClick={handleRejectReturn}
                    disabled={adminActionLoading || editingOrder.status !== 'returned' || editingOrder.return_status !== 'Requested'}
                  >
                    {adminActionLoading ? 'Processing...' : 'Reject Return'}
                  </button>
                  <button
                    className="action-btn secondary-btn"
                    onClick={handleCompleteRefund}
                    disabled={adminActionLoading || editingOrder.status !== 'returned' || editingOrder.return_status !== 'Approved' || editingOrder.refund_status !== 'Processing'}
                  >
                    {adminActionLoading ? 'Processing...' : 'Mark Refund Completed'}
                  </button>
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

