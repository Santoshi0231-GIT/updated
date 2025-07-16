const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');

class RecommendationService {
  /**
   * Get personalized food recommendations using content-based filtering
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recommendations to return
   * @returns {Array} Array of recommended menu items
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      // Get user's order history
      const userOrders = await Order.find({ customer: userId })
        .populate('items.menuItem')
        .sort({ createdAt: -1 })
        .limit(50); // Consider last 50 orders

      if (!userOrders.length) {
        // If no order history, return popular items
        return await this.getPopularItems(limit);
      }

      // Extract user preferences from order history
      const userPreferences = this.extractUserPreferences(userOrders);
      
      // Get all available menu items
      const allMenuItems = await MenuItem.find({ isAvailable: true });
      
      // Calculate similarity scores for each item
      const scoredItems = allMenuItems.map(item => ({
        item,
        score: this.calculateContentSimilarity(userPreferences, item)
      }));

      // Sort by similarity score and filter out already ordered items
      const orderedItemIds = new Set(
        userOrders.flatMap(order => 
          order.items.map(item => item.menuItem._id.toString())
        )
      );

      const recommendations = scoredItems
        .filter(({ item }) => !orderedItemIds.has(item._id.toString()))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ item, score }) => ({
          ...item.toObject(),
          recommendationScore: score
        }));

      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return await this.getPopularItems(limit);
    }
  }

  /**
   * Extract user preferences from order history
   * @param {Array} orders - User's order history
   * @returns {Object} User preferences object
   */
  static extractUserPreferences(orders) {
    const preferences = {
      categories: {},
      subCategories: {},
      priceRange: { min: Infinity, max: 0 },
      spiceLevels: {},
      cuisineTypes: {},
      allergens: new Set(),
      avgRating: 0,
      totalOrders: 0,
      timePreferences: {},
      frequentIngredients: {}
    };

    let totalRating = 0;
    let ratingCount = 0;

    orders.forEach(order => {
      preferences.totalOrders++;
      
      // Extract time preferences
      const orderHour = new Date(order.createdAt).getHours();
      const timeSlot = this.getTimeSlot(orderHour);
      preferences.timePreferences[timeSlot] = 
        (preferences.timePreferences[timeSlot] || 0) + 1;

      order.items.forEach(item => {
        if (!item.menuItem) return;

        const menuItem = item.menuItem;
        
        // Category preferences
        preferences.categories[menuItem.category] = 
          (preferences.categories[menuItem.category] || 0) + item.quantity;
        
        // Sub-category preferences
        preferences.subCategories[menuItem.subCategory] = 
          (preferences.subCategories[menuItem.subCategory] || 0) + item.quantity;
        
        // Price range
        preferences.priceRange.min = Math.min(preferences.priceRange.min, menuItem.price);
        preferences.priceRange.max = Math.max(preferences.priceRange.max, menuItem.price);
        
        // Spice level preferences
        if (menuItem.spiceLevel) {
          preferences.spiceLevels[menuItem.spiceLevel] = 
            (preferences.spiceLevels[menuItem.spiceLevel] || 0) + item.quantity;
        }
        
        // Ingredient preferences
        if (menuItem.ingredients) {
          menuItem.ingredients.forEach(ingredient => {
            preferences.frequentIngredients[ingredient] = 
              (preferences.frequentIngredients[ingredient] || 0) + item.quantity;
          });
        }
        
        // Allergen tracking
        if (menuItem.allergens) {
          menuItem.allergens.forEach(allergen => {
            preferences.allergens.add(allergen);
          });
        }
        
        // Rating preferences
        if (menuItem.rating && menuItem.rating.average > 0) {
          totalRating += menuItem.rating.average;
          ratingCount++;
        }
      });
    });

    // Calculate average rating preference
    preferences.avgRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    // Normalize price range
    if (preferences.priceRange.min === Infinity) {
      preferences.priceRange = { min: 0, max: 1000 };
    }

    return preferences;
  }

  /**
   * Calculate content-based similarity between user preferences and menu item
   * @param {Object} preferences - User preferences
   * @param {Object} item - Menu item
   * @returns {Number} Similarity score (0-1)
   */
  static calculateContentSimilarity(preferences, item) {
    let score = 0;
    let weightSum = 0;

    // Category similarity (weight: 0.25)
    const categoryWeight = 0.25;
    const categoryScore = preferences.categories[item.category] || 0;
    score += categoryScore * categoryWeight;
    weightSum += categoryWeight;

    // Sub-category similarity (weight: 0.20)
    const subCategoryWeight = 0.20;
    const subCategoryScore = preferences.subCategories[item.subCategory] || 0;
    score += subCategoryScore * subCategoryWeight;
    weightSum += subCategoryWeight;

    // Price range similarity (weight: 0.15)
    const priceWeight = 0.15;
    const priceScore = this.calculatePriceSimilarity(preferences.priceRange, item.price);
    score += priceScore * priceWeight;
    weightSum += priceWeight;

    // Spice level similarity (weight: 0.10)
    const spiceWeight = 0.10;
    const spiceScore = preferences.spiceLevels[item.spiceLevel] || 0;
    score += spiceScore * spiceWeight;
    weightSum += spiceWeight;

    // Rating similarity (weight: 0.15)
    const ratingWeight = 0.15;
    const ratingScore = this.calculateRatingSimilarity(preferences.avgRating, item.rating.average);
    score += ratingScore * ratingWeight;
    weightSum += ratingWeight;

    // Ingredient similarity (weight: 0.10)
    const ingredientWeight = 0.10;
    const ingredientScore = this.calculateIngredientSimilarity(
      preferences.frequentIngredients, 
      item.ingredients
    );
    score += ingredientScore * ingredientWeight;
    weightSum += ingredientWeight;

    // Allergen penalty (weight: 0.05)
    const allergenWeight = 0.05;
    const allergenScore = this.calculateAllergenScore(preferences.allergens, item.allergens);
    score += allergenScore * allergenWeight;
    weightSum += allergenWeight;

    // Normalize score
    return weightSum > 0 ? score / weightSum : 0;
  }

