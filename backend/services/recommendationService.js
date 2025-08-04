// Multi-layered personalized recommendation service for Meesho
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// Helper: Get user's purchased products
async function getUserPurchases(userId) {
  const orders = await Order.find({ userId });
  return orders.flatMap(order => order.items.map(item => item.productId));
}

// Helper: Get user's viewed products (implement if you log views)
async function getUserViews(userId) {
  // Example: return array of productIds
  return [];
}

// Helper: Get user's average order value
async function getUserAvgOrderValue(userId) {
  const orders = await Order.find({ userId });
  if (!orders.length) return null;
  const total = orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0);
  return total / orders.length;
}

// Helper: Get popular products
async function getPopularProducts(limit = 10) {
  return await Product.find({ inStock: true }).sort({ 'rating.count': -1, 'rating.average': -1 }).limit(limit);
}

// Main recommendation function
async function getRecommendations(userId, sessionContext = {}) {
  try {
    console.log('Getting recommendations for userId:', userId);
    
    // 1. Behavior-based (views/purchases)
    const purchased = await getUserPurchases(userId);
    console.log('User purchases:', purchased.length);
    
    const viewed = await getUserViews(userId);
    const behaviorIds = [...new Set([...purchased, ...viewed])];
    let behaviorProducts = await Product.find({ _id: { $in: behaviorIds } });
    console.log('Behavior products:', behaviorProducts.length);

    // 2. Category-based (searches/cart)
    const preferredCategories = sessionContext.categories || [];
    let categoryProducts = [];
    if (preferredCategories.length) {
      categoryProducts = await Product.find({ 
        category: { $in: preferredCategories }, 
        inStock: true 
      }).sort({ 'rating.count': -1 }).limit(10);
    }
    console.log('Category products:', categoryProducts.length);

    // 3. Price-based (order value)
    const avgOrderValue = await getUserAvgOrderValue(userId);
    console.log('Average order value:', avgOrderValue);
  let priceProducts = [];
  if (avgOrderValue) {
    priceProducts = await Product.find({ 
      price: { $gte: avgOrderValue * 0.7, $lte: avgOrderValue * 1.3 },
      inStock: true 
    }).limit(10);
  }

  // 4. Popularity fallback
  const popularProducts = await getPopularProducts(10);

  // If no specific data, get some general recommendations
  if (behaviorProducts.length === 0 && categoryProducts.length === 0 && priceProducts.length === 0) {
    // Get recent popular products across all categories
    const fallbackProducts = await Product.find({ inStock: true })
      .sort({ createdAt: -1, 'rating.average': -1 })
      .limit(10);
    return fallbackProducts;
  }

  // Weighted scoring
  const scores = {};
  const addScore = (products, weight) => {
    products.forEach(p => {
      const id = p._id.toString();
      scores[id] = (scores[id] || 0) + weight;
    });
  };
  addScore(behaviorProducts, 0.5);
  addScore(categoryProducts, 0.25);
  addScore(priceProducts, 0.15);
  addScore(popularProducts, 0.1);

  // Deduplicate and filter
  const exclude = new Set(purchased); // Don't recommend already purchased
  let allProductIds = Object.keys(scores).filter(id => !exclude.has(id));

  // Sort by score
  allProductIds.sort((a, b) => scores[b] - scores[a]);

  // Fetch product details
  const recommended = await Product.find({ _id: { $in: allProductIds.slice(0, 10) } });
  console.log('Final recommendations:', recommended.length);

  return recommended;
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    // Return popular products as fallback
    const fallbackProducts = await Product.find({ inStock: true })
      .sort({ 'rating.average': -1 })
      .limit(10);
    return fallbackProducts;
  }
}

module.exports = { getRecommendations };
