// API route for recommendations
const express = require('express');
const router = express.Router();
const { getRecommendations } = require('../services/recommendationService');

// GET /api/recommendations/:userId
router.post('/:userId', async (req, res) => {
  const userId = req.params.userId;
  const sessionContext = req.body || {};
  try {
    console.log('Getting recommendations for user:', userId);
    const recommendations = await getRecommendations(userId, sessionContext);
    console.log('Found recommendations:', recommendations.length);
    
    // Format for frontend/chatbot
    const formatted = recommendations.map(product => ({
      id: product._id,
      name: product.name,
      price: product.price,
      category: product.category,
      image: product.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&h=150&fit=crop&crop=center',
      rating: product.rating?.average || 0,
      inStock: product.inStock,
      discount: product.discount || 0
    }));
    
    console.log('Formatted recommendations:', formatted.length);
    res.json({ recommendations: formatted });
  } catch (err) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to get recommendations', details: err.message });
  }
});

module.exports = router;
