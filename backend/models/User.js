const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password in queries by default
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
    },
  },
  role: {
    type: String,
    enum: ['customer', 'admin'],
    default: 'customer',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
    },
    address: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  preferences: {
    favoriteCategories: [{
      type: String,
      enum: ['veg', 'non-veg', 'dessert', 'beverage'],
    }],
    spiceLevel: {
      type: String,
      enum: ['mild', 'medium', 'hot', 'extra-hot'],
      default: 'medium',
    },
    allergens: [{
      type: String,
      enum: ['nuts', 'dairy', 'eggs', 'gluten', 'soy', 'shellfish'],
    }],
    dietaryRestrictions: [{
      type: String,
      enum: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
    }],
    preferredOrderTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night'],
    },
    maxDeliveryDistance: {
      type: Number,
      default: 25,
      min: 1,
      max: 50,
    },
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate referral code
userSchema.methods.generateReferralCode = function() {
  const code = this.firstName.substring(0, 3).toUpperCase() + 
               Math.random().toString(36).substring(2, 8).toUpperCase();
  this.referralCode = code;
  return code;
};

module.exports = mongoose.model('User', userSchema);
