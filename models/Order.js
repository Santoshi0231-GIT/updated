const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  customerInfo: {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    specialInstructions: {
      type: String,
      maxlength: 500,
    },
    subtotal: {
      type: Number,
      required: true,
    },
  }],
  orderType: {
    type: String,
    enum: ['delivery', 'pickup'],
    default: 'delivery',
  },
  scheduledFor: {
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
  },
  specialInstructions: {
    type: String,
    maxlength: 1000,
  },
  referralCode: {
    type: String,
  },
  pricing: {
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out-for-delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'wallet'],
    default: 'cash',
  },
  estimatedDeliveryTime: {
    type: Date,
  },
  actualDeliveryTime: {
    type: Date,
  },
  trackingInfo: {
    orderPlaced: {
      timestamp: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        default: 'Order placed successfully',
      },
    },
    confirmed: {
      timestamp: Date,
      status: String,
    },
    preparing: {
      timestamp: Date,
      status: String,
    },
    ready: {
      timestamp: Date,
      status: String,
    },
    outForDelivery: {
      timestamp: Date,
      status: String,
    },
    delivered: {
      timestamp: Date,
      status: String,
    },
  },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    landmark: String,
    deliveryInstructions: String,
    coordinates: {
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
    },
  },
  deliveryInfo: {
    distance: {
      type: Number,
      min: 0,
    },
    zone: String,
    canDeliver: {
      type: Boolean,
      default: true,
    },
    originalDeliveryFee: Number,
    deliveryDiscount: {
      type: Number,
      default: 0,
    },
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
    },
    feedback: String,
    ratedAt: Date,
  },
  cancelReason: {
    type: String,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ scheduledFor: 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.orderNumber = `PLT${dateStr}${randomStr}`;
  }
  next();
});

// Method to calculate estimated delivery time
orderSchema.methods.calculateEstimatedDeliveryTime = function() {
  const now = new Date();
  const scheduledDateTime = new Date(this.scheduledFor.date);
  const [hours, minutes] = this.scheduledFor.time.split(':');
  scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));
  
  // If scheduled for future, use that time
  if (scheduledDateTime > now) {
    this.estimatedDeliveryTime = scheduledDateTime;
  } else {
    // Add preparation time + delivery time (assuming 30 minutes total)
    this.estimatedDeliveryTime = new Date(now.getTime() + 30 * 60000);
  }
  
  return this.estimatedDeliveryTime;
};

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, statusMessage) {
  this.status = newStatus;
  const timestamp = new Date();
  
  const statusKey = newStatus.replace('-', '').replace('-', '');
  if (this.trackingInfo[statusKey]) {
    this.trackingInfo[statusKey].timestamp = timestamp;
    this.trackingInfo[statusKey].status = statusMessage || `Order ${newStatus}`;
  }
  
  // Set delivery time if delivered
  if (newStatus === 'delivered') {
    this.actualDeliveryTime = timestamp;
  }
  
  return this.save();
};

// Method to check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  const cancellableStatuses = ['pending', 'confirmed'];
  return cancellableStatuses.includes(this.status);
};

// Static method to get today's orders
orderSchema.statics.getTodaysOrders = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return this.find({
    createdAt: {
      $gte: today,
      $lt: tomorrow,
    },
  }).populate('customer', 'firstName lastName email phone')
    .populate('items.menuItem', 'name category');
};

module.exports = mongoose.model('Order', orderSchema);
