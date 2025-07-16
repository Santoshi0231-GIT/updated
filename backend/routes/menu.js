const express = require('express');
const { body, validationResult } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

const router = express.Router();

// Get all menu items (public)
router.get('/', async (req, res) => {
  try {
    const { category, subCategory, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = { isAvailable: true };
    
    if (category) {
      query.category = category;
    }
    
    if (subCategory) {
      query.subCategory = subCategory;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    const menuItems = await MenuItem.find(query)
      .select('-createdBy -updatedAt -__v')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MenuItem.countDocuments(query);

    res.json({
      success: true,
      data: {
        items: menuItems,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items',
      error: error.message,
    });
  }
});

// Get menu item by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .select('-createdBy -updatedAt -__v');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    res.json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu item',
      error: error.message,
    });
  }
});

// Get menu items by category (public)
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { subCategory, page = 1, limit = 20 } = req.query;

    const query = {
      category,
      isAvailable: true,
    };

    if (subCategory) {
      query.subCategory = subCategory;
    }

    const menuItems = await MenuItem.find(query)
      .select('-createdBy -updatedAt -__v')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MenuItem.countDocuments(query);

    res.json({
      success: true,
      data: {
        items: menuItems,
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error('Error fetching menu items by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch menu items',
      error: error.message,
    });
  }
});

// Get daily specials (public)
router.get('/specials/today', async (req, res) => {
  try {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = days[new Date().getDay()];

    const specials = await MenuItem.find({
      'dailySpecial.isSpecial': true,
      'dailySpecial.day': today,
      isAvailable: true,
    }).select('-createdBy -updatedAt -__v');

    res.json({
      success: true,
      data: {
        day: today,
        specials,
      },
    });
  } catch (error) {
    console.error('Error fetching daily specials:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily specials',
      error: error.message,
    });
  }
});

// Create new menu item (admin only)
router.post('/', authenticateToken, authorizeRole('admin'), [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  
  body('category')
    .isIn(['veg', 'non-veg', 'dessert', 'beverage'])
    .withMessage('Invalid category'),
  
  body('subCategory')
    .isIn(['veg-snacks', 'non-veg-snacks', 'regular-lunch', 'dessert', 'special'])
    .withMessage('Invalid sub-category'),
  
  body('image')
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Please provide a valid image URL'),
  
  body('preparationTime')
    .isInt({ min: 1 })
    .withMessage('Preparation time must be at least 1 minute'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const menuItem = new MenuItem({
      ...req.body,
      createdBy: req.user._id,
    });

    await menuItem.save();

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem,
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create menu item',
      error: error.message,
    });
  }
});

// Update menu item (admin only)
router.put('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem,
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item',
      error: error.message,
    });
  }
});

// Delete menu item (admin only)
router.delete('/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    res.json({
      success: true,
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item',
      error: error.message,
    });
  }
});

// Toggle menu item availability (admin only)
router.patch('/:id/availability', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { isAvailable } = req.body;
    
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { isAvailable: Boolean(isAvailable) },
      { new: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found',
      });
    }

    res.json({
      success: true,
      message: `Menu item ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: {
        id: menuItem._id,
        name: menuItem.name,
        isAvailable: menuItem.isAvailable,
      },
    });
  } catch (error) {
    console.error('Error updating menu item availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item availability',
      error: error.message,
    });
  }
});

module.exports = router;
