# Advanced Features: Content-Based Filtering & Location Services

This document outlines the advanced features implemented in the Plateful backend system.

## 🤖 Content-Based Filtering System

### Overview
The content-based filtering system analyzes user preferences and behavior to provide personalized food recommendations. It uses sophisticated algorithms to match users with food items based on their order history, preferences, and contextual factors.

### Key Features

#### 1. **Personalized Recommendations**
- Analyzes user order history (last 50 orders)
- Considers multiple factors: categories, sub-categories, price range, spice levels, ingredients, ratings
- Weighted scoring algorithm with configurable weights
- Filters out previously ordered items to ensure variety

#### 2. **Similarity-Based Recommendations**
- Finds similar items based on content features
- Uses multi-dimensional similarity scoring
- Considers price range, category, ingredients, and ratings

#### 3. **Time-Based Recommendations**
- Recommends items based on current time of day
- Morning: Breakfast items, light snacks
- Afternoon: Lunch items, regular meals
- Evening: Dinner items, hearty meals
- Night: Light snacks, desserts

#### 4. **Context-Aware Filtering**
- Considers user's preferred order times
- Accounts for seasonal preferences
- Adapts to user's dietary restrictions and allergens

### API Endpoints

#### Get Personalized Recommendations
```
GET /api/recommendations/personalized
Authorization: Bearer <token>
Query Parameters:
- limit: Number of recommendations (default: 10)
```

#### Get Similar Items
```
GET /api/recommendations/similar/:itemId
Query Parameters:
- limit: Number of similar items (default: 5)
```

#### Get Time-Based Recommendations
```
GET /api/recommendations/time-based
Query Parameters:
- timeSlot: morning|afternoon|evening|night
- limit: Number of recommendations (default: 10)
```

#### Get Mixed Recommendations
```
GET /api/recommendations/mixed
Authorization: Bearer <token>
Query Parameters:
- limit: Total number of recommendations (default: 20)
```

### Algorithm Details

#### User Preference Extraction
```javascript
preferences = {
  categories: { veg: 15, non-veg: 5 },
  subCategories: { 'veg-snacks': 10, 'regular-lunch': 8 },
  priceRange: { min: 50, max: 300 },
  spiceLevel: { medium: 12, hot: 3 },
  avgRating: 4.2,
  frequentIngredients: { rice: 8, chicken: 5 },
  timePreferences: { evening: 12, afternoon: 6 }
}
```

#### Similarity Scoring
```javascript
Score = (
  categoryScore * 0.25 +
  subCategoryScore * 0.20 +
  priceScore * 0.15 +
  spiceScore * 0.10 +
  ratingScore * 0.15 +
  ingredientScore * 0.10 +
  allergenScore * 0.05
) / totalWeight
```

---

## 📍 Location Services with Haversine Algorithm

### Overview
The location service provides accurate distance calculations and delivery zone management using the Haversine formula. It enables dynamic delivery fee calculation, delivery area validation, and route optimization.

### Key Features

#### 1. **Haversine Distance Calculation**
- Calculates great-circle distances between two points on Earth
- Accounts for Earth's curvature for accurate results
- Precision up to 2 decimal places

#### 2. **Dynamic Delivery Zones**
- **Zone 1**: 0-5km (Free delivery)
- **Zone 2**: 5-10km (₹30 delivery fee)
- **Zone 3**: 10-15km (₹60 delivery fee)
- **Zone 4**: 15-25km (₹100 delivery fee)
- Maximum delivery distance: 25km

#### 3. **Smart Delivery Fee Calculation**
- Distance-based pricing
- Free delivery for orders above ₹500
- Automatic zone detection
- Delivery time estimation

#### 4. **Address Geocoding**
- Converts addresses to coordinates
- Supports major cities (expandable)
- Validates delivery areas

### API Endpoints

#### Get Delivery Information
```
POST /api/location/delivery-info
Body: {
  "latitude": 27.7172,
  "longitude": 85.3240,
  "orderTotal": 600
}
```

