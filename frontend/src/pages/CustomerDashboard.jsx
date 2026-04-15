import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../components/currency';
import Logo from '../components/Logo';

const ORDER_REVIEWS_STORAGE_KEY = 'orderReviews';
const RETURN_REASONS = [
  'Damaged product',
  'Wrong item received',
  'Not as described',
  'Quality issue',
  'Other'
];
const MAX_RETURN_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('orders');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [actionMessage, setActionMessage] = useState('');
  const [reviewsByOrder, setReviewsByOrder] = useState({});
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [returnImage, setReturnImage] = useState('');
  const [returnImageName, setReturnImageName] = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
    loadStoredReviews();
  }, []);

  const loadStoredReviews = () => {
    try {
      const storedReviews = JSON.parse(localStorage.getItem(ORDER_REVIEWS_STORAGE_KEY) || '{}');
      setReviewsByOrder(storedReviews);
    } catch (error) {
      console.error('Error loading stored reviews:', error);
    }
  };

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
      returned: '#ffedd5',
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
      returned: '#9a3412',
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
      returned: orders.filter(o => o.status === 'returned').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length
    };
  };

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const setButtonLoading = (orderId, action, isLoading) => {
    const key = `${orderId}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: isLoading }));
  };

  const isButtonLoading = (orderId, action) => {
    const key = `${orderId}-${action}`;
    return !!actionLoading[key];
  };

  const getPaymentStatusLabel = (paymentStatus) => (paymentStatus || 'pending').toUpperCase();

  const getPaymentStatusClass = (paymentStatus) => paymentStatus || 'pending';

  const formatTrackingClass = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const loadOrderDetails = async (orderId) => {
    const response = await axios.get(`http://localhost:5000/api/orders/${orderId}`);
    return response.data;
  };

  const handleViewDetails = async (order) => {
    setButtonLoading(order.id, 'details', true);
    setDetailsLoading(true);
    setActionMessage('');
    try {
      const details = await loadOrderDetails(order.id);
      setSelectedOrder(details);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error('Error loading order details:', error);
      setActionMessage('Unable to load order details. Please try again.');
    } finally {
      setDetailsLoading(false);
      setButtonLoading(order.id, 'details', false);
    }
  };

  const generateInvoicePdf = async (orderDetails) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    const orderDate = new Date(orderDetails.created_at).toLocaleDateString();
    const items = orderDetails.items || [];
    const customerName = orderDetails.customer_name || user?.name || 'Customer';

    doc.setFontSize(18);
    doc.text('Invoice', 14, 20);

    doc.setFontSize(11);
    doc.text(`Order ID: ${orderDetails.id}`, 14, 32);
    doc.text(`Customer: ${customerName}`, 14, 39);
    doc.text(`Date: ${orderDate}`, 14, 46);
    doc.text(`Status: ${orderDetails.status}`, 14, 53);

    let y = 66;
    doc.setFontSize(12);
    doc.text('Items', 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text('Product', 14, y);
    doc.text('Qty', 120, y);
    doc.text('Price', 145, y);
    doc.text('Total', 175, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;

    items.forEach((item) => {
      const lineTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 0, 10);
      const productName = (item.product_name || 'Product').slice(0, 40);

      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.text(productName, 14, y);
      doc.text(String(item.quantity || 0), 122, y);
      doc.text(formatCurrency(item.price || 0), 145, y);
      doc.text(formatCurrency(lineTotal), 175, y);
      y += 8;
    });

    y += 4;
    doc.line(14, y, 196, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Total Amount: ${formatCurrency(orderDetails.total_amount)}`, 14, y);

    doc.save(`invoice-order-${orderDetails.id}.pdf`);
  };

  const handleDownloadInvoice = async (order) => {
    setButtonLoading(order.id, 'invoice', true);
    setActionMessage('');
    try {
      const orderDetails = await loadOrderDetails(order.id);
      await generateInvoicePdf(orderDetails);
      setActionMessage(`Invoice for Order #${order.id} downloaded successfully.`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      setActionMessage('Unable to download invoice. Please try again.');
    } finally {
      setButtonLoading(order.id, 'invoice', false);
    }
  };

  const handleCancelOrder = async (order) => {
    const confirmed = window.confirm(`Are you sure you want to cancel Order #${order.id}?`);
    if (!confirmed) return;

    setButtonLoading(order.id, 'cancel', true);
    setActionMessage('');

    try {
      await axios.put(`http://localhost:5000/api/orders/${order.id}/cancel`);

      setOrders(prev => prev.map(o => (
        o.id === order.id ? { ...o, status: 'cancelled' } : o
      )));

      setSelectedOrder(prev => {
        if (!prev || prev.id !== order.id) return prev;
        return { ...prev, status: 'cancelled' };
      });

      setActionMessage(`Order #${order.id} cancelled successfully.`);
    } catch (error) {
      console.error('Error cancelling order:', error);
      setActionMessage('Unable to cancel this order. Please try again later.');
    } finally {
      setButtonLoading(order.id, 'cancel', false);
    }
  };

  const closeReturnModal = () => {
    if (returnSubmitting) return;
    setIsReturnOpen(false);
    setReturnOrder(null);
    setReturnReason('');
    setReturnComment('');
    setReturnImage('');
    setReturnImageName('');
  };

  const openReturnModal = (order) => {
    setReturnOrder(order);
    setReturnReason('');
    setReturnComment('');
    setReturnImage('');
    setReturnImageName('');
    setIsReturnOpen(true);
    setActionMessage('');
  };

  const handleReturnImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setReturnImage('');
      setReturnImageName('');
      return;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (!allowedMimeTypes.includes(file.type)) {
      setActionMessage('Only JPG and PNG images are allowed.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_RETURN_IMAGE_SIZE_BYTES) {
      setActionMessage('Image size must be 2MB or less.');
      event.target.value = '';
      return;
    }

    try {
      const imageAsBase64 = await fileToBase64(file);
      setReturnImage(imageAsBase64);
      setReturnImageName(file.name);
      setActionMessage('');
    } catch (error) {
      console.error('Error reading image file:', error);
      setActionMessage('Unable to process selected image. Please try another file.');
      event.target.value = '';
    }
  };

  const submitReturnRequest = async () => {
    if (!returnOrder) return;

    if (!returnReason) {
      setActionMessage('Please select a return reason.');
      return;
    }

    setReturnSubmitting(true);

    try {
      await axios.post('http://localhost:5000/api/orders/return', {
        order_id: returnOrder.id,
        reason: returnReason,
        comment: returnComment.trim(),
        return_image: returnImage || null
      });

      setOrders(prev => prev.map((order) => (
        order.id === returnOrder.id
          ? {
              ...order,
              status: 'returned',
              return_reason: returnReason,
              return_comment: returnComment.trim() || null,
              return_image: returnImage || null,
              return_status: 'Requested',
              refund_status: 'Not Initiated',
              admin_message: null
            }
          : order
      )));

      setSelectedOrder(prev => {
        if (!prev || prev.id !== returnOrder.id) return prev;
        return {
          ...prev,
          status: 'returned',
          return_reason: returnReason,
          return_comment: returnComment.trim() || null,
          return_image: returnImage || null,
          return_status: 'Requested',
          refund_status: 'Not Initiated',
          admin_message: null
        };
      });

      closeReturnModal();
      setActionMessage('Return request submitted successfully');
    } catch (error) {
      console.error('Error submitting return request:', error);
      setActionMessage(error?.response?.data?.message || 'Unable to submit return request. Please try again.');
    } finally {
      setReturnSubmitting(false);
    }
  };

  const openReviewModal = (order) => {
    const existingReview = reviewsByOrder[order.id];
    if (existingReview) {
      setActionMessage(`You already rated Order #${order.id} with ${existingReview.rating} stars.`);
      return;
    }

    setReviewOrder(order);
    setSelectedRating(0);
    setHoverRating(0);
    setReviewText('');
    setIsReviewOpen(true);
    setActionMessage('');
  };

  const saveReview = async () => {
    if (!reviewOrder) return;

    if (selectedRating < 1) {
      setActionMessage('Please select a star rating before submitting your review.');
      return;
    }

    setReviewSubmitting(true);

    try {
      const newReview = {
        orderId: reviewOrder.id,
        rating: selectedRating,
        reviewText: reviewText.trim(),
        submittedAt: new Date().toISOString()
      };

      const updatedReviews = {
        ...reviewsByOrder,
        [reviewOrder.id]: newReview
      };

      setReviewsByOrder(updatedReviews);
      localStorage.setItem(ORDER_REVIEWS_STORAGE_KEY, JSON.stringify(updatedReviews));

      setActionMessage(`Thanks! You rated Order #${reviewOrder.id} with ${selectedRating} stars.`);
      setIsReviewOpen(false);
      setReviewOrder(null);
      setSelectedRating(0);
      setHoverRating(0);
      setReviewText('');
    } catch (error) {
      console.error('Error saving review:', error);
      setActionMessage('Unable to save your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
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
            <Logo variant="sidebar" size="md" showText={true} />
            <p className="sidebar-logo-subtitle">Your Orders</p>
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
            <button
              className={`menu-item ${activeSection === 'orders' ? 'active' : ''}`}
              onClick={() => { setActiveSection('orders'); setFilterStatus('all'); }}
            >
              <span className="menu-icon">📊</span>
              <span>Dashboard</span>
            </button>
            <button
              className="menu-item"
              onClick={() => navigate('/products')}
            >
              <span className="menu-icon">🛒</span>
              <span>Shop</span>
            </button>
          </div>

          <div className="menu-section">
            <p className="menu-label">Orders</p>
            <button
              className={`menu-item ${activeSection === 'orders' && filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => { setActiveSection('orders'); setFilterStatus('all'); }}
            >
              <span className="menu-icon">📦</span>
              <span>All Orders</span>
            </button>
            <button
              className={`menu-item ${activeSection === 'orders' && filterStatus === 'pending' ? 'active' : ''}`}
              onClick={() => { setActiveSection('orders'); setFilterStatus('pending'); }}
            >
              <span className="menu-icon">⏳</span>
              <span>Pending</span>
            </button>
            <button
              className={`menu-item ${activeSection === 'orders' && filterStatus === 'shipped' ? 'active' : ''}`}
              onClick={() => { setActiveSection('orders'); setFilterStatus('shipped'); }}
            >
              <span className="menu-icon">✈️</span>
              <span>Shipped</span>
            </button>
            <button
              className={`menu-item ${activeSection === 'orders' && filterStatus === 'delivered' ? 'active' : ''}`}
              onClick={() => { setActiveSection('orders'); setFilterStatus('delivered'); }}
            >
              <span className="menu-icon">✓</span>
              <span>Delivered</span>
            </button>
          </div>

          <div className="menu-section">
            <p className="menu-label">Account</p>
            <button
              className={`menu-item ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSection('profile')}
            >
              <span className="menu-icon">👤</span>
              <span>Profile</span>
            </button>
            <button
              className={`menu-item ${activeSection === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveSection('payments')}
            >
              <span className="menu-icon">💳</span>
              <span>Payments</span>
            </button>
            <button
              className={`menu-item ${activeSection === 'help' ? 'active' : ''}`}
              onClick={() => setActiveSection('help')}
            >
              <span className="menu-icon">❓</span>
              <span>Help &amp; Support</span>
            </button>
          </div>

          <div className="menu-section">
            <button
              className="menu-item logout"
              onClick={() => { logout(); navigate('/login'); }}
            >
              <span className="menu-icon">🚪</span>
              <span>Logout</span>
            </button>
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
                <div className="avatar" style={{display:'flex',alignItems:'center',justifyContent:'center',width:40,height:40,borderRadius:'50%',background:'#0f4c81',color:'white',fontWeight:700,fontSize:16}}>{(user?.name || 'U')[0].toUpperCase()}</div>
                <div className="user-info">
                  <p className="user-name">{user?.name || 'Guest'}</p>
                  <p className="user-role">Customer</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        {activeSection === 'profile' && (
          <div className="customer-content">
            <div className="page-header">
              <div>
                <h1 className="page-title">My Profile</h1>
                <p className="page-subtitle">View your account information and order summary.</p>
              </div>
            </div>
            <div className="section-card">
              <div className="profile-row">
                <div className="profile-avatar-lg">{(user?.name || 'U')[0].toUpperCase()}</div>
                <div className="profile-meta">
                  <h2 className="profile-name">{user?.name}</h2>
                  <p className="profile-email">{user?.email}</p>
                  <span className="role-tag">{user?.role}</span>
                </div>
              </div>
            </div>
            <div className="stats-row">
              <div className="stat-card">
                <strong>{orders.length}</strong>
                <span>Total Orders</span>
              </div>
              <div className="stat-card">
                <strong>{orders.filter(o => o.status === 'delivered').length}</strong>
                <span>Delivered</span>
              </div>
              <div className="stat-card">
                <strong>{orders.filter(o => o.status === 'pending').length}</strong>
                <span>Pending</span>
              </div>
              <div className="stat-card">
                <strong>{formatCurrency(orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0))}</strong>
                <span>Total Spent</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'payments' && (
          <div className="customer-content">
            <div className="page-header">
              <div>
                <h1 className="page-title">Payment History</h1>
                <p className="page-subtitle">Track your payment records and transaction history.</p>
              </div>
            </div>
            <div className="section-card">
              {orders.length > 0 ? (
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Payment Status</th>
                      <th>Order Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.id}>
                        <td>#{order.id}</td>
                        <td>{new Date(order.created_at).toLocaleDateString()}</td>
                        <td><strong>{formatCurrency(order.total_amount)}</strong></td>
                        <td><span className={`payment-badge ${getPaymentStatusClass(order.payment_status)}`}>{getPaymentStatusLabel(order.payment_status)}</span></td>
                        <td><span className="status-badge" style={{backgroundColor: getStatusColor(order.status), color: getStatusTextColor(order.status)}}>{order.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{color:'#64748b', padding:'2rem', textAlign:'center'}}>No payment records found.</p>
              )}
            </div>
          </div>
        )}

        {activeSection === 'help' && (
          <div className="customer-content">
            <div className="page-header">
              <div>
                <h1 className="page-title">Help &amp; Support</h1>
                <p className="page-subtitle">Find answers to common questions or contact us.</p>
              </div>
            </div>
            <div className="help-grid">
              <div className="faq-card">
                <div className="faq-icon">📦</div>
                <h3>How do I track my order?</h3>
                <p>Once your order is shipped, check the <strong>Shipped</strong> filter in your orders list to view the latest status.</p>
              </div>
              <div className="faq-card">
                <div className="faq-icon">✕</div>
                <h3>How do I cancel an order?</h3>
                <p>Orders with <strong>Pending</strong> or <strong>Confirmed</strong> status can be cancelled using the Cancel button on the order card.</p>
              </div>
              <div className="faq-card">
                <div className="faq-icon">💳</div>
                <h3>What payment methods are accepted?</h3>
                <p>We accept Credit/Debit Cards and UPI payments at checkout.</p>
              </div>
              <div className="faq-card">
                <div className="faq-icon">🔄</div>
                <h3>How do I request a refund?</h3>
                <p>Contact our support team with your order ID. Refunds are processed within 5-7 business days.</p>
              </div>
              <div className="faq-card">
                <div className="faq-icon">📧</div>
                <h3>Contact Support</h3>
                <p>Email: <strong>support@shophub.com</strong><br/>Phone: <strong>1-800-SHOPHUB</strong><br/>Mon–Fri, 9am–6pm</p>
              </div>
              <div className="faq-card">
                <div className="faq-icon">🛒</div>
                <h3>How do I place an order?</h3>
                <p>Browse products from the Shop menu, add items to your cart, and complete checkout with your shipping and payment details.</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'orders' && (
        <div className="customer-content">
          {actionMessage && (
            <div className="auth-success" style={{ marginBottom: '0.5rem' }}>
              {actionMessage}
            </div>
          )}
          <div className="page-header">
            <div>
              <h1 className="page-title">{filterStatus === 'all' ? 'All Orders' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1) + ' Orders'}</h1>
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
            <button
              className={`filter-pill ${filterStatus === 'returned' ? 'active' : ''}`}
              onClick={() => setFilterStatus('returned')}
            >
              Returned <span className="count">({counts.returned})</span>
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
                        <p className="amount">{formatCurrency(order.total_amount)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Payment Status</label>
                        <p className="payment-status">{getPaymentStatusLabel(order.payment_status)}</p>
                      </div>
                      <div className="detail-item">
                        <label>Shipping</label>
                        <p>{order.shipping_address || '—'}</p>
                      </div>
                      {order.status === 'returned' && (
                        <>
                          <div className="detail-item">
                            <label>Return Status</label>
                            <p>
                              <span className={`tracking-badge ${formatTrackingClass(order.return_status || 'Requested')}`}>
                                {order.return_status || 'Requested'}
                              </span>
                            </p>
                          </div>
                          <div className="detail-item">
                            <label>Refund Status</label>
                            <p>
                              <span className={`tracking-badge ${formatTrackingClass(order.refund_status || 'Not Initiated')}`}>
                                {order.refund_status || 'Not Initiated'}
                              </span>
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    {order.status === 'returned' && order.return_status === 'Rejected' && order.admin_message && (
                      <div className="rejection-message-box" style={{ marginTop: '0.85rem' }}>
                        <strong>Admin Message</strong>
                        <p>{order.admin_message}</p>
                      </div>
                    )}
                  </div>

                  <div className="order-actions">
                    <button
                      className="action-btn primary-btn"
                      onClick={() => handleViewDetails(order)}
                      disabled={isButtonLoading(order.id, 'details')}
                    >
                      {isButtonLoading(order.id, 'details') ? '⏳ Loading...' : '📋 View Details'}
                    </button>
                    <button
                      className="action-btn secondary-btn"
                      onClick={() => handleDownloadInvoice(order)}
                      disabled={isButtonLoading(order.id, 'invoice')}
                    >
                      {isButtonLoading(order.id, 'invoice') ? '⏳ Preparing...' : '📥 Download Invoice'}
                    </button>
                    {order.status === 'shipped' && (
                      <button className="action-btn secondary-btn">
                        📍 Track Order
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <button
                        className="action-btn secondary-btn"
                        onClick={() => openReturnModal(order)}
                        disabled={isButtonLoading(order.id, 'return')}
                      >
                        ↩ Return Order
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <button
                        className="action-btn secondary-btn"
                        onClick={() => openReviewModal(order)}
                        disabled={!!reviewsByOrder[order.id]}
                      >
                        {reviewsByOrder[order.id]
                          ? `⭐ You rated ${reviewsByOrder[order.id].rating}/5`
                          : '⭐ Leave Review'}
                      </button>
                    )}
                    {['pending', 'confirmed'].includes(order.status) && (
                      <button
                        className="action-btn cancel-btn"
                        onClick={() => handleCancelOrder(order)}
                        disabled={isButtonLoading(order.id, 'cancel')}
                      >
                        {isButtonLoading(order.id, 'cancel') ? '⏳ Cancelling...' : '✕ Cancel Order'}
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
        )}

        {isDetailsOpen && selectedOrder && (
          <div className="modal-overlay-pro" onClick={() => !detailsLoading && setIsDetailsOpen(false)}>
            <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-pro">
                <div>
                  <span className="modal-label">Order Details</span>
                  <h2>Order #{selectedOrder.id}</h2>
                </div>
                <button
                  className="modal-close-pro"
                  onClick={() => setIsDetailsOpen(false)}
                  disabled={detailsLoading}
                >
                  ×
                </button>
              </div>

              <div className="modal-body-pro">
                <section className="modal-section">
                  <h3>Overview</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Customer</label>
                      <p>{selectedOrder.customer_name || user?.name || 'Customer'}</p>
                    </div>
                    <div className="info-item">
                      <label>Date</label>
                      <p>{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="info-item">
                      <label>Status</label>
                      <p style={{ textTransform: 'capitalize' }}>{selectedOrder.status}</p>
                    </div>
                    <div className="info-item">
                      <label>Total</label>
                      <p>{formatCurrency(selectedOrder.total_amount)}</p>
                    </div>
                  </div>
                </section>

                <section className="modal-section">
                  <h3>Shipping Address</h3>
                  <div className="info-item">
                    <p>{selectedOrder.shipping_address || 'Not provided'}</p>
                  </div>
                </section>

                <section className="modal-section">
                  <h3>Items</h3>
                  {detailsLoading ? (
                    <p>Loading order items...</p>
                  ) : (
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
                        {(selectedOrder.items || []).map((item) => (
                          <tr key={item.id || `${item.product_id}-${item.product_name}`}>
                            <td>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.price)}</td>
                            <td>{formatCurrency(parseFloat(item.price || 0) * parseInt(item.quantity || 0, 10))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                {selectedOrder.status === 'returned' && (
                  <section className="modal-section">
                    <h3>Return & Refund Tracking</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Return Status</label>
                        <p>
                          <span className={`tracking-badge ${formatTrackingClass(selectedOrder.return_status || 'Requested')}`}>
                            {selectedOrder.return_status || 'Requested'}
                          </span>
                        </p>
                      </div>
                      <div className="info-item">
                        <label>Refund Status</label>
                        <p>
                          <span className={`tracking-badge ${formatTrackingClass(selectedOrder.refund_status || 'Not Initiated')}`}>
                            {selectedOrder.refund_status || 'Not Initiated'}
                          </span>
                        </p>
                      </div>
                    </div>
                    {selectedOrder.return_status === 'Rejected' && selectedOrder.admin_message && (
                      <div className="rejection-message-box" style={{ marginTop: '0.85rem' }}>
                        <strong>Admin Message</strong>
                        <p>{selectedOrder.admin_message}</p>
                      </div>
                    )}
                  </section>
                )}
              </div>

              <div className="modal-footer-pro">
                <button
                  className="btn-outline"
                  onClick={() => handleDownloadInvoice(selectedOrder)}
                  disabled={isButtonLoading(selectedOrder.id, 'invoice')}
                >
                  {isButtonLoading(selectedOrder.id, 'invoice') ? 'Preparing...' : 'Download Invoice'}
                </button>

                {['pending', 'confirmed'].includes(selectedOrder.status) ? (
                  <button
                    className="btn-primary"
                    onClick={() => handleCancelOrder(selectedOrder)}
                    disabled={isButtonLoading(selectedOrder.id, 'cancel')}
                  >
                    {isButtonLoading(selectedOrder.id, 'cancel') ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                ) : (
                  <button className="btn-primary" disabled>
                    {selectedOrder.status === 'cancelled' ? 'Already Cancelled' : 'Order Finalized'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isReviewOpen && reviewOrder && (
          <div className="modal-overlay-pro" onClick={() => !reviewSubmitting && setIsReviewOpen(false)}>
            <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-pro">
                <div>
                  <span className="modal-label">Order Review</span>
                  <h2>Rate Order #{reviewOrder.id}</h2>
                </div>
                <button
                  className="modal-close-pro"
                  onClick={() => setIsReviewOpen(false)}
                  disabled={reviewSubmitting}
                >
                  ×
                </button>
              </div>

              <div className="modal-body-pro">
                <section className="modal-section">
                  <h3>Your Rating</h3>
                  <div className="review-stars-row" onMouseLeave={() => setHoverRating(0)}>
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = star <= (hoverRating || selectedRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          className={`review-star-btn ${active ? 'active' : ''}`}
                          onMouseEnter={() => setHoverRating(star)}
                          onClick={() => setSelectedRating(star)}
                          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                        >
                          ★
                        </button>
                      );
                    })}
                  </div>
                  <p className="review-hint">
                    {selectedRating > 0 ? `You selected ${selectedRating} star${selectedRating > 1 ? 's' : ''}.` : 'Select a rating from 1 to 5 stars.'}
                  </p>
                </section>

                <section className="modal-section">
                  <h3>Review (Optional)</h3>
                  <textarea
                    className="review-textarea"
                    placeholder="Tell us about your experience with this order..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    maxLength={400}
                    disabled={reviewSubmitting}
                  />
                </section>
              </div>

              <div className="modal-footer-pro">
                <button
                  className="btn-outline"
                  onClick={() => setIsReviewOpen(false)}
                  disabled={reviewSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={saveReview}
                  disabled={reviewSubmitting || selectedRating < 1}
                >
                  {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        )}

        {isReturnOpen && returnOrder && (
          <div className="modal-overlay-pro" onClick={closeReturnModal}>
            <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-pro">
                <div>
                  <span className="modal-label">Return Request</span>
                  <h2>Return Order #{returnOrder.id}</h2>
                </div>
                <button
                  className="modal-close-pro"
                  onClick={closeReturnModal}
                  disabled={returnSubmitting}
                >
                  ×
                </button>
              </div>

              <div className="modal-body-pro">
                <section className="modal-section">
                  <h3>Return Reason</h3>
                  <div className="form-group-pro">
                    <label>Reason *</label>
                    <select
                      className="form-input-pro"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      disabled={returnSubmitting}
                    >
                      <option value="">Select a reason</option>
                      {RETURN_REASONS.map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                </section>

                <section className="modal-section">
                  <h3>Additional Comments (Optional)</h3>
                  <textarea
                    className="review-textarea"
                    placeholder="Add more details about the return request..."
                    value={returnComment}
                    onChange={(e) => setReturnComment(e.target.value)}
                    rows={4}
                    maxLength={500}
                    disabled={returnSubmitting}
                  />
                </section>

                <section className="modal-section">
                  <h3>Upload Image (Optional but recommended)</h3>
                  <div className="form-group-pro">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      onChange={handleReturnImageChange}
                      disabled={returnSubmitting}
                    />
                    <p className="review-hint">Accepted formats: JPG, PNG. Max size: 2MB.</p>
                    {returnImageName && <p className="review-hint">Selected: {returnImageName}</p>}
                    {returnImage && (
                      <img
                        src={returnImage}
                        alt="Return proof preview"
                        className="return-preview-image"
                      />
                    )}
                  </div>
                </section>
              </div>

              <div className="modal-footer-pro">
                <button
                  className="btn-outline"
                  onClick={closeReturnModal}
                  disabled={returnSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={submitReturnRequest}
                  disabled={returnSubmitting || !returnReason}
                >
                  {returnSubmitting ? 'Submitting...' : 'Submit Return'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
