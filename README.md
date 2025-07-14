# Plateful Backend

A comprehensive backend API for the Plateful food ordering platform, built with Node.js, Express, and MongoDB.

## Features

- **User Authentication**: JWT-based authentication system
- **Order Management**: Complete order lifecycle from creation to delivery
- **Menu Management**: CRUD operations for menu items with categories
- **Admin Dashboard**: Analytics and management tools
- **Email Notifications**: Order confirmations and status updates
- **Referral System**: Customer referral program
- **Rate Limiting**: API protection against abuse
- **Data Validation**: Comprehensive input validation

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login

### Menu (`/api/menu`)
- `GET /` - Get all menu items
- `GET /:id` - Get menu item by ID
- `GET /category/:category` - Get items by category
- `GET /specials/today` - Get today's special items
- `POST /` - Create menu item (admin only)
- `PUT /:id` - Update menu item (admin only)
- `DELETE /:id` - Delete menu item (admin only)
- `PATCH /:id/availability` - Toggle item availability (admin only)

### Orders (`/api/orders`)
- `POST /` - Create new order
- `GET /:orderNumber` - Get order by order number
- `GET /customer/:customerId` - Get customer orders
- `PATCH /:orderNumber/status` - Update order status (admin only)
- `PATCH /:orderNumber/cancel` - Cancel order
- `GET /admin/today` - Get today's orders (admin only)

### Customers (`/api/customers`)
- `GET /profile` - Get customer profile
- `PUT /profile` - Update customer profile

### Admin (`/api/admin`)
- `GET /dashboard` - Dashboard statistics
- `GET /orders` - Get all orders with filtering
- `GET /customers` - Get all customers
- `GET /analytics/revenue` - Revenue analytics
- `PATCH /customers/:id/toggle-status` - Toggle customer status

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Update the `.env` file with your configurations:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/plateful
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   
   # Email configuration
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Rate limiting
   RATE_LIMIT_WINDOW=15
   RATE_LIMIT_MAX=100
   
   # CORS
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Run the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Database Setup

The application will automatically create the necessary collections when first run. You may want to create an admin user manually:

```javascript
// Connect to MongoDB and run this script
use plateful;

db.users.insertOne({
  firstName: "Admin",
  lastName: "User",
  email: "admin@plateful.com",
  phone: "1234567890",
  password: "$2a$12$encrypted_password_here", // Use bcrypt to hash
  role: "admin",
  address: {
    street: "123 Admin St",
    city: "Admin City",
    state: "Admin State",
    zipCode: "12345"
  },
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Sample Menu Items

You can populate the database with sample menu items using this script:

```javascript
// Sample menu items based on your website
const menuItems = [
  {
    name: "Thakali Set",
    description: "Traditional Thakali meal with dal, rice, vegetables, and pickles",
    price: 250,
    category: "veg",
    subCategory: "regular-lunch",
    image: "./image/thakali khana.webp",
    preparationTime: 25,
    rating: { average: 5, count: 45 },
    createdBy: ObjectId("admin_user_id")
  },
  {
    name: "Aloo Paratha",
    description: "Stuffed potato flatbread served with yogurt",
    price: 70,
    category: "veg",
    subCategory: "veg-snacks",
    image: "./image/aloo-paratha-on-transparent-background-png (1).webp",
    preparationTime: 15,
    rating: { average: 4, count: 32 },
    createdBy: ObjectId("admin_user_id")
  },
  {
    name: "Chicken Momo",
    description: "Steamed chicken dumplings with spicy sauce",
    price: 130,
    category: "non-veg",
    subCategory: "non-veg-snacks",
    image: "./image/chicken momo.jpg",
    preparationTime: 20,
    rating: { average: 5, count: 67 },
    createdBy: ObjectId("admin_user_id")
  },
  {
    name: "Chukauni",
    description: "Traditional Nepali fermented radish dish",
    price: 100,
    category: "veg",
    subCategory: "veg-snacks",
    image: "./image/chukani.jpg",
    preparationTime: 10,
    rating: { average: 4, count: 23 },
    createdBy: ObjectId("admin_user_id")
  }
];
```

## API Usage Examples

### Create Order
```javascript
POST /api/orders
{
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "address": "123 Main St, City"
  },
  "items": [
    {
      "menuItem": "menu_item_id",
      "quantity": 2,
      "specialInstructions": "Extra spicy"
    }
  ],
  "scheduledFor": {
    "date": "2024-01-15",
    "time": "18:30"
  },
  "specialInstructions": "Ring the doorbell twice",
  "referralCode": "FRIEND123"
}
```

### Get Menu Items
```javascript
GET /api/menu?category=veg&page=1&limit=10
```

### Update Order Status (Admin)
```javascript
PATCH /api/orders/PLT20240115ABC123/status
{
  "status": "preparing",
  "statusMessage": "Your order is being prepared with love"
}
```

## Testing

The API can be tested using tools like:
- Postman
- curl
- Your frontend application

## Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Input validation
- CORS configuration
- Helmet for security headers

## Support

For issues or questions, please check the logs and ensure all environment variables are properly configured.

## License

MIT License
