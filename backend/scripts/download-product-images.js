require('dotenv').config();
const db = require('../config/database');

const DEFAULT_PRODUCT_PLACEHOLDER = 'https://via.placeholder.com/300';
const UNSPLASH_DYNAMIC_BASE = 'https://source.unsplash.com/300x300/?';

const shouldUpdateDb = !process.argv.includes('--no-db-update');

const parseLimitArg = () => {
  const cliLimitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  if (!cliLimitArg) {
    return Number.parseInt(process.env.IMAGE_ASSIGN_LIMIT || '50', 10);
  }

  const rawValue = cliLimitArg.split('=')[1];
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? 50 : parsed;
};

const assignmentLimit = Math.max(parseLimitArg(), 1);

const normalizeName = (value) => String(value || '').trim();

const isPlaceholder = (value) => String(value || '').trim() === DEFAULT_PRODUCT_PLACEHOLDER;

const shouldAssignImage = (imageUrl) => {
  const value = String(imageUrl || '').trim();
  if (!value) return true;
  if (isPlaceholder(value)) return true;
  if (value.startsWith('/images/')) return false;
  if (value.startsWith(UNSPLASH_DYNAMIC_BASE)) return false;
  return false;
};

const buildDynamicUnsplashUrl = (productName) => {
  const cleanedName = normalizeName(productName);
  if (!cleanedName) return DEFAULT_PRODUCT_PLACEHOLDER;

  return `${UNSPLASH_DYNAMIC_BASE}${encodeURIComponent(cleanedName)}`;
};

const getProductsToAssign = async () => {
  const [rows] = await db.promise().query(
    'SELECT id, name, image_url FROM products ORDER BY id ASC LIMIT ?',
    [assignmentLimit]
  );

  return rows;
};

const updateProductImage = async (productId, imageUrl) => {
  await db.promise().query(
    'UPDATE products SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [imageUrl, productId]
  );
};

const run = async () => {
  const products = await getProductsToAssign();

  if (!products.length) {
    console.log('No products found. Nothing to update.');
    return;
  }

  let assignedCount = 0;
  let skippedCount = 0;

  for (const product of products) {
    const currentImageUrl = String(product.image_url || '').trim();

    if (!shouldAssignImage(currentImageUrl)) {
      skippedCount += 1;
      continue;
    }

    const nextImageUrl = buildDynamicUnsplashUrl(product.name);

    if (shouldUpdateDb) {
      await updateProductImage(product.id, nextImageUrl);
    }

    assignedCount += 1;
    console.log(`Assigned: ${product.name || `Product-${product.id}`} -> ${nextImageUrl}`);
  }

  console.log('--- Product image assignment complete ---');
  console.log(`Products scanned: ${products.length}`);
  console.log(`Assigned: ${assignedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`DB updates: ${shouldUpdateDb ? 'enabled' : 'disabled'}`);
  console.log(`Limit: ${assignmentLimit}`);
};

run()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    db.end();
  });
