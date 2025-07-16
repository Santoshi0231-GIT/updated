const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be a positive number'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['veg', 'non-veg', 'dessert', 'beverage'],
  },
  subCategory: {
    type: String,
    required: [true, 'Sub-category is required'],
    enum: ['veg-snacks', 'non-veg-snacks', 'regular-lunch', 'dessert', 'special'],
  },
  image: {
    type: String,
    required: [true, 'Image URL is required'],
  },
  ingredients: [{
    type: String,
    trim: true,
  }],
  nutritionInfo: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number,
  },
  allergens: [{
    type: String,
    enum: ['nuts', 'dairy', 'eggs', 'gluten', 'soy', 'shellfish'],
  }],
  isVegetarian: {
    type: Boolean,
    default: true,
  },
  isVegan: {
    type: Boolean,
    default: false,
  },
  isGlutenFree: {
    type: Boolean,
    default: false,
  },
  spiceLevel: {
    type: String,
    enum: ['mild', 'medium', 'hot', 'extra-hot'],
    default: 'mild',
  },
  preparationTime: {
    type: Number, // in minutes
    required: [true, 'Preparation time is required'],
    min: [1, 'Preparation time must be at least 1 minute'],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  dailySpecial: {
    isSpecial: {
      type: Boolean,
      default: false,
    },
    day: {
      type: String,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    },
    specialPrice: {
      type: Number,
      min: [0, 'Special price must be a positive number'],
    },
  },
  tags: [{
    type: String,
    trim: true,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
menuItemSchema.index({ category: 1, subCategory: 1 });
menuItemSchema.index({ isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

// Virtual for full name
menuItemSchema.virtual('fullName').get(function() {
  return `${this.name} - ${this.description}`;
});

// Method to check if item is available today
menuItemSchema.methods.isAvailableToday = function() {
  if (!this.isAvailable) return false;
  
  if (this.dailySpecial.isSpecial) {
    const today = new Date().toLocaleLowerCase();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return this.dailySpecial.day === days[new Date().getDay()];
  }
  
  return true;
};

// Method to get current price (considering daily special)
menuItemSchema.methods.getCurrentPrice = function() {
  if (this.dailySpecial.isSpecial && this.isAvailableToday()) {
    return this.dailySpecial.specialPrice || this.price;
  }
  return this.price;
};

module.exports = mongoose.model('MenuItem', menuItemSchema);
