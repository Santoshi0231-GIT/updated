const express = require('express');
const router = express.Router();

// POST route to receive cart data
router.post('/', (req, res) => {
    const cartData = req.body;

    if (!cartData || !Array.isArray(cartData)) {
        return res.status(400).json({ success: false, message: 'Invalid cart data' });
    }

    console.log('Received Cart:', cartData);

    // Optional: Save to database here
    // For now, just send success response
    res.status(200).json({ success: true, message: 'Cart received successfully' });
});

module.exports = router;