const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
// Corrected path for cartRoutes
const cartRoutes = require('./backend/routes/cart');

require('dotenv').config();

const app = express();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('combined')); // Logging
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX), // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing middleware - Note: express.json() is already called above,
// but these specific limit settings are fine if you need them.
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from frontend directory
app.use(express.static('frontend'));

// Routes - ALL paths updated to include './backend/routes/'
app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/menu', require('./backend/routes/menu'));
app.use('/api/orders', require('./backend/routes/orders'));
app.use('/api/customers', require('./backend/routes/customers'));
app.use('/api/admin', require('./backend/routes/admin'));
app.use('/api/recommendations', require('./backend/routes/recommendations'));
app.use('/api/location', require('./backend/routes/location'));
// Removed esewa-payment-gateway route as requested
app.use('/api/cart', cartRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
};

startServer();

module.exports = app;
