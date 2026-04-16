import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, toNumber } from '../components/currency';

const BACKEND_BASE_URL = 'http://localhost:5000';
const PLACEHOLDER_IMAGE = `${BACKEND_BASE_URL}/uploads/placeholder.png`;

const resolveImageUrl = (url) => {
  if (!url) return PLACEHOLDER_IMAGE;
  if (url.startsWith('/') && !url.startsWith('//')) return `${BACKEND_BASE_URL}${url}`;
  return url;
};

const validateShippingAddress = (shippingAddress) => {
  const errors = {};

  if (!shippingAddress.address.trim() || shippingAddress.address.trim().length < 5) {
    errors.address = 'Please enter a valid address (minimum 5 characters).';
  }

  if (!shippingAddress.city.trim() || !/^[a-zA-Z\s]{2,}$/.test(shippingAddress.city.trim())) {
    errors.city = 'Please enter a valid city name.';
  }

  if (!shippingAddress.state.trim() || !/^[a-zA-Z\s]{2,}$/.test(shippingAddress.state.trim())) {
    errors.state = 'Please enter a valid state name.';
  }

  if (!/^\d{6}$/.test(shippingAddress.zipCode.trim())) {
    errors.zipCode = 'Please enter a valid 6-digit PIN code.';
  }

  if (!shippingAddress.country.trim() || shippingAddress.country.trim().length < 2) {
    errors.country = 'Please enter a valid country.';
  }

  return errors;
};

const validatePaymentDetails = (paymentMethod, paymentDetails) => {
  const errors = {};

  if (paymentMethod === 'card') {
    const cardNumber = paymentDetails.cardNumber.replace(/\s/g, '');

    if (!/^\d{16}$/.test(cardNumber)) {
      errors.cardNumber = 'Card number must be 16 digits.';
    }

    if (!/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(paymentDetails.expiryDate.trim())) {
      errors.expiryDate = 'Expiry must be in MM/YY format.';
    }

    if (!/^\d{3}$/.test(paymentDetails.cvv.trim())) {
      errors.cvv = 'CVV must be 3 digits.';
    }
  }

  if (paymentMethod === 'upi') {
    if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(paymentDetails.upiId.trim())) {
      errors.upiId = 'Please enter a valid UPI ID (e.g., name@bank).';
    }
  }

  if (paymentMethod === 'cod') {
    return errors;
  }

  return errors;
};