#### Check Delivery Availability
```
POST /api/location/check-deliverable
Body: {
  "latitude": 27.7172,
  "longitude": 85.3240
}
```

#### Get Delivery Zones
```
GET /api/location/delivery-zones
```

#### Calculate Distance
```
POST /api/location/calculate-distance
Body: {
  "from": { "latitude": 27.7172, "longitude": 85.3240 },
  "to": { "latitude": 27.6683, "longitude": 85.3206 }
}
```

#### Geocode Address
```
POST /api/location/geocode
Body: {
  "address": "Kathmandu, Nepal"
}
```

### Haversine Formula Implementation

```javascript
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

### Delivery Time Estimation

```javascript
estimatedTime = preparationTime + deliveryTime + bufferTime
where:
- preparationTime = 20 minutes (base)
- deliveryTime = (distance / 30 km/h) * 60 minutes
- bufferTime = min(distance * 2, 15) minutes
```

---

## 🔄 Integration with Order System

### Order Creation Enhancement
- Automatic delivery fee calculation based on customer location
- Real-time delivery area validation
- Enhanced order tracking with location data

### Location-Aware Features
- Store customer coordinates in user profiles
- Validate delivery areas before order placement
- Calculate accurate delivery times
- Optimize delivery routes for multiple orders

---

## 🛠️ Configuration

### Restaurant Location Setup
```javascript
// In locationService.js
static RESTAURANT_LOCATION = {
  latitude: 27.7172,   // Your restaurant's latitude
  longitude: 85.3240,  // Your restaurant's longitude
  address: "Your Restaurant Address"
};
```

### Delivery Zone Customization
```javascript
static DELIVERY_ZONES = {
  zone1: { maxDistance: 5, fee: 0, name: "Free Delivery Zone" },
  zone2: { maxDistance: 10, fee: 30, name: "Standard Delivery" },
  zone3: { maxDistance: 15, fee: 60, name: "Extended Delivery" },
  zone4: { maxDistance: 25, fee: 100, name: "Premium Delivery" }
};
```

---

## 📊 Performance Optimization

### Recommendation System
- **Caching**: User preferences cached for 1 hour
- **Lazy Loading**: Recommendations computed on-demand
- **Batch Processing**: Multiple recommendations in single query
- **Indexing**: Optimized database queries with proper indexing

### Location Services
- **Coordinate Validation**: Input validation to prevent errors
- **Distance Caching**: Frequent routes cached for faster response
- **Batch Geocoding**: Multiple addresses processed together
- **Geographic Indexing**: Spatial indexes for location queries

---

## 🔧 Testing Examples

### Test Personalized Recommendations
```bash
curl -X GET "http://localhost:5000/api/recommendations/personalized?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Delivery Information
```bash
curl -X POST "http://localhost:5000/api/location/delivery-info" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 27.7172,
    "longitude": 85.3240,
    "orderTotal": 600
  }'
```

### Test Similar Items
```bash
curl -X GET "http://localhost:5000/api/recommendations/similar/MENU_ITEM_ID?limit=3"
```

---

## 🚀 Future Enhancements

### Recommendation System
- **Machine Learning**: Implement collaborative filtering
- **A/B Testing**: Test different recommendation algorithms
- **Real-time Updates**: Update preferences in real-time
- **Cross-selling**: Recommend complementary items

### Location Services
- **Route Optimization**: Implement traveling salesman algorithm
- **Real-time Tracking**: GPS tracking for delivery personnel
- **Geofencing**: Automatic zone detection
- **Traffic Integration**: Real-time traffic data for delivery estimates

---

## 📈 Analytics and Monitoring

### Recommendation Metrics
- Click-through rates on recommendations
- Conversion rates from recommendations to orders
- User engagement with different recommendation types
- A/B test results for algorithm improvements

### Delivery Metrics
- Average delivery times by zone
- Delivery success rates
- Route optimization effectiveness
- Customer satisfaction by delivery zone

---

This implementation provides a solid foundation for both content-based filtering and location-based services, with room for future enhancements and optimizations.
