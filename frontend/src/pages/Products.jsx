import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../components/currency';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

const Products = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [baseStockById, setBaseStockById] = useState({});
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    image_url: ''
  });
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showCartToast, setShowCartToast] = useState(false);
  const [cartToastMessage, setCartToastMessage] = useState('');
  const [cartCountAnimating, setCartCountAnimating] = useState(false);
  const [imageDragActive, setImageDragActive] = useState(false);
  const [imageObjectFit, setImageObjectFit] = useState('cover');

  const toastTimerRef = useRef(null);
  const previousCartCountRef = useRef(0);
  const fileInputRef = useRef(null);
  const previewObjectUrlRef = useRef(null);
  const persistedObjectUrlsRef = useRef(new Set());

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  useEffect(() => {
    updateStock(cart);
  }, [cart, baseStockById]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      if (previewObjectUrlRef.current && !persistedObjectUrlsRef.current.has(previewObjectUrlRef.current)) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }

      persistedObjectUrlsRef.current.forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl);
      });
    };
  }, []);

  const getDisplayImage = (product) => product?.localImageUrl || product?.image_url || '/placeholder-product.jpg';

  const revokeCurrentPreviewObjectUrl = () => {
    if (previewObjectUrlRef.current && !persistedObjectUrlsRef.current.has(previewObjectUrlRef.current)) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    previewObjectUrlRef.current = null;
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      const stockMap = response.data.reduce((acc, product) => {
        acc[product.id] = Number.parseInt(product.stock_quantity || 0, 10) || 0;
        return acc;
      }, {});
      setBaseStockById(stockMap);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  };

  const getCartQuantity = (productId, sourceCart = cart) => {
    return sourceCart.reduce((total, item) => {
      if (item.id !== productId) return total;
      return total + (Number.parseInt(item.quantity || 0, 10) || 0);
    }, 0);
  };

  const updateStock = (sourceCart = cart) => {
    setProducts((prevProducts) => prevProducts.map((product) => {
      const baseStock = Number.parseInt(baseStockById[product.id] ?? product.stock_quantity ?? 0, 10) || 0;
      const reservedInCart = getCartQuantity(product.id, sourceCart);
      const nextStock = Math.max(baseStock - reservedInCart, 0);
      return {
        ...product,
        stock_quantity: nextStock
      };
    }));
  };

  const addToCart = (product) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if ((Number.parseInt(product.stock_quantity || 0, 10) || 0) <= 0) {
      alert('Out of stock');
      return;
    }

    const existingItem = cart.find(item => item.id === product.id);
    let newCart;

    if (existingItem) {
      newCart = cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: (Number.parseInt(item.quantity || 0, 10) || 0) + 1 }
          : { ...item }
      );
    } else {
      // Deep copy product to prevent state mutation issues
      const cartItem = {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock_quantity: product.stock_quantity,
        image_url: getDisplayImage(product),
        quantity: 1,
        category_id: product.category_id
      };
      newCart = [...cart, cartItem];
    }

    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    updateStock(newCart);
    setCartToastMessage('Item added to cart');
    setShowCartToast(true);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setShowCartToast(false);
    }, 1800);
  };

  const addProduct = async (payload) => {
    return axios.post('http://localhost:5000/api/products', payload);
  };

  const guardAdminAccess = () => {
    if (!isAdmin) {
      alert('Access Denied');
      return false;
    }
    return true;
  };

  const resetProductForm = () => {
    revokeCurrentPreviewObjectUrl();
    setFormData({
      name: '',
      description: '',
      price: '',
      stock_quantity: '',
      image_url: ''
    });
    setSelectedImageFile(null);
    setImagePreview('');
    setSelectedFileName('');
    setFormError('');
    setFormSuccess('');
    setImageObjectFit('cover');
    setImageDragActive(false);
  };

  const openAddProductModal = () => {
    if (!guardAdminAccess()) return;
    setEditProductId(null);
    resetProductForm();
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product) => {
    if (!guardAdminAccess()) return;
    setEditProductId(product.id);
    revokeCurrentPreviewObjectUrl();
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: String(product.price ?? ''),
      stock_quantity: String(product.stock_quantity ?? ''),
      image_url: product.image_url || ''
    });
    setSelectedImageFile(null);
    setImagePreview(product.localImageUrl || product.image_url || '');
    setSelectedFileName('');
    setFormError('');
    setFormSuccess('');
    setIsProductModalOpen(true);
  };

  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setEditProductId(null);
    resetProductForm();
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'image_url') {
      setSelectedFileName(value.trim() ? 'URL image' : '');
    }
  };

  const handleImageFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSelectedImageFile(null);
      setFormError('Invalid format. Please upload JPG, JPEG, or PNG only.');
      event.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxMB = (MAX_IMAGE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
      setSelectedImageFile(null);
      setFormError(`File too large (${sizeMB}MB). Maximum allowed is ${maxMB}MB.`);
      event.target.value = '';
      return;
    }

    revokeCurrentPreviewObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;

    setSelectedImageFile(file);
    setFormData((prev) => ({ ...prev, image_url: '' }));
    setImagePreview(objectUrl);
    setSelectedFileName(file.name);
    setFormError('');
    setFormSuccess('Image ready for local preview. It will stay on the frontend only.');
  };

  const handleImageDrag = (e, isEnter) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragActive(isEnter);
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setImageDragActive(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) {
      // Trigger file input with dropped file
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
        handleImageFileSelect({ target: { files: dataTransfer.files } });
      }
    }
  };

  const removeImage = () => {
    revokeCurrentPreviewObjectUrl();
    setSelectedImageFile(null);
    setFormData((prev) => ({ ...prev, image_url: '' }));
    setImagePreview('');
    setSelectedFileName('');
    setFormSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleImageObjectFit = () => {
    setImageObjectFit((prev) => (prev === 'cover' ? 'contain' : 'cover'));
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();
    if (!guardAdminAccess()) return;

    const name = formData.name.trim();
    const description = formData.description.trim();
    const price = Number.parseFloat(formData.price || '0');
    const stock_quantity = Number.parseInt(formData.stock_quantity || '0', 10);
    const hasExistingRemoteImage = Boolean(editProductId && imagePreview && !selectedImageFile);
    const localImagePreview = selectedImageFile ? imagePreview : '';

    if (!name) {
      setFormError('Product name is required.');
      return;
    }

    if (!description) {
      setFormError('Description is required.');
      return;
    }

    if (Number.isNaN(price) || price < 0 || Number.isNaN(stock_quantity) || stock_quantity < 0) {
      setFormError('Please enter valid non-negative values for price and stock.');
      return;
    }

    if (!selectedImageFile && !hasExistingRemoteImage) {
      setFormError('Upload failed. Please choose a valid image file before saving.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const payload = {
        name,
        description,
        price,
        stock_quantity,
        category_id: null
      };

      if (selectedImageFile && localImagePreview) {
        persistedObjectUrlsRef.current.add(localImagePreview);
        previewObjectUrlRef.current = null;
      }

      if (editProductId) {
        await axios.put(`http://localhost:5000/api/products/${editProductId}`, payload);
        setBaseStockById((prev) => ({
          ...prev,
          [editProductId]: stock_quantity
        }));
        setProducts((prev) => prev.map((product) => (
          product.id === editProductId
            ? {
                ...product,
                ...payload,
                localImageUrl: selectedImageFile ? localImagePreview : product.localImageUrl || product.image_url || ''
              }
            : product
        )));
        setFormSuccess('✓ Product updated successfully');
        closeProductModal();
      } else {
        const response = await addProduct(payload);
        const newId = response?.data?.id || Date.now();
        const newProduct = {
          id: newId,
          ...payload,
          image_url: '',
          localImageUrl: localImagePreview
        };

        setProducts((prev) => [newProduct, ...prev]);
        setBaseStockById((prev) => ({
          ...prev,
          [newId]: stock_quantity
        }));

        setFormSuccess('✓ Product added successfully');
        closeProductModal();
        setCartToastMessage('Product added successfully');
        setShowCartToast(true);
        if (toastTimerRef.current) {
          clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
          setShowCartToast(false);
        }, 1800);
      }
    } catch (error) {
      console.error('Error saving product:', error);
      
      const errorMsg = error.response?.data?.message || error.message || 'Failed to save product';
      const statusCode = error.response?.status;

      let userErrorMsg = '';
      if (statusCode === 413) {
        userErrorMsg = 'File too large. Please use an image under 2MB.';
      } else if (statusCode === 400) {
        userErrorMsg = errorMsg;
      } else if (statusCode === 500) {
        userErrorMsg = 'Upload failed. Please try again later.';
      } else {
        userErrorMsg = errorMsg;
      }

      setFormError(userErrorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!guardAdminAccess()) return;

    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    try {
      await axios.delete(`http://localhost:5000/api/products/${productId}`);
      alert('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.message || 'Failed to delete product');
    }
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + (Number.parseInt(item.quantity || 0, 10) || 0), 0);
  };

  const cartItemCount = getCartItemCount();

  useEffect(() => {
    if (cartItemCount !== previousCartCountRef.current) {
      setCartCountAnimating(true);
      const timer = setTimeout(() => setCartCountAnimating(false), 300);
      previousCartCountRef.current = cartItemCount;
      return () => clearTimeout(timer);
    }
  }, [cartItemCount]);

  const filteredProducts = products.filter((product) => {
    if (!searchQuery) return true;

    const name = (product.name || '').toLowerCase();
    const description = (product.description || '').toLowerCase();
    return name.includes(searchQuery) || description.includes(searchQuery);
  });

  const highlightMatch = (text) => {
    const value = text || '';
    if (!searchQuery) return value;

    const lower = value.toLowerCase();
    const index = lower.indexOf(searchQuery);

    if (index === -1) return value;

    const before = value.slice(0, index);
    const match = value.slice(index, index + searchQuery.length);
    const after = value.slice(index + searchQuery.length);

    return (
      <>
        {before}
        <mark className="product-highlight">{match}</mark>
        {after}
      </>
    );
  };

  const skeletonCards = Array.from({ length: 8 }, (_, index) => index);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Products</h1>
              {isAdmin && <span className="admin-mode-badge">Admin Mode</span>}
            </div>
            <div className="flex items-center space-x-4">
              {isAdmin && (
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="admin-manage-btn"
                >
                  + Add Product
                </button>
              )}
              {isCustomer && (
                <>
                  <button
                    onClick={() => navigate('/checkout')}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 relative"
                  >
                    Cart (
                    <span className={`cart-count-pill ${cartCountAnimating ? 'is-animating' : ''}`}>
                      {cartItemCount}
                    </span>
                    )
                  </button>
                  <span className="text-gray-700">Welcome, {user.name}</span>
                </>
              )}
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/dashboard')}
                    className="admin-dashboard-btn is-active"
                  >
                    Dashboard
                  </button>
                  <span className="text-gray-700">Welcome, {user.name}</span>
                </>
              )}
              {user && !isCustomer && !isAdmin && (
                <span className="text-gray-700">Welcome, {user.name}</span>
              )}
              {!user && (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="products-search-wrap">
            <span className="products-search-icon">🔍</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products by name or description"
              className="products-search-input"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="products-search-clear"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? skeletonCards.map((item) => (
              <div key={item} className="bg-white overflow-hidden shadow rounded-lg product-skeleton-card" aria-hidden="true">
                <div className="product-skeleton-image" />
                <div className="p-4 product-skeleton-content">
                  <div className="product-skeleton-line product-skeleton-title" />
                  <div className="product-skeleton-line product-skeleton-description" />
                  <div className="product-skeleton-line product-skeleton-description short" />
                  <div className="product-skeleton-row">
                    <div className="product-skeleton-line product-skeleton-price" />
                    <div className="product-skeleton-line product-skeleton-stock" />
                  </div>
                  <div className="product-skeleton-button" />
                </div>
              </div>
            )) : filteredProducts.map((product) => (
              <div key={product.id} className={`bg-white overflow-hidden shadow rounded-lg ${isAdmin ? 'admin-product-card' : 'product-card'}`}>
                <div className="aspect-w-1 aspect-h-1">
                  <img
                    src={getDisplayImage(product)}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-900">{highlightMatch(product.name)}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{highlightMatch(product.description)}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(product.price)}</p>
                    <p className="text-sm text-gray-500">Stock: {product.stock_quantity}</p>
                  </div>
                  <button
                    onClick={() => !isAdmin && addToCart(product)}
                    disabled={isAdmin || product.stock_quantity === 0}
                    className={`mt-3 w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed ${isAdmin ? 'admin-shopping-disabled-btn' : ''}`}
                  >
                    {isAdmin ? 'Admin Mode' : product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>

                  {isAdmin && (
                    <div className="admin-product-actions">
                      <button
                        type="button"
                        className="admin-edit-btn"
                        onClick={() => openEditProductModal(product)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!loading && filteredProducts.length === 0 && (
            <div className="products-empty-state">
              <h3>No products found</h3>
              <p>Try a different keyword or clear the search.</p>
            </div>
          )}

          {loading && (
            <div className="products-loading-overlay" role="status" aria-live="polite">
              <div className="products-loading-panel">
                <div className="products-loading-spinner" />
                <p className="products-loading-title">Loading products...</p>
                <p className="products-loading-subtitle">Please wait...</p>
              </div>
            </div>
          )}

          {isProductModalOpen && (
            <div className="product-modal-backdrop" role="dialog" aria-modal="true">
              <div className="product-modal-card">
                <div className="product-modal-header">
                  <h2>{editProductId ? 'Edit Product' : 'Add Product'}</h2>
                  <button
                    type="button"
                    className="product-modal-close"
                    onClick={closeProductModal}
                  >
                    ×
                  </button>
                </div>

                <form className="product-modal-form" onSubmit={handleProductSubmit}>
                  <label className="product-form-label">
                    Product Name
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleFormChange}
                      className="product-form-input"
                      required
                    />
                  </label>

                  <label className="product-form-label">
                    Description
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleFormChange}
                      className="product-form-input product-form-textarea"
                      rows={3}
                    />
                  </label>

                  <div className="product-form-grid">
                    <label className="product-form-label">
                      Price (INR)
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleFormChange}
                        className="product-form-input"
                        min="0"
                        step="0.01"
                        required
                      />
                    </label>

                    <label className="product-form-label">
                      Stock Quantity
                      <input
                        type="number"
                        name="stock_quantity"
                        value={formData.stock_quantity}
                        onChange={handleFormChange}
                        className="product-form-input"
                        min="0"
                        step="1"
                        required
                      />
                    </label>
                  </div>

                  <div className="product-form-label">
                    Product Image
                    <p className="product-form-help-text">Select an image file for local preview only</p>
                    
                    {/* Drag-and-drop upload area */}
                    <div
                      className={`product-upload-dropzone ${imageDragActive ? 'active' : ''}`}
                      onDragEnter={(e) => handleImageDrag(e, true)}
                      onDragLeave={(e) => handleImageDrag(e, false)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleImageDrop}
                    >
                      <div className="product-upload-dropzone-content">
                        <p className="product-upload-dropzone-icon">📁</p>
                        <p className="product-upload-dropzone-text">
                          Drag and drop your image here
                        </p>
                        <p className="product-upload-dropzone-or">or</p>
                        <label className="product-upload-button" htmlFor="product-image-file-input">
                          Choose File
                        </label>
                        <input
                          ref={fileInputRef}
                          id="product-image-file-input"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png"
                          onChange={handleImageFileSelect}
                          className="product-upload-hidden-input"
                        />
                      </div>
                    </div>

                    <p className="product-upload-help">
                      JPG, JPEG, PNG only. Max 2MB. The image stays in frontend state and is not sent to the server.
                    </p>
                    {selectedFileName && (
                      <div className="product-upload-url-section">
                        <span className="product-upload-file-name">
                          Selected file: {selectedFileName}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Image preview with adjustment options */}
                  {imagePreview && (
                    <div className="product-image-preview-section">
                      <div className="product-image-preview-header">
                        <h4>Image Preview</h4>
                        <div className="product-image-preview-controls">
                          <button
                            type="button"
                            className="product-image-control-btn"
                            onClick={toggleImageObjectFit}
                            title={imageObjectFit === 'cover' ? 'Switch to Fit' : 'Switch to Fill'}
                          >
                            {imageObjectFit === 'cover' ? '🔲 Fill' : '📐 Fit'}
                          </button>
                          <button
                            type="button"
                            className="product-image-remove-btn"
                            onClick={removeImage}
                            title="Remove image"
                          >
                            🗑️ Remove
                          </button>
                        </div>
                      </div>
                      <div className="product-image-preview-wrap">
                        <img
                          src={imagePreview}
                          alt="Selected product preview"
                          className="product-image-preview"
                          style={{ objectFit: imageObjectFit }}
                        />
                      </div>
                      <p className="product-image-preview-tip">
                        {imageObjectFit === 'cover' 
                          ? '🔲 Fill mode: Image covers the entire preview area' 
                          : '📐 Fit mode: Image fits entirely within preview area'}
                      </p>
                    </div>
                  )}

                  {formError && (
                    <div className="product-form-error-box">
                      <p className="product-form-error">{formError}</p>
                    </div>
                  )}
                  {formSuccess && (
                    <div className="product-form-success-box">
                      <p className="product-form-success">{formSuccess}</p>
                    </div>
                  )}

                  <div className="product-modal-actions">
                    <button
                      type="button"
                      className="product-modal-cancel"
                      onClick={closeProductModal}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="product-modal-submit"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving Product...' : editProductId ? 'Update Product' : 'Add Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showCartToast && (
            <div className="products-cart-toast" role="status" aria-live="polite">
              {cartToastMessage}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Products;