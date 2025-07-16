const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  items: [
    {
      id: Number,
      name: String,
      price: Number,
      qty: Number
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Cart', cartSchema);
