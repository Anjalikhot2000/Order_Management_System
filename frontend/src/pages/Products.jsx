import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../components/currency';
import { API_BASE_URL } from '../config/api';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
const BACKEND_BASE_URL = API_BASE_URL || '';
const DEFAULT_PRODUCT_PLACEHOLDER = `${BACKEND_BASE_URL}/uploads/placeholder.png`;
const PRODUCT_IMAGE_CACHE_KEY = 'productImageCache:v1';
const LOCAL_CATEGORIES_KEY = 'localCategories:v1';

const Products = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
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
    category_id: '',
    image_url: ''
  });
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [localImageBase64, setLocalImageBase64] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showCartToast, setShowCartToast] = useState(false);
  const [cartToastMessage, setCartToastMessage] = useState('');
  const [cartCountAnimating, setCartCountAnimating] = useState(false);
  const [imageDragActive, setImageDragActive] = useState(false);
  const [imageObjectFit, setImageObjectFit] = useState('cover');
  const [isAutoImageLoading, setIsAutoImageLoading] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
  const [categoryFormError, setCategoryFormError] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const toastTimerRef = useRef(null);
  const previousCartCountRef = useRef(0);
  const fileInputRef = useRef(null);
  const previewObjectUrlRef = useRef(null);
  const persistedObjectUrlsRef = useRef(new Set());
  const imageCacheRef = useRef({});
  const pendingImageRequestsRef = useRef(new Map());

  const isAdmin = user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const persistedObjectUrls = persistedObjectUrlsRef.current;

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }

      if (previewObjectUrlRef.current && !persistedObjectUrls.has(previewObjectUrlRef.current)) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }

      persistedObjectUrls.forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl);
      });
    };
  }, []);

  const getDisplayImage = (product) => {
    const src = product?.localImageUrl || product?.image_url;
    if (!src) return DEFAULT_PRODUCT_PLACEHOLDER;
    // Prepend backend URL for relative paths (e.g. /uploads/image.jpg, /placeholder-product.jpg)
    if (src.startsWith('/') && !src.startsWith('//')) {
      return `${BACKEND_BASE_URL}${src}`;
    }
    return src;
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const normalizeCategoryName = useCallback((categoryName) => String(categoryName || '').trim().toLowerCase(), []);

  const saveLocalCategories = useCallback((categoriesToSave) => {
    try {
      localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(categoriesToSave));
    } catch (error) {
      console.error('Failed to save local categories:', error);
    }
  }, []);

  const loadLocalCategories = useCallback(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Failed to load local categories:', error);
      return [];
    }
  }, []);

  const mergeUniqueCategories = useCallback((...categoryGroups) => {
    const categoryMap = new Map();

    categoryGroups.flat().forEach((category) => {
      if (!category) return;

      const normalizedCategory = typeof category === 'string'
        ? {
            id: `derived-${normalizeCategoryName(category)}`,
            name: String(category).trim(),
            description: ''
          }
        : {
            ...category,
            name: String(category.name || '').trim(),
            description: String(category.description || '').trim()
          };

      const normalizedName = normalizeCategoryName(normalizedCategory.name);
      if (!normalizedName) return;

      const existingCategory = categoryMap.get(normalizedName);

      if (!existingCategory) {
        categoryMap.set(normalizedName, normalizedCategory);
        return;
      }

      const hasRealId = (value) => value !== undefined && value !== null && !String(value).startsWith('derived-');

      categoryMap.set(normalizedName, {
        ...existingCategory,
        ...normalizedCategory,
        id: hasRealId(normalizedCategory.id) ? normalizedCategory.id : existingCategory.id,
      });
    });

    return Array.from(categoryMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [normalizeCategoryName]);

  const normalizeProductName = useCallback((productName) => (productName || '').trim().toLowerCase(), []);

  const persistImageCache = useCallback((cache) => {
    try {
      localStorage.setItem(PRODUCT_IMAGE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to persist product image cache:', error);
    }
  }, []);

  const cacheProductImage = useCallback((productName, imageUrl) => {
    const normalizedName = normalizeProductName(productName);
    if (!normalizedName || !imageUrl) return;

    const nextCache = {
      ...imageCacheRef.current,
      [normalizedName]: imageUrl
    };

    imageCacheRef.current = nextCache;
    persistImageCache(nextCache);
  }, [normalizeProductName, persistImageCache]);

  const fetchProductImage = useCallback(async (productName) => {
    const normalizedName = normalizeProductName(productName);

    if (!normalizedName) {
      return DEFAULT_PRODUCT_PLACEHOLDER;
    }

    const cachedImage = imageCacheRef.current[normalizedName];
    if (cachedImage) {
      return cachedImage;
    }

    const pendingRequest = pendingImageRequestsRef.current.get(normalizedName);
    if (pendingRequest) {
      return pendingRequest;
    }

    const request = (async () => {
      try {
        const sourceUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(normalizedName)}`;
        const response = await fetch(sourceUrl, {
          method: 'GET',
          redirect: 'follow'
        });

        if (!response.ok) {
          throw new Error(`Image API request failed with status ${response.status}`);
        }

        const resolvedImageUrl = response.url || sourceUrl;
        cacheProductImage(normalizedName, resolvedImageUrl);
        return resolvedImageUrl;
      } catch (error) {
        console.error(`Image fetch failed for product "${normalizedName}":`, error);
        cacheProductImage(normalizedName, DEFAULT_PRODUCT_PLACEHOLDER);
        return DEFAULT_PRODUCT_PLACEHOLDER;
      } finally {
        pendingImageRequestsRef.current.delete(normalizedName);
      }
    })();

    pendingImageRequestsRef.current.set(normalizedName, request);
    return request;
  }, [cacheProductImage, normalizeProductName]);

  const attachMissingProductImages = useCallback(async (productList) => {
    const productsWithoutImage = productList.filter((product) => !product?.localImageUrl && !product?.image_url && product?.name);

    if (productsWithoutImage.length === 0) {
      return productList;
    }

    const imagePairs = await Promise.all(productsWithoutImage.map(async (product) => {
      const fetchedImageUrl = await fetchProductImage(product.name);
      return [product.id, fetchedImageUrl];
    }));

    const imageByProductId = new Map(imagePairs);

    return productList.map((product) => {
      if (product.image_url || !imageByProductId.has(product.id)) {
        return product;
      }

      return {
        ...product,
        image_url: imageByProductId.get(product.id) || DEFAULT_PRODUCT_PLACEHOLDER
      };
    });
  }, [fetchProductImage]);

  const revokeCurrentPreviewObjectUrl = () => {
    if (previewObjectUrlRef.current && !persistedObjectUrlsRef.current.has(previewObjectUrlRef.current)) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }
    previewObjectUrlRef.current = null;
  };

  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get('/api/products');
      const productsWithImages = await attachMissingProductImages(response.data);
      const stockMap = response.data.reduce((acc, product) => {
        acc[product.id] = Number.parseInt(product.stock_quantity || 0, 10) || 0;
        return acc;
      }, {});
      setBaseStockById(stockMap);
      setProducts(productsWithImages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [attachMissingProductImages]);

  const loadCart = useCallback(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const fetchCategories = useCallback(async () => {
    const storedCategories = loadLocalCategories();

    try {
      const response = await axios.get('/api/categories');
      const mergedCategories = mergeUniqueCategories(response.data || [], storedCategories);
      setCategories(mergedCategories);
      saveLocalCategories(mergedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(mergeUniqueCategories(storedCategories));
    }
  }, [loadLocalCategories, mergeUniqueCategories, saveLocalCategories]);

  const handleCategoryChange = (categoryName) => {
    setSelectedCategory(categoryName);
  };

  const getCategoryById = useCallback((categoryId) => {
    if (!categoryId) return null;

    return categories.find((category) => String(category.id) === String(categoryId)) || null;
  }, [categories]);

  const filterByCategory = useCallback((productList, categoryName) => {
    if (categoryName === 'all') return productList;

    return productList.filter((product) => (
      normalizeCategoryName(product.category_name) === categoryName
    ));
  }, [normalizeCategoryName]);

  const resetCategoryForm = useCallback(() => {
    setCategoryFormData({ name: '', description: '' });
    setCategoryFormError('');
    setIsSavingCategory(false);
  }, []);

  const openCategoryModal = () => {
    if (!guardAdminAccess()) return;
    resetCategoryForm();
    setIsCategoryModalOpen(true);
  };

  const closeCategoryModal = useCallback(() => {
    setIsCategoryModalOpen(false);
    resetCategoryForm();
  }, [resetCategoryForm]);

  const addCategory = async (event) => {
    event.preventDefault();
    if (!guardAdminAccess()) return;

    const trimmedName = categoryFormData.name.trim();
    const trimmedDescription = categoryFormData.description.trim();
    const normalizedName = normalizeCategoryName(trimmedName);

    if (!trimmedName) {
      setCategoryFormError('Category name is required.');
      return;
    }

    if (categories.some((category) => normalizeCategoryName(category.name) === normalizedName)) {
      setCategoryFormError('Category already exists.');
      return;
    }

    setIsSavingCategory(true);
    setCategoryFormError('');

    try {
      const response = await axios.post('/api/categories', {
        name: trimmedName,
        description: trimmedDescription,
      });

      const createdCategory = {
        id: response?.data?.id,
        name: response?.data?.name || trimmedName,
        description: response?.data?.description || trimmedDescription,
      };

      setCategories((prevCategories) => {
        const nextCategories = mergeUniqueCategories(prevCategories, [createdCategory]);
        saveLocalCategories(nextCategories);
        return nextCategories;
      });

      setSelectedCategory(normalizedName);
      if (!formData.category_id) {
        setFormData((prev) => ({ ...prev, category_id: String(createdCategory.id || '') }));
      }
      closeCategoryModal();
    } catch (error) {
      console.error('Error creating category:', error);
      setCategoryFormError(error.response?.data?.message || 'Failed to add category.');
      setIsSavingCategory(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!guardAdminAccess() || !category?.id) return;

    const confirmed = window.confirm(`Delete category "${category.name}"? Products in this category will be uncategorized.`);
    if (!confirmed) return;

    try {
      await axios.delete(`/api/categories/${category.id}`);
      const normalizedName = normalizeCategoryName(category.name);

      setCategories((prevCategories) => {
        const nextCategories = prevCategories.filter((item) => normalizeCategoryName(item.name) !== normalizedName);
        saveLocalCategories(nextCategories);
        return nextCategories;
      });

      setProducts((prevProducts) => prevProducts.map((product) => (
        normalizeCategoryName(product.category_name) === normalizedName
          ? { ...product, category_id: null, category_name: '' }
          : product
      )));

      if (selectedCategory === normalizedName) {
        setSelectedCategory('all');
      }

      setFormData((prev) => (
        String(prev.category_id) === String(category.id)
          ? { ...prev, category_id: '' }
          : prev
      ));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.response?.data?.message || 'Failed to delete category.');
    }
  };

  const getCartQuantity = useCallback((productId, sourceCart) => {
    return sourceCart.reduce((total, item) => {
      if (item.id !== productId) return total;
      return total + (Number.parseInt(item.quantity || 0, 10) || 0);
    }, 0);
  }, []);

  const updateStock = useCallback((sourceCart) => {
    setProducts((prevProducts) => prevProducts.map((product) => {
      const baseStock = Number.parseInt(baseStockById[product.id] ?? product.stock_quantity ?? 0, 10) || 0;
      const reservedInCart = getCartQuantity(product.id, sourceCart);
      const nextStock = Math.max(baseStock - reservedInCart, 0);
      return {
        ...product,
        stock_quantity: nextStock
      };
    }));
  }, [baseStockById, getCartQuantity]);

  useEffect(() => {
    const savedImageCache = localStorage.getItem(PRODUCT_IMAGE_CACHE_KEY);
    if (savedImageCache) {
      try {
        const parsed = JSON.parse(savedImageCache);
        if (parsed && typeof parsed === 'object') {
          imageCacheRef.current = parsed;
        }
      } catch (error) {
        console.error('Failed to parse product image cache:', error);
      }
    }

    fetchCategories();

    fetchProducts();
    loadCart();
  }, [fetchProducts, fetchCategories, loadCart]);

  useEffect(() => {
    updateStock(cart);
  }, [cart, updateStock]);

  useEffect(() => {
    console.log(products);
  }, [products]);

  const availableCategories = useMemo(() => mergeUniqueCategories(
    categories,
    products.map((product) => ({
      id: product.category_id || `derived-${normalizeCategoryName(product.category_name)}`,
      name: product.category_name,
      description: ''
    }))
  ), [categories, mergeUniqueCategories, normalizeCategoryName, products]);

  useEffect(() => {
    saveLocalCategories(availableCategories);
  }, [availableCategories, saveLocalCategories]);

  useEffect(() => {
    if (selectedCategory === 'all') return;

    const categoryStillExists = availableCategories.some((category) => normalizeCategoryName(category.name) === selectedCategory);
    if (!categoryStillExists) {
      setSelectedCategory('all');
    }
  }, [availableCategories, normalizeCategoryName, selectedCategory]);

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
    return axios.post('/api/products', payload);
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
      category_id: '',
      image_url: ''
    });
    setSelectedImageFile(null);
    setImagePreview('');
    setSelectedFileName('');
    setLocalImageBase64('');
    setFormError('');
    setFormSuccess('');
    setImageObjectFit('cover');
    setImageDragActive(false);
    setIsAutoImageLoading(false);
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
      category_id: product.category_id ? String(product.category_id) : '',
      image_url: product.image_url || ''
    });
    setSelectedImageFile(null);
    const displayImg = product.localImageUrl || product.image_url || '';
    setImagePreview(displayImg);
    setLocalImageBase64('');
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
    
    // Convert file to Base64
    fileToBase64(file).then((base64) => {
      setLocalImageBase64(base64);
      setImagePreview(base64);
      setSelectedImageFile(file);
      setFormData((prev) => ({ ...prev, image_url: '' }));
      setSelectedFileName(file.name);
      setFormError('');
      setFormSuccess('Image ready! It will persist after page refresh.');
    }).catch((error) => {
      console.error('Error converting image to Base64:', error);
      setFormError('Failed to process image. Please try again.');
    });
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
    setLocalImageBase64('');
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
    const manualImageUrl = formData.image_url.trim();
    const hasExistingRemoteImage = Boolean(editProductId && imagePreview && !selectedImageFile && !localImageBase64);
    const hasLocalImage = Boolean(localImageBase64);

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

    setIsSubmitting(true);
    setIsAutoImageLoading(!selectedImageFile && !manualImageUrl && !hasExistingRemoteImage && !hasLocalImage);
    setFormError('');
    setFormSuccess('');

    try {
      const autoFetchedImageUrl = !selectedImageFile && !manualImageUrl && !hasExistingRemoteImage && !hasLocalImage
        ? await fetchProductImage(name)
        : '';

      const payload = {
        name,
        description,
        price,
        stock_quantity,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        image_url: localImageBase64 || manualImageUrl || autoFetchedImageUrl || undefined
      };
      const selectedCategoryDetails = getCategoryById(payload.category_id);
      const categoryName = selectedCategoryDetails?.name || '';

      if (editProductId) {
        const response = await axios.put(`/api/products/${editProductId}`, payload);
        const savedProduct = response?.data?.product || {};
        setBaseStockById((prev) => ({
          ...prev,
          [editProductId]: stock_quantity
        }));
        
        const updatedProduct = {
          id: editProductId,
          ...payload,
          category_name: savedProduct.category_name || categoryName,
          image_url: savedProduct.image_url || payload.image_url || DEFAULT_PRODUCT_PLACEHOLDER,
        };

        setProducts((prevProducts) => {
          const nextProducts = prevProducts.map((product) => (
            product.id === editProductId ? updatedProduct : product
          ));
          console.log(nextProducts);
          return nextProducts;
        });
        
        setFormSuccess('✓ Product updated successfully');
        closeProductModal();
      } else {
        const response = await addProduct(payload);
        const createdProduct = response?.data?.product || {};
        const newId = response?.data?.id || createdProduct.id || Date.now();
        const newProduct = {
          id: newId,
          ...payload,
          category_name: createdProduct.category_name || categoryName,
          image_url: createdProduct.image_url || payload.image_url || DEFAULT_PRODUCT_PLACEHOLDER,
        };

        setProducts((prevProducts) => {
          const nextProducts = [newProduct, ...prevProducts];
          console.log(nextProducts);
          return nextProducts;
        });
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
      setIsAutoImageLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!guardAdminAccess()) return;

    const confirmed = window.confirm('Are you sure you want to delete this product?');
    if (!confirmed) return;

    try {
      await axios.delete(`/api/products/${productId}`);
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

  const categoryCount = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const categoryName = normalizeCategoryName(p.category_name);
      if (categoryName) counts[categoryName] = (counts[categoryName] || 0) + 1;
    });
    return counts;
  }, [normalizeCategoryName, products]);

  const filteredProducts = filterByCategory(
    products.filter((product) => {
      if (!searchQuery) return true;
      const name = (product.name || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      return name.includes(searchQuery) || description.includes(searchQuery);
    }),
    selectedCategory
  );

  const selectedCategoryLabel = selectedCategory === 'all'
    ? 'All'
    : availableCategories.find((category) => normalizeCategoryName(category.name) === selectedCategory)?.name || 'Selected Category';

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
        <div className="px-4 py-6 sm:px-0 products-dashboard-layout">
          <aside className="category-sidebar">
            <div className="category-sidebar-header">
              <div>
                <p className="category-sidebar-eyebrow">Browse</p>
                <h2 className="category-sidebar-title">Categories</h2>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openCategoryModal}
                  className="category-sidebar-add-btn"
                >
                  + Add Category
                </button>
              )}
            </div>

            <div className="category-sidebar-list">
              <button
                type="button"
                className={`category-sidebar-item${selectedCategory === 'all' ? ' active' : ''}`}
                onClick={() => handleCategoryChange('all')}
              >
                <span className="category-sidebar-item-name">All</span>
                <span className="category-sidebar-count">{products.length}</span>
              </button>

              {availableCategories.map((category) => {
                const categoryKey = normalizeCategoryName(category.name);
                const isActive = selectedCategory === categoryKey;

                return (
                  <div key={category.id || categoryKey} className="category-sidebar-row">
                    <button
                      type="button"
                      className={`category-sidebar-item${isActive ? ' active' : ''}`}
                      onClick={() => handleCategoryChange(categoryKey)}
                    >
                      <span className="category-sidebar-item-name">{category.name}</span>
                      <span className="category-sidebar-count">{categoryCount[categoryKey] || 0}</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="category-sidebar-delete-btn"
                        onClick={() => deleteCategory(category)}
                        aria-label={`Delete ${category.name}`}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="products-content-panel">
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

            <div className="products-toolbar-summary">
              <div>
                <p className="products-toolbar-eyebrow">Active Filter</p>
                <h2 className="products-toolbar-title">{selectedCategoryLabel}</h2>
              </div>
              <p className="products-toolbar-meta">
                {selectedCategory === 'all'
                  ? `Showing all ${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''}`
                  : `${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} in ${selectedCategoryLabel}`}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
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
              <div key={product.id} className={`product-card-wrapper ${isAdmin ? 'admin-product-card' : 'product-card'}`}>
                <div className="product-card-image">
                  <img
                    src={getDisplayImage(product)}
                    alt={product.name}
                    className="w-full h-48 object-cover"
                    onError={(event) => {
                      event.currentTarget.src = DEFAULT_PRODUCT_PLACEHOLDER;
                    }}
                  />
                </div>
                <div className="product-card-content">
                  {product.category_name && (
                    <span className="category-badge">{product.category_name}</span>
                  )}
                  <h3 className="text-sm font-medium text-gray-900">{highlightMatch(product.name)}</h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{highlightMatch(product.description)}</p>
                  <div className="product-card-price-row">
                    <p className="text-lg font-semibold text-gray-900">{formatCurrency(product.price)}</p>
                    <p className="text-sm text-gray-500">Stock: {product.stock_quantity}</p>
                  </div>
                </div>
                <div className="product-card-actions">
                  <button
                    onClick={() => !isAdmin && addToCart(product)}
                    disabled={isAdmin || product.stock_quantity === 0}
                    className={`w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed ${isAdmin ? 'admin-shopping-disabled-btn' : ''}`}
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

                  <label className="product-form-label">
                    Category
                    <select
                      name="category_id"
                      value={formData.category_id}
                      onChange={handleFormChange}
                      className="product-form-input product-form-select"
                      required
                    >
                      <option value="">-- Select Category --</option>
                      {categories.length > 0
                        ? categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))
                        : [
                            { id: 'Electronics', name: 'Electronics' },
                            { id: 'Shoes', name: 'Shoes' },
                            { id: 'Outfit', name: 'Outfit' },
                            { id: 'Accessories', name: 'Accessories' },
                            { id: 'Home', name: 'Home' },
                            { id: 'Others', name: 'Others' },
                          ].map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))
                      }
                    </select>
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
                    <p className="product-form-help-text">Upload a local image preview, add an image URL, or leave blank for auto-fetch</p>
                    
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
                      JPG, JPEG, PNG only. Max 2MB. The image will be stored locally and persist after page refresh.
                    </p>

                    <div className="product-upload-url-section">
                      <label htmlFor="product-image-url" className="product-form-label">
                        Manual Image URL (optional)
                      </label>
                      <input
                        id="product-image-url"
                        type="url"
                        name="image_url"
                        value={formData.image_url}
                        onChange={handleFormChange}
                        placeholder="https://example.com/product-image.jpg"
                        className="product-form-input"
                      />
                    </div>

                    {isAutoImageLoading && (
                      <div className="products-loading-inline" role="status" aria-live="polite">
                        <div className="products-loading-spinner products-loading-spinner-sm" />
                        <span>Fetching product image automatically...</span>
                      </div>
                    )}

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
          </section>

          {isCategoryModalOpen && (
            <div className="product-modal-backdrop" role="dialog" aria-modal="true">
              <div className="product-modal-card category-modal-card">
                <div className="product-modal-header">
                  <h2>Add Category</h2>
                  <button
                    type="button"
                    className="product-modal-close"
                    onClick={closeCategoryModal}
                  >
                    ×
                  </button>
                </div>

                <form className="product-modal-form" onSubmit={addCategory}>
                  <label className="product-form-label">
                    Category Name
                    <input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(event) => setCategoryFormData((prev) => ({ ...prev, name: event.target.value }))}
                      className="product-form-input"
                      placeholder="e.g. Electronics"
                      required
                    />
                  </label>

                  <label className="product-form-label">
                    Description (optional)
                    <textarea
                      value={categoryFormData.description}
                      onChange={(event) => setCategoryFormData((prev) => ({ ...prev, description: event.target.value }))}
                      className="product-form-input product-form-textarea"
                      rows={3}
                      placeholder="Short category description"
                    />
                  </label>

                  {categoryFormError && (
                    <div className="product-form-error-box">
                      <p className="product-form-error">{categoryFormError}</p>
                    </div>
                  )}

                  <div className="product-modal-actions">
                    <button
                      type="button"
                      className="product-modal-cancel"
                      onClick={closeCategoryModal}
                      disabled={isSavingCategory}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="product-modal-submit"
                      disabled={isSavingCategory}
                    >
                      {isSavingCategory ? 'Saving Category...' : 'Save Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Products;
