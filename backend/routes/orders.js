const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const User = require('../models/User');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../../utils/email');
const LocationService = require('../services/locationService');

const router = express.Router();

// Validation middleware for order creation
const validateOrder = [
  body('customerInfo.firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ max: 50 })
    .withMessage('First name must be less than 50 characters'),
  
  body('customerInfo.lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .isLength({ max: 50 })
    .withMessage('Last name must be less than 50 characters'),
  
  body('customerInfo.email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('customerInfo.phone')
    .matches(/^[0-9]{10}$/)
    .withMessage('Please provide a valid 10-digit phone number'),
  
  body('customerInfo.address')
    .notEmpty()
    .withMessage('Address is required')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must be less than 200 characters'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item must be ordered'),
  
  body('items.*.menuItem')
    .isMongoId()
    .withMessage('Invalid menu item ID'),
  
  body('items.*.quantity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Quantity must be between 1 and 20'),
  
  body('scheduledFor.date')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      const schedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (schedDate < today) {
        throw new Error('Scheduled date cannot be in the past');
      }
      
      // Allow scheduling up to 7 days in advance
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 7);
      
      if (schedDate > maxDate) {
        throw new Error('Cannot schedule more than 7 days in advance');
      }
      
      return true;
    }),
  
  body('scheduledFor.time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Please provide a valid time in HH:MM format'),
  
  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Special instructions must be less than 1000 characters'),
  
  body('referralCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Referral code must be less than 20 characters'),
];

// Create new order
router.post('/', validateOrder, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { customerInfo, items, scheduledFor, specialInstructions, referralCode } = req.body;

    // Find or create customer
    let customer = await User.findOne({ email: customerInfo.email });
    if (!customer) {
      // Create new customer
      customer = new User({
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone,
        password: Math.random().toString(36).substring(2, 15), // Temporary password
        address: {
          street: customerInfo.address,
          city: 'Default City',
          state: 'Default State',
          zipCode: '00000',
        },
      });
      await customer.save();
    }

    // Validate and calculate order items
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item not found: ${item.menuItem}`,
        });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `Menu item is not available: ${menuItem.name}`,
        });
      }

      const currentPrice = menuItem.getCurrentPrice();
      const itemSubtotal = currentPrice * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        menuItem: menuItem._id,
        name: menuItem.name,
        price: currentPrice,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions,
        subtotal: itemSubtotal,
      });
    }

    // Get location-based delivery information
    let deliveryInfo = null;
    let deliveryFee = 50; // Default delivery fee
    let deliveryDistance = 0;
    
    // Try to get coordinates from customer address if provided
    if (customerInfo.coordinates) {
      const { latitude, longitude } = customerInfo.coordinates;
      deliveryInfo = LocationService.getDeliveryInfo(latitude, longitude, subtotal);
      
      if (deliveryInfo.success && deliveryInfo.canDeliver) {
        deliveryFee = deliveryInfo.fee;
        deliveryDistance = deliveryInfo.distance;
      } else if (deliveryInfo.success && !deliveryInfo.canDeliver) {
        return res.status(400).json({
          success: false,
          message: deliveryInfo.message,
          data: { distance: deliveryInfo.distance, maxDistance: LocationService.MAX_DELIVERY_DISTANCE }
        });
      }
    } else {
      // Try to geocode the address
      const geocodeResult = await LocationService.geocodeAddress(customerInfo.address);
      if (geocodeResult.success) {
        deliveryInfo = LocationService.getDeliveryInfo(geocodeResult.latitude, geocodeResult.longitude, subtotal);
        if (deliveryInfo.success && deliveryInfo.canDeliver) {
          deliveryFee = deliveryInfo.fee;
          deliveryDistance = deliveryInfo.distance;
        }
      }
    }
    
    // Calculate pricing
    const tax = subtotal * 0.1; // 10% tax
    let discount = 0;

    // Apply referral discount if valid
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        discount = subtotal * 0.05; // 5% discount for referral
      }
    }

    const total = subtotal + tax + deliveryFee - discount;

    // Create order
    const order = new Order({
      customer: customer._id,
      customerInfo: {
        firstName: customerInfo.firstName,
        lastName: customerInfo.lastName,
        email: customerInfo.email,
        phone: customerInfo.phone,
        address: customerInfo.address,
      },
      items: orderItems,
      scheduledFor: {
        date: new Date(scheduledFor.date),
        time: scheduledFor.time,
      },
      specialInstructions,
      referralCode,
      pricing: {
        subtotal,
        tax,
        deliveryFee,
        discount,
        total,
      },
    });

    // Calculate estimated delivery time
    order.calculateEstimatedDeliveryTime();

    await order.save();

    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(customer.email, order);
    } catch (emailError) {
      console.error('Failed to send order confirmation email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderNumber: order.orderNumber,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        total: order.pricing.total,
        status: order.status,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
});

// Get order by order number
router.get('/:orderNumber', async (req, res) => {
  try {
    const order = await Order.findOne({ orderNumber: req.params.orderNumber })
      .populate('items.menuItem', 'name category image')
      .populate('customer', 'firstName lastName email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message,
    });
  }
});

// Get customer orders (requires authentication)
router.get('/customer/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { customer: customerId };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.menuItem', 'name category image')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: {
        orders,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
      },
    });
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message,
    });
  }
});

// Update order status (admin only)
router.patch('/:orderNumber/status', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { status, statusMessage } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    await order.updateStatus(status, statusMessage);

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        trackingInfo: order.trackingInfo,
      },
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message,
    });
  }
});

// Cancel order
router.patch('/:orderNumber/cancel', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ orderNumber });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (!order.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be cancelled at this stage',
      });
    }

    order.status = 'cancelled';
    order.cancelReason = reason || 'Cancelled by customer';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        cancelReason: order.cancelReason,
      },
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message,
    });
  }
});

// Get today's orders (admin only)
router.get('/admin/today', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const orders = await Order.getTodaysOrders();
    
    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Error fetching today\'s orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s orders',
      error: error.message,
    });
  }
});

module.exports = router;