const Checkout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [catalogStockById, setCatalogStockById] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India'
  });
  const [shippingErrors, setShippingErrors] = useState({});
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    upiId: ''
  });
  const [paymentErrors, setPaymentErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const paymentSectionRef = useRef(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchCheckoutData();
  }, [user, navigate]);

  useEffect(() => {
    if (cart.length === 0) {
      console.log('[Checkout][Debug] Cart is empty.');
      return;
    }

    console.log('[Checkout][Debug] Cart loaded:', cart.map((item) => ({
      id: item.id,
      name: item.name,
      rawPrice: item.price,
      numericPrice: toNumber(item.price),
      quantity: Number.parseInt(item.quantity || 0, 10) || 0
    })));

    let runningTotal = 0;
    cart.forEach((item, index) => {
      const unitPrice = toNumber(item.price);
      const quantity = Number.parseInt(item.quantity || 0, 10) || 0;
      const lineTotal = unitPrice * quantity;
      runningTotal += lineTotal;

      console.log(`[Checkout][Debug] Item ${index + 1}:`, {
        productId: item.id,
        unitPrice,
        quantity,
        lineTotal,
        runningTotal
      });
    });

    console.log('[Checkout][Debug] Final cart total (INR):', runningTotal);
  }, [cart]);

  useEffect(() => {
    setSelectedItems((prev) => {
      const next = {};
      cart.forEach((item) => {
        next[item.id] = Object.prototype.hasOwnProperty.call(prev, item.id) ? prev[item.id] : true;
      });
      return next;
    });
  }, [cart]);

  const fetchCheckoutData = async () => {
    try {
      const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
      console.log('[Checkout][Debug] Raw cart from localStorage:', savedCart);
      setCart(savedCart);

      const productsResponse = await axios.get('/api/products');
      const stockMap = productsResponse.data.reduce((acc, product) => {
        acc[product.id] = Number.parseInt(product.stock_quantity || 0, 10) || 0;
        return acc;
      }, {});
      setCatalogStockById(stockMap);
    } catch (error) {
      console.error('Error loading checkout data:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const persistCart = (nextCart) => {
    setCart(nextCart);
    localStorage.setItem('cart', JSON.stringify(nextCart));
  };

  const addToCart = (product) => {
    // Deep copy product to prevent state mutation
    const cartItem = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock_quantity: product.stock_quantity,
      image_url: product.image_url,
      quantity: 1,
      category_id: product.category_id
    };
    const nextCart = [...cart, cartItem];
    persistCart(nextCart);
  };

  const removeFromCart = (productId) => {
    const nextCart = cart.filter((item) => item.id !== productId).map(item => ({ ...item }));
    persistCart(nextCart);
  };

  const updateStock = (productId, nextQuantity) => {
    const maxAvailable = catalogStockById[productId] ?? 0;
    if (nextQuantity < 1) {
      return { valid: false, message: 'Quantity cannot be less than 1.' };
    }
    if (nextQuantity > maxAvailable) {
      return { valid: false, message: `Only ${maxAvailable} item(s) available in stock.` };
    }
    return { valid: true };
  };

  const updateQuantity = (productId, delta) => {
    const currentItem = cart.find((item) => item.id === productId);
    if (!currentItem) return;

    const currentQuantity = Number.parseInt(currentItem.quantity || 0, 10) || 0;
    const nextQuantity = currentQuantity + delta;

    if (nextQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const stockCheck = updateStock(productId, nextQuantity);
    if (!stockCheck.valid) {
      alert(stockCheck.message);
      return;
    }

    const nextCart = cart.map((item) => (
      item.id === productId
        ? { ...item, quantity: nextQuantity }
        : { ...item }
    ));

    persistCart(nextCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => {
      const unitPrice = toNumber(item.price);
      const quantity = Number.parseInt(item.quantity || 0, 10) || 0;
      return total + (unitPrice * quantity);
    }, 0);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      if (!selectedItems[item.id]) return total;
      const unitPrice = toNumber(item.price);
      const quantity = Number.parseInt(item.quantity || 0, 10) || 0;
      return total + (unitPrice * quantity);
    }, 0);
  };

  const selectedCount = cart.reduce((count, item) => (
    selectedItems[item.id] ? count + 1 : count
  ), 0);

  const toggleSelection = (productId) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const toggleSelectAll = () => {
    const allSelected = cart.length > 0 && cart.every((item) => selectedItems[item.id]);
    const next = {};
    cart.forEach((item) => {
      next[item.id] = !allSelected;
    });
    setSelectedItems(next);
  };

  const proceedToPay = () => {
    paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleShippingChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress({
      ...shippingAddress,
      [name]: value
    });

    if (shippingErrors[name]) {
      setShippingErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentDetails({
      ...paymentDetails,
      [name]: value
    });

    if (paymentErrors[name]) {
      setPaymentErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePaymentMethodChange = (e) => {
    const method = e.target.value;
    setPaymentMethod(method);
    setPaymentErrors({});
    setStatusMessage({ type: '', text: '' });
  };

  const simulatePaymentSuccess = () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ success: true }), 1200);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    console.log('[Checkout][Debug] Checkout submit triggered.');

    if (cart.length === 0) {
      setStatusMessage({ type: 'error', text: 'Your cart is empty.' });
      return;
    }

    if (selectedCount === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one item to continue.' });
      return;
    }

    const payableTotal = calculateTotal();
    console.log('[Checkout][Debug] Calculated payable total (INR):', payableTotal);

    const nextShippingErrors = validateShippingAddress(shippingAddress);
    const nextPaymentErrors = validatePaymentDetails(paymentMethod, paymentDetails);

    setShippingErrors(nextShippingErrors);
    setPaymentErrors(nextPaymentErrors);

    if (Object.keys(nextShippingErrors).length > 0 || Object.keys(nextPaymentErrors).length > 0) {
      setStatusMessage({ type: 'error', text: 'Please correct the highlighted fields before payment.' });
      return;
    }

    try {
      setPaymentProcessing(true);
      setStatusMessage({ type: '', text: '' });

      // Create order
      const orderData = {
        items: cart.filter((item) => selectedItems[item.id]).map(item => ({
          product_id: item.id,
          quantity: item.quantity
        })),
        shipping_address: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}, ${shippingAddress.country}`
      };

      console.log('[Checkout][Debug] Order payload:', orderData);
      console.log('[Checkout][Debug] Selected payment method:', paymentMethod);

      const response = await axios.post('/api/orders', orderData);

      const paymentResult = await simulatePaymentSuccess();
      if (!paymentResult.success) {
        throw new Error('Payment failed');
      }

      setStatusMessage({ type: 'success', text: 'Payment successful. Redirecting to your orders...' });

      // Clear cart
      const remainingCart = cart.filter((item) => !selectedItems[item.id]);
      if (remainingCart.length === 0) {
        localStorage.removeItem('cart');
      } else {
        localStorage.setItem('cart', JSON.stringify(remainingCart));
      }
      setCart(remainingCart);

      // Redirect to orders dashboard
      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 1200);

    } catch (error) {
      console.error('Error placing order:', error);
      setStatusMessage({ type: 'error', text: 'Payment failed or order could not be placed. Please try again.' });
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (pageLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <button
            onClick={() => navigate('/products')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="mb-4 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                <input
                  type="checkbox"
                  checked={cart.length > 0 && cart.every((item) => selectedItems[item.id])}
                  onChange={toggleSelectAll}
                />
                Select all items
              </label>
              <span className="text-xs text-gray-500">{selectedCount} selected</span>
            </div>

            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={!!selectedItems[item.id]}
                    onChange={() => toggleSelection(item.id)}
                  />
                  <img
                    src={resolveImageUrl(item.image_url)}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                  />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                    <div className="checkout-qty-row">
                      <button
                        type="button"
                        className="checkout-qty-btn"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        -
                      </button>
                      <span className="checkout-qty-value">Qty: {item.quantity}</span>
                      <button
                        type="button"
                        className="checkout-qty-btn"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="checkout-remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Available stock: {Math.max((catalogStockById[item.id] ?? 0) - (Number.parseInt(item.quantity || 0, 10) || 0), 0)}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(toNumber(item.price) * (Number.parseInt(item.quantity || 0, 10) || 0))}</p>
                </div>
              ))}
            </div>

            <div className="border-t mt-6 pt-6">
              <div className="flex justify-between text-sm font-medium text-gray-600 mb-2">
                <span>Subtotal (all items)</span>
                <span>{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total (selected)</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
              <button
                type="button"
                onClick={proceedToPay}
                disabled={selectedCount === 0}
                className="w-full mt-4 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Pay
              </button>
            </div>
          </div>

          {/* Checkout Form */}
          <div ref={paymentSectionRef} className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {statusMessage.text && (
                <div className={statusMessage.type === 'success' ? 'auth-success' : 'auth-error'}>
                  {statusMessage.text}
                </div>
              )}

              {/* Shipping Address */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <input
                      type="text"
                      id="address"
                      name="address"
                      required
                      value={shippingAddress.address}
                      onChange={handleShippingChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${shippingErrors.address ? 'input-error' : ''}`}
                    />
                    {shippingErrors.address && <p className="field-error-msg">{shippingErrors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        required
                        value={shippingAddress.city}
                        onChange={handleShippingChange}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${shippingErrors.city ? 'input-error' : ''}`}
                      />
                      {shippingErrors.city && <p className="field-error-msg">{shippingErrors.city}</p>}
                    </div>
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        State
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        required
                        value={shippingAddress.state}
                        onChange={handleShippingChange}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${shippingErrors.state ? 'input-error' : ''}`}
                      />
                      {shippingErrors.state && <p className="field-error-msg">{shippingErrors.state}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                        ZIP Code
                      </label>
                      <input
                        type="text"
                        id="zipCode"
                        name="zipCode"
                        required
                        value={shippingAddress.zipCode}
                        onChange={handleShippingChange}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${shippingErrors.zipCode ? 'input-error' : ''}`}
                      />
                      {shippingErrors.zipCode && <p className="field-error-msg">{shippingErrors.zipCode}</p>}
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        Country
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        required
                        value={shippingAddress.country}
                        onChange={handleShippingChange}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${shippingErrors.country ? 'input-error' : ''}`}
                      />
                      {shippingErrors.country && <p className="field-error-msg">{shippingErrors.country}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="card"
                      name="paymentMethod"
                      type="radio"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={handlePaymentMethodChange}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <label htmlFor="card" className="ml-3 block text-sm font-medium text-gray-700">
                      Credit/Debit Card
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="upi"
                      name="paymentMethod"
                      type="radio"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={handlePaymentMethodChange}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <label htmlFor="upi" className="ml-3 block text-sm font-medium text-gray-700">
                      UPI
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="cod"
                      name="paymentMethod"
                      type="radio"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={handlePaymentMethodChange}
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    />
                    <label htmlFor="cod" className="ml-3 block text-sm font-medium text-gray-700">
                      Cash on Delivery (COD)
                    </label>
                  </div>
                </div>

                {/* Payment Details */}
                {paymentMethod === 'card' && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
                        Card Number
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={paymentDetails.cardNumber}
                        onChange={handlePaymentChange}
                        className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${paymentErrors.cardNumber ? 'input-error' : ''}`}
                      />
                      {paymentErrors.cardNumber && <p className="field-error-msg">{paymentErrors.cardNumber}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          id="expiryDate"
                          name="expiryDate"
                          placeholder="MM/YY"
                          value={paymentDetails.expiryDate}
                          onChange={handlePaymentChange}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${paymentErrors.expiryDate ? 'input-error' : ''}`}
                        />
                        {paymentErrors.expiryDate && <p className="field-error-msg">{paymentErrors.expiryDate}</p>}
                      </div>
                      <div>
                        <label htmlFor="cvv" className="block text-sm font-medium text-gray-700">
                          CVV
                        </label>
                        <input
                          type="text"
                          id="cvv"
                          name="cvv"
                          placeholder="123"
                          value={paymentDetails.cvv}
                          onChange={handlePaymentChange}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${paymentErrors.cvv ? 'input-error' : ''}`}
                        />
                        {paymentErrors.cvv && <p className="field-error-msg">{paymentErrors.cvv}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'upi' && (
                  <div className="mt-4">
                    <label htmlFor="upiId" className="block text-sm font-medium text-gray-700">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      id="upiId"
                      name="upiId"
                      placeholder="user@upi"
                      value={paymentDetails.upiId}
                      onChange={handlePaymentChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${paymentErrors.upiId ? 'input-error' : ''}`}
                    />
                    {paymentErrors.upiId && <p className="field-error-msg">{paymentErrors.upiId}</p>}
                  </div>
                )}

                {paymentMethod === 'cod' && (
                  <div className="mt-4 cod-note">
                    Pay with cash upon delivery.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={paymentProcessing || selectedCount === 0}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {paymentProcessing ? (
                  <span className="checkout-processing-inline">
                    <span className="checkout-spinner" />
                    Processing Payment...
                  </span>
                ) : (
                  selectedCount === 0 ? 'Select items to continue' : `Pay ${formatCurrency(calculateTotal())}`
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
