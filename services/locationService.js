class LocationService {
  // Default restaurant location (you can change this to your actual restaurant location)
  static RESTAURANT_LOCATION = {
    latitude: 27.7172,   // Kathmandu coordinates (example)
    longitude: 85.3240,
    address: "Plateful Restaurant, Kathmandu, Nepal"
  };

  // Delivery zones and their pricing
  static DELIVERY_ZONES = {
    zone1: { maxDistance: 5, fee: 0, name: "Free Delivery Zone" },      // 0-5km
    zone2: { maxDistance: 10, fee: 30, name: "Standard Delivery" },     // 5-10km
    zone3: { maxDistance: 15, fee: 60, name: "Extended Delivery" },     // 10-15km
    zone4: { maxDistance: 25, fee: 100, name: "Premium Delivery" },     // 15-25km
  };

  // Maximum delivery distance (in km)
  static MAX_DELIVERY_DISTANCE = 25;

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param {Number} lat1 - Latitude of first point
   * @param {Number} lon1 - Longitude of first point
   * @param {Number} lat2 - Latitude of second point
   * @param {Number} lon2 - Longitude of second point
   * @returns {Number} Distance in kilometers
   */
  static calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    // Convert latitude and longitude from degrees to radians
    const toRadians = (degree) => degree * (Math.PI / 180);
    
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    
    // Haversine formula
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate delivery fee based on distance
   * @param {Number} distance - Distance in kilometers
   * @returns {Object} Delivery information
   */
  static calculateDeliveryFee(distance) {
    if (distance > this.MAX_DELIVERY_DISTANCE) {
      return {
        canDeliver: false,
        fee: 0,
        zone: null,
        message: `Delivery not available. Maximum delivery distance is ${this.MAX_DELIVERY_DISTANCE}km.`,
        distance: distance
      };
    }

    let selectedZone = null;
    let deliveryFee = 0;

    // Find the appropriate delivery zone
    for (const [zoneKey, zone] of Object.entries(this.DELIVERY_ZONES)) {
      if (distance <= zone.maxDistance) {
        selectedZone = zone;
        deliveryFee = zone.fee;
        break;
      }
    }

    // If no zone found, use the maximum zone
    if (!selectedZone) {
      const maxZone = Object.values(this.DELIVERY_ZONES).pop();
      selectedZone = maxZone;
      deliveryFee = maxZone.fee;
    }

    return {
      canDeliver: true,
      fee: deliveryFee,
      zone: selectedZone,
      message: `Delivery available via ${selectedZone.name}`,
      distance: distance,
      estimatedTime: this.calculateEstimatedDeliveryTime(distance)
    };
  }

  /**
   * Calculate estimated delivery time based on distance
   * @param {Number} distance - Distance in kilometers
   * @returns {Number} Estimated delivery time in minutes
   */
  static calculateEstimatedDeliveryTime(distance) {
    // Base preparation time
    const preparationTime = 20; // minutes
    
    // Delivery time calculation (assuming average speed of 30 km/h in city)
    const averageSpeed = 30; // km/h
    const deliveryTime = (distance / averageSpeed) * 60; // convert to minutes
    
    // Add buffer time for traffic and other delays
    const bufferTime = Math.min(distance * 2, 15); // 2 minutes per km, max 15 minutes
    
    return Math.ceil(preparationTime + deliveryTime + bufferTime);
  }

  /**
   * Get delivery information for a customer address
   * @param {Number} customerLat - Customer latitude
   * @param {Number} customerLon - Customer longitude
   * @param {Number} orderTotal - Order total amount
   * @returns {Object} Complete delivery information
   */
  static getDeliveryInfo(customerLat, customerLon, orderTotal = 0) {
    try {
      // Validate coordinates
      if (!this.isValidCoordinate(customerLat, customerLon)) {
        return {
          success: false,
          message: "Invalid coordinates provided"
        };
      }

      // Calculate distance from restaurant to customer
      const distance = this.calculateHaversineDistance(
        this.RESTAURANT_LOCATION.latitude,
        this.RESTAURANT_LOCATION.longitude,
        customerLat,
        customerLon
      );

      // Get delivery fee and zone information
      const deliveryInfo = this.calculateDeliveryFee(distance);

      // Apply free delivery for orders above certain amount
      const freeDeliveryThreshold = 500; // Rs. 500
      if (orderTotal >= freeDeliveryThreshold && deliveryInfo.canDeliver) {
        deliveryInfo.originalFee = deliveryInfo.fee;
        deliveryInfo.fee = 0;
        deliveryInfo.message += ` (Free delivery for orders ≥ Rs.${freeDeliveryThreshold})`;
      }

      return {
        success: true,
        restaurant: this.RESTAURANT_LOCATION,
        customer: {
          latitude: customerLat,
          longitude: customerLon
        },
        ...deliveryInfo
      };
    } catch (error) {
      console.error('Error calculating delivery info:', error);
      return {
        success: false,
        message: "Error calculating delivery information"
      };
    }
  }

  /**
   * Validate coordinates
   * @param {Number} lat - Latitude
   * @param {Number} lon - Longitude
   * @returns {Boolean} Whether coordinates are valid
   */
  static isValidCoordinate(lat, lon) {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      lat >= -90 && lat <= 90 &&
      lon >= -180 && lon <= 180 &&
      !isNaN(lat) && !isNaN(lon)
    );
  }

  /**
   * Get nearby delivery areas
   * @param {Number} radius - Search radius in kilometers
   * @returns {Array} Array of delivery zones within radius
   */
  static getNearbyDeliveryAreas(radius = 25) {
    const areas = [];
    
    for (const [zoneKey, zone] of Object.entries(this.DELIVERY_ZONES)) {
      if (zone.maxDistance <= radius) {
        areas.push({
          zone: zoneKey,
          name: zone.name,
          maxDistance: zone.maxDistance,
          fee: zone.fee,
          coverage: this.calculateZoneCoverage(zone.maxDistance)
        });
      }
    }
    
    return areas;
  }

  /**
   * Calculate zone coverage area
   * @param {Number} radius - Zone radius in kilometers
   * @returns {Number} Coverage area in square kilometers
   */
  static calculateZoneCoverage(radius) {
    return Math.round(Math.PI * radius * radius);
  }

  /**
   * Check if location is within delivery range
   * @param {Number} lat - Customer latitude
   * @param {Number} lon - Customer longitude
   * @returns {Boolean} Whether location is deliverable
   */
  static isLocationDeliverable(lat, lon) {
    if (!this.isValidCoordinate(lat, lon)) {
      return false;
    }

    const distance = this.calculateHaversineDistance(
      this.RESTAURANT_LOCATION.latitude,
      this.RESTAURANT_LOCATION.longitude,
      lat,
      lon
    );

    return distance <= this.MAX_DELIVERY_DISTANCE;
  }

  /**
   * Get all delivery zones information
   * @returns {Object} All delivery zones with their details
   */
  static getAllDeliveryZones() {
    return {
      restaurant: this.RESTAURANT_LOCATION,
      maxDeliveryDistance: this.MAX_DELIVERY_DISTANCE,
      zones: Object.keys(this.DELIVERY_ZONES).map(key => ({
        id: key,
        ...this.DELIVERY_ZONES[key],
        coverage: this.calculateZoneCoverage(this.DELIVERY_ZONES[key].maxDistance)
      }))
    };
  }

  /**
   * Geocode address to coordinates (placeholder - you would integrate with actual geocoding service)
   * @param {String} address - Address string
   * @returns {Object} Coordinates object
   */
  static async geocodeAddress(address) {
    // This is a placeholder. In real implementation, you would use:
    // - Google Maps Geocoding API
    // - OpenStreetMap Nominatim
    // - Mapbox Geocoding API
    
    // For demo purposes, returning some example coordinates
    const mockCoordinates = {
      "Kathmandu": { latitude: 27.7172, longitude: 85.3240 },
      "Lalitpur": { latitude: 27.6683, longitude: 85.3206 },
      "Bhaktapur": { latitude: 27.6710, longitude: 85.4298 },
      "Kirtipur": { latitude: 27.6789, longitude: 85.2774 }
    };

    const addressKey = Object.keys(mockCoordinates).find(key => 
      address.toLowerCase().includes(key.toLowerCase())
    );

    if (addressKey) {
      return {
        success: true,
        ...mockCoordinates[addressKey],
        address: address
      };
    }

    return {
      success: false,
      message: "Address not found in our service area"
    };
  }

  /**
   * Get optimal delivery route (placeholder for advanced routing)
   * @param {Array} deliveryPoints - Array of delivery coordinates
   * @returns {Object} Optimized route information
   */
  static getOptimalDeliveryRoute(deliveryPoints) {
    // This is a placeholder for advanced routing algorithms
    // In real implementation, you would use:
    // - Google Maps Directions API
    // - OpenRouteService
    // - Custom routing algorithms
    
    const totalDistance = deliveryPoints.reduce((sum, point, index) => {
      if (index === 0) return sum;
      
      const prevPoint = deliveryPoints[index - 1];
      return sum + this.calculateHaversineDistance(
        prevPoint.latitude,
        prevPoint.longitude,
        point.latitude,
        point.longitude
      );
    }, 0);

    return {
      success: true,
      totalDistance: totalDistance,
      estimatedTime: this.calculateEstimatedDeliveryTime(totalDistance),
      route: deliveryPoints,
      optimized: false // Set to true when actual optimization is implemented
    };
  }

  /**
   * Calculate delivery efficiency metrics
   * @param {Array} deliveries - Array of delivery information
   * @returns {Object} Efficiency metrics
   */
  static calculateDeliveryEfficiency(deliveries) {
    if (!deliveries || deliveries.length === 0) {
      return { efficiency: 0, avgDistance: 0, avgTime: 0 };
    }

    const totalDistance = deliveries.reduce((sum, delivery) => sum + delivery.distance, 0);
    const totalTime = deliveries.reduce((sum, delivery) => sum + delivery.estimatedTime, 0);
    
    const avgDistance = totalDistance / deliveries.length;
    const avgTime = totalTime / deliveries.length;
    
    // Efficiency score based on distance and time optimization
    const efficiency = Math.max(0, 100 - (avgDistance * 2) - (avgTime * 0.5));

    return {
      efficiency: Math.round(efficiency),
      avgDistance: Math.round(avgDistance * 100) / 100,
      avgTime: Math.round(avgTime),
      totalDeliveries: deliveries.length,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTime: Math.round(totalTime)
    };
  }
}

module.exports = LocationService;
