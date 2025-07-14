const express = require('express');
const { body, validationResult } = require('express-validator');
const LocationService = require('../services/locationService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get delivery information for coordinates
router.post('/delivery-info', [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('orderTotal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Order total must be a positive number'),
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

    const { latitude, longitude, orderTotal = 0 } = req.body;

    const deliveryInfo = LocationService.getDeliveryInfo(
      latitude, 
      longitude, 
      orderTotal
    );

    if (!deliveryInfo.success) {
      return res.status(400).json({
        success: false,
        message: deliveryInfo.message,
      });
    }

    res.json({
      success: true,
      data: deliveryInfo,
    });
  } catch (error) {
    console.error('Error calculating delivery info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate delivery information',
      error: error.message,
    });
  }
});

// Check if location is deliverable
router.post('/check-deliverable', [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
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

    const { latitude, longitude } = req.body;

    const isDeliverable = LocationService.isLocationDeliverable(latitude, longitude);
    
    if (isDeliverable) {
      const distance = LocationService.calculateHaversineDistance(
        LocationService.RESTAURANT_LOCATION.latitude,
        LocationService.RESTAURANT_LOCATION.longitude,
        latitude,
        longitude
      );

      res.json({
        success: true,
        data: {
          deliverable: true,
          distance: distance,
          message: 'Location is within delivery range',
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          deliverable: false,
          message: 'Location is outside delivery range',
          maxDistance: LocationService.MAX_DELIVERY_DISTANCE,
        },
      });
    }
  } catch (error) {
    console.error('Error checking deliverable location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check location deliverability',
      error: error.message,
    });
  }
});

// Get all delivery zones
router.get('/delivery-zones', async (req, res) => {
  try {
    const deliveryZones = LocationService.getAllDeliveryZones();
    
    res.json({
      success: true,
      data: deliveryZones,
    });
  } catch (error) {
    console.error('Error fetching delivery zones:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery zones',
      error: error.message,
    });
  }
});

// Get nearby delivery areas
router.get('/nearby-areas', async (req, res) => {
  try {
    const { radius = 25 } = req.query;
    
    const nearbyAreas = LocationService.getNearbyDeliveryAreas(parseInt(radius));
    
    res.json({
      success: true,
      data: {
        areas: nearbyAreas,
        searchRadius: parseInt(radius),
        restaurant: LocationService.RESTAURANT_LOCATION,
      },
    });
  } catch (error) {
    console.error('Error fetching nearby areas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby areas',
      error: error.message,
    });
  }
});

// Calculate distance between two points
router.post('/calculate-distance', [
  body('from.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('From latitude must be between -90 and 90'),
  body('from.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('From longitude must be between -180 and 180'),
  body('to.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('To latitude must be between -90 and 90'),
  body('to.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('To longitude must be between -180 and 180'),
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

    const { from, to } = req.body;

    const distance = LocationService.calculateHaversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude
    );

    const estimatedTime = LocationService.calculateEstimatedDeliveryTime(distance);

    res.json({
      success: true,
      data: {
        distance: distance,
        estimatedTime: estimatedTime,
        from: from,
        to: to,
      },
    });
  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate distance',
      error: error.message,
    });
  }
});

// Geocode address to coordinates
router.post('/geocode', [
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
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

    const { address } = req.body;

    const geocodeResult = await LocationService.geocodeAddress(address);

    if (!geocodeResult.success) {
      return res.status(404).json({
        success: false,
        message: geocodeResult.message,
      });
    }

    // Also check if the geocoded location is deliverable
    const deliveryInfo = LocationService.getDeliveryInfo(
      geocodeResult.latitude,
      geocodeResult.longitude
    );

    res.json({
      success: true,
      data: {
        ...geocodeResult,
        deliveryInfo: deliveryInfo,
      },
    });
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to geocode address',
      error: error.message,
    });
  }
});

// Get optimal delivery route for multiple points
router.post('/optimize-route', [
  body('deliveryPoints')
    .isArray({ min: 2 })
    .withMessage('At least 2 delivery points are required'),
  body('deliveryPoints.*.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Each point must have valid latitude'),
  body('deliveryPoints.*.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Each point must have valid longitude'),
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

    const { deliveryPoints } = req.body;

    // Add restaurant as starting point
    const routePoints = [
      LocationService.RESTAURANT_LOCATION,
      ...deliveryPoints
    ];

    const optimizedRoute = LocationService.getOptimalDeliveryRoute(routePoints);

    res.json({
      success: true,
      data: optimizedRoute,
    });
  } catch (error) {
    console.error('Error optimizing delivery route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize delivery route',
      error: error.message,
    });
  }
});

// Calculate delivery efficiency metrics
router.post('/efficiency-metrics', [
  body('deliveries')
    .isArray({ min: 1 })
    .withMessage('At least 1 delivery is required'),
  body('deliveries.*.distance')
    .isFloat({ min: 0 })
    .withMessage('Each delivery must have valid distance'),
  body('deliveries.*.estimatedTime')
    .isFloat({ min: 0 })
    .withMessage('Each delivery must have valid estimated time'),
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

    const { deliveries } = req.body;

    const efficiencyMetrics = LocationService.calculateDeliveryEfficiency(deliveries);

    res.json({
      success: true,
      data: efficiencyMetrics,
    });
  } catch (error) {
    console.error('Error calculating efficiency metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate efficiency metrics',
      error: error.message,
    });
  }
});

// Update user location (authenticated users only)
router.put('/update-location', authenticateToken, [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('address')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Address must be between 5 and 200 characters'),
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

    const { latitude, longitude, address } = req.body;
    const userId = req.user._id;

    // Check if location is deliverable
    const isDeliverable = LocationService.isLocationDeliverable(latitude, longitude);
    
    if (!isDeliverable) {
      return res.status(400).json({
        success: false,
        message: 'Location is outside our delivery range',
        maxDistance: LocationService.MAX_DELIVERY_DISTANCE,
      });
    }

    // Update user location in database
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, {
      location: {
        latitude,
        longitude,
        address: address || '',
        isVerified: true,
      },
    });

    // Get delivery info for the new location
    const deliveryInfo = LocationService.getDeliveryInfo(latitude, longitude);

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: {
        location: {
          latitude,
          longitude,
          address: address || '',
          isVerified: true,
        },
        deliveryInfo,
      },
    });
  } catch (error) {
    console.error('Error updating user location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message,
    });
  }
});

module.exports = router;