  /**
   * Calculate price similarity score
   */
  static calculatePriceSimilarity(priceRange, itemPrice) {
    const midPoint = (priceRange.min + priceRange.max) / 2;
    const range = priceRange.max - priceRange.min;
    
    if (range === 0) return 1;
    
    const distance = Math.abs(itemPrice - midPoint);
    return Math.max(0, 1 - (distance / range));
  }

  /**
   * Calculate rating similarity score
   */
  static calculateRatingSimilarity(preferredRating, itemRating) {
    if (preferredRating === 0 || itemRating === 0) return 0.5;
    
    const difference = Math.abs(preferredRating - itemRating);
    return Math.max(0, 1 - (difference / 5));
  }

  /**
   * Calculate ingredient similarity score
   */
  static calculateIngredientSimilarity(preferredIngredients, itemIngredients) {
    if (!itemIngredients || itemIngredients.length === 0) return 0;
    
    let matchScore = 0;
    itemIngredients.forEach(ingredient => {
      matchScore += preferredIngredients[ingredient] || 0;
    });
    
    return matchScore / itemIngredients.length;
  }

  /**
   * Calculate allergen score (penalty for allergens user is sensitive to)
   */
  static calculateAllergenScore(userAllergens, itemAllergens) {
    if (!itemAllergens || itemAllergens.length === 0) return 1;
    
    const hasUserAllergens = itemAllergens.some(allergen => 
      userAllergens.has(allergen)
    );
    
    return hasUserAllergens ? 0 : 1;
  }

  /**
   * Get time slot from hour
   */
  static getTimeSlot(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Get similar items based on content features
   * @param {String} itemId - Menu item ID
   * @param {Number} limit - Number of similar items to return
   * @returns {Array} Array of similar menu items
   */
  static async getSimilarItems(itemId, limit = 5) {
    try {
      const targetItem = await MenuItem.findById(itemId);
      if (!targetItem) return [];

      const allItems = await MenuItem.find({
        _id: { $ne: itemId },
        isAvailable: true
      });

      // Create artificial preferences based on target item
      const targetPreferences = {
        categories: { [targetItem.category]: 10 },
        subCategories: { [targetItem.subCategory]: 10 },
        priceRange: { min: targetItem.price * 0.8, max: targetItem.price * 1.2 },
        spiceLevels: { [targetItem.spiceLevel]: 10 },
        avgRating: targetItem.rating.average,
        frequentIngredients: {},
        allergens: new Set(targetItem.allergens || [])
      };

      // Weight ingredients
      if (targetItem.ingredients) {
        targetItem.ingredients.forEach(ingredient => {
          targetPreferences.frequentIngredients[ingredient] = 5;
        });
      }

      // Calculate similarity scores
      const scoredItems = allItems.map(item => ({
        item,
        score: this.calculateContentSimilarity(targetPreferences, item)
      }));

      return scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ item, score }) => ({
          ...item.toObject(),
          similarityScore: score
        }));
    } catch (error) {
      console.error('Error finding similar items:', error);
      return [];
    }
  }

  /**
   * Get popular items as fallback
   */
  static async getPopularItems(limit = 10) {
    try {
      return await MenuItem.find({ isAvailable: true })
        .sort({ 'rating.average': -1, 'rating.count': -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching popular items:', error);
      return [];
    }
  }

  /**
   * Get category-based recommendations
   */
  static async getCategoryRecommendations(category, limit = 10) {
    try {
      return await MenuItem.find({ 
        category, 
        isAvailable: true 
      })
      .sort({ 'rating.average': -1, 'rating.count': -1 })
      .limit(limit);
    } catch (error) {
      console.error('Error fetching category recommendations:', error);
      return [];
    }
  }

  /**
   * Get time-based recommendations
   */
  static async getTimeBasedRecommendations(timeSlot, limit = 10) {
    try {
      const timePreferences = {
        morning: ['veg-snacks', 'dessert'],
        afternoon: ['regular-lunch', 'veg-snacks'],
        evening: ['regular-lunch', 'non-veg-snacks'],
        night: ['dessert', 'veg-snacks']
      };

      const preferredSubCategories = timePreferences[timeSlot] || [];
      
      return await MenuItem.find({
        subCategory: { $in: preferredSubCategories },
        isAvailable: true
      })
      .sort({ 'rating.average': -1 })
      .limit(limit);
    } catch (error) {
      console.error('Error fetching time-based recommendations:', error);
      return [];
    }
  }
}

module.exports = RecommendationService;
