const express = require('express');
const RecommendationService = require('../services/recommendationService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get personalized recommendations for authenticated user
router.get('/personalized', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10 } = req.query;
    
    const recommendations = await RecommendationService.getPersonalizedRecommendations(
      userId, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        recommendations,
        type: 'personalized',
        userId: userId,
        count: recommendations.length
      }
    });
  } catch (error) {
    console.error('Error fetching personalized recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch personalized recommendations',
      error: error.message
    });
  }
});

// Get similar items based on a specific item
router.get('/similar/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { limit = 5 } = req.query;
    
    const similarItems = await RecommendationService.getSimilarItems(
      itemId, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        similarItems,
        type: 'similar',
        baseItemId: itemId,
        count: similarItems.length
      }
    });
  } catch (error) {
    console.error('Error fetching similar items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch similar items',
      error: error.message
    });
  }
});

// Get category-based recommendations
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    const recommendations = await RecommendationService.getCategoryRecommendations(
      category, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        recommendations,
        type: 'category',
        category: category,
        count: recommendations.length
      }
    });
  } catch (error) {
    console.error('Error fetching category recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category recommendations',
      error: error.message
    });
  }
});

// Get time-based recommendations
router.get('/time-based', async (req, res) => {
  try {
    const { timeSlot, limit = 10 } = req.query;
    
    // If no time slot provided, determine from current time
    const currentTimeSlot = timeSlot || getCurrentTimeSlot();
    
    const recommendations = await RecommendationService.getTimeBasedRecommendations(
      currentTimeSlot, 
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: {
        recommendations,
        type: 'time-based',
        timeSlot: currentTimeSlot,
        count: recommendations.length
      }
    });
  } catch (error) {
    console.error('Error fetching time-based recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time-based recommendations',
      error: error.message
    });
  }
});

// Get popular items (fallback recommendations)
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popularItems = await RecommendationService.getPopularItems(parseInt(limit));
    
    res.json({
      success: true,
      data: {
        recommendations: popularItems,
        type: 'popular',
        count: popularItems.length
      }
    });
  } catch (error) {
    console.error('Error fetching popular items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular items',
      error: error.message
    });
  }
});

// Get mixed recommendations (combination of different types)
router.get('/mixed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;
    
    const mixedRecommendations = [];
    
    // Get personalized recommendations (40% of total)
    const personalizedCount = Math.floor(limit * 0.4);
    const personalizedRecs = await RecommendationService.getPersonalizedRecommendations(
      userId, 
      personalizedCount
    );
    
    mixedRecommendations.push({
      type: 'personalized',
      items: personalizedRecs.slice(0, personalizedCount),
      title: 'Recommended for You'
    });
    
    // Get time-based recommendations (30% of total)
    const timeBasedCount = Math.floor(limit * 0.3);
    const currentTimeSlot = getCurrentTimeSlot();
    const timeBasedRecs = await RecommendationService.getTimeBasedRecommendations(
      currentTimeSlot, 
      timeBasedCount
    );
    
    mixedRecommendations.push({
      type: 'time-based',
      items: timeBasedRecs.slice(0, timeBasedCount),
      title: `Perfect for ${currentTimeSlot.charAt(0).toUpperCase() + currentTimeSlot.slice(1)}`
    });
    
    // Get popular items (30% of total)
    const popularCount = Math.floor(limit * 0.3);
    const popularRecs = await RecommendationService.getPopularItems(popularCount);
    
    mixedRecommendations.push({
      type: 'popular',
      items: popularRecs.slice(0, popularCount),
      title: 'Popular Items'
    });
    
    res.json({
      success: true,
      data: {
        recommendations: mixedRecommendations,
        type: 'mixed',
        userId: userId,
        totalCount: mixedRecommendations.reduce((sum, section) => sum + section.items.length, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching mixed recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mixed recommendations',
      error: error.message
    });
  }
});

// Get recommendations for guest users (non-authenticated)
router.get('/guest', async (req, res) => {
  try {
    const { limit = 15 } = req.query;
    
    const guestRecommendations = [];
    
    // Get popular items (50% of total)
    const popularCount = Math.floor(limit * 0.5);
    const popularRecs = await RecommendationService.getPopularItems(popularCount);
    
    guestRecommendations.push({
      type: 'popular',
      items: popularRecs,
      title: 'Popular Items'
    });
    
    // Get time-based recommendations (50% of total)
    const timeBasedCount = Math.floor(limit * 0.5);
    const currentTimeSlot = getCurrentTimeSlot();
    const timeBasedRecs = await RecommendationService.getTimeBasedRecommendations(
      currentTimeSlot, 
      timeBasedCount
    );
    
    guestRecommendations.push({
      type: 'time-based',
      items: timeBasedRecs,
      title: `Perfect for ${currentTimeSlot.charAt(0).toUpperCase() + currentTimeSlot.slice(1)}`
    });
    
    res.json({
      success: true,
      data: {
        recommendations: guestRecommendations,
        type: 'guest',
        totalCount: guestRecommendations.reduce((sum, section) => sum + section.items.length, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching guest recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch guest recommendations',
      error: error.message
    });
  }
});

// Helper function to get current time slot
function getCurrentTimeSlot() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

module.exports = router;
