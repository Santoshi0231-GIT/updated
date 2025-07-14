// esewa-payment-gateway.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

// eSewa configuration
const ESEWA_CONFIG = {
  merchant_id: process.env.ESEWA_MERCHANT_ID || 'EPAYTEST',
  secret_key: process.env.ESEWA_SECRET_KEY || 'your-secret-key',
  base_url: process.env.ESEWA_BASE_URL || 'https://uat.esewa.com.np/epay/main',
  verify_url: process.env.ESEWA_VERIFY_URL || 'https://uat.esewa.com.np/epay/transrec'
};

// Route to initiate payment
router.post('/pay', async (req, res) => {
  const { amount, productId, successUrl, failureUrl, customerInfo } = req.body;

  try {
    // Generate unique product ID if not provided
    const pid = productId || `PLT${Date.now()}`;
    
    // Create payment form data
    const paymentData = {
      amt: amount,
      psc: 0,
      pdc: 0,
      txAmt: 0,
      tAmt: amount,
      pid: pid,
      scd: ESEWA_CONFIG.merchant_id,
      su: successUrl || `${req.protocol}://${req.get('host')}/api/esewa/success`,
      fu: failureUrl || `${req.protocol}://${req.get('host')}/api/esewa/failure`
    };

    // Generate payment form HTML
    const paymentForm = generatePaymentForm(paymentData);
    
    res.json({
      success: true,
      message: 'Payment form generated successfully',
      paymentForm: paymentForm,
      transactionId: pid
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Payment initiation failed', 
      error: error.message 
    });
  }
});

// Route to handle payment success callback
router.get('/success', async (req, res) => {
  const { oid, amt, refId } = req.query;
  
  try {
    // Verify payment with eSewa
    const verification = await verifyPayment(oid, amt, refId);
    
    if (verification.success) {
      res.json({
        success: true,
        message: 'Payment successful',
        transactionId: oid,
        amount: amt,
        referenceId: refId
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Payment verification error',
      error: error.message
    });
  }
});

// Route to handle payment failure callback
router.get('/failure', (req, res) => {
  const { pid } = req.query;
  
  res.json({
    success: false,
    message: 'Payment failed or was cancelled',
    transactionId: pid
  });
});

// Route to verify payment status
router.post('/verify', async (req, res) => {
  const { transactionId, amount, referenceId } = req.body;
  
  try {
    const verification = await verifyPayment(transactionId, amount, referenceId);
    res.json(verification);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
});

// Helper function to generate payment form
function generatePaymentForm(data) {
  return `
    <form action="${ESEWA_CONFIG.base_url}" method="POST" id="esewa-payment-form">
      <input type="hidden" name="tAmt" value="${data.tAmt}">
      <input type="hidden" name="amt" value="${data.amt}">
      <input type="hidden" name="txAmt" value="${data.txAmt}">
      <input type="hidden" name="psc" value="${data.psc}">
      <input type="hidden" name="pdc" value="${data.pdc}">
      <input type="hidden" name="scd" value="${data.scd}">
      <input type="hidden" name="pid" value="${data.pid}">
      <input type="hidden" name="su" value="${data.su}">
      <input type="hidden" name="fu" value="${data.fu}">
      <button type="submit" class="esewa-btn">Pay with eSewa</button>
    </form>
    <script>
      document.getElementById('esewa-payment-form').submit();
    </script>
  `;
}

// Helper function to verify payment
async function verifyPayment(oid, amt, refId) {
  try {
    const response = await axios.post(ESEWA_CONFIG.verify_url, {
      amt: amt,
      scd: ESEWA_CONFIG.merchant_id,
      rid: refId,
      pid: oid
    });
    
    // Check if payment verification was successful
    if (response.data && response.data.includes('Success')) {
      return {
        success: true,
        message: 'Payment verified successfully',
        data: response.data
      };
    } else {
      return {
        success: false,
        message: 'Payment verification failed',
        data: response.data
      };
    }
  } catch (error) {
    throw new Error(`Payment verification failed: ${error.message}`);
  }
}

// Route to get payment status
router.get('/status/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  
  try {
    // In a real application, you would check your database for the transaction status
    // For now, we'll return a mock status
    res.json({
      success: true,
      transactionId: transactionId,
      status: 'pending', // pending, success, failed
      message: 'Transaction status retrieved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get transaction status',
      error: error.message
    });
  }
});

module.exports = router;
