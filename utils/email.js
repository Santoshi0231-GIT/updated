const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send order confirmation email
const sendOrderConfirmationEmail = async (customerEmail, order) => {
  try {
    const transporter = createTransporter();

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #e67e22; font-size: 24px; font-weight: bold; }
          .order-details { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          .item { border-bottom: 1px solid #eee; padding: 10px 0; }
          .total { font-weight: bold; font-size: 18px; color: #e67e22; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PLATEFUL</div>
            <h2>Order Confirmation</h2>
          </div>
          
          <p>Dear ${order.customerInfo.firstName},</p>
          
          <p>Thank you for your order! We're excited to prepare your delicious home-style meal.</p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Scheduled for:</strong> ${new Date(order.scheduledFor.date).toDateString()} at ${order.scheduledFor.time}</p>
            <p><strong>Estimated Delivery:</strong> ${new Date(order.estimatedDeliveryTime).toLocaleString()}</p>
            
            <h4>Items Ordered:</h4>
            ${order.items.map(item => `
              <div class="item">
                <strong>${item.name}</strong> x ${item.quantity}<br>
                <span>₹${item.price} each - Subtotal: ₹${item.subtotal}</span>
                ${item.specialInstructions ? `<br><em>Special instructions: ${item.specialInstructions}</em>` : ''}
              </div>
            `).join('')}
            
            <div style="margin-top: 20px;">
              <p>Subtotal: ₹${order.pricing.subtotal}</p>
              <p>Tax: ₹${order.pricing.tax}</p>
              <p>Delivery Fee: ₹${order.pricing.deliveryFee}</p>
              ${order.pricing.discount > 0 ? `<p>Discount: -₹${order.pricing.discount}</p>` : ''}
              <p class="total">Total: ₹${order.pricing.total}</p>
            </div>
          </div>
          
          ${order.specialInstructions ? `
            <div class="order-details">
              <h4>Special Instructions:</h4>
              <p>${order.specialInstructions}</p>
            </div>
          ` : ''}
          
          <p>We'll send you updates about your order status. You can also track your order using the order number above.</p>
          
          <div class="footer">
            <p>Thank you for choosing Plateful!</p>
            <p>"A plateful of home in every bite."</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html: emailHTML,
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
};

// Send order status update email
const sendOrderStatusUpdateEmail = async (customerEmail, order, newStatus) => {
  try {
    const transporter = createTransporter();

    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      preparing: 'Your order is currently being prepared by our kitchen team.',
      ready: 'Your order is ready for pickup/delivery.',
      'out-for-delivery': 'Your order is out for delivery and will reach you soon.',
      delivered: 'Your order has been delivered. Enjoy your meal!',
      cancelled: 'Your order has been cancelled.',
    };

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #e67e22; font-size: 24px; font-weight: bold; }
          .status-update { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
          .status { color: #e67e22; font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">PLATEFUL</div>
            <h2>Order Status Update</h2>
          </div>
          
          <p>Dear ${order.customerInfo.firstName},</p>
          
          <div class="status-update">
            <p class="status">Order Status: ${newStatus.toUpperCase()}</p>
            <p>${statusMessages[newStatus]}</p>
          </div>
          
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          
          ${newStatus === 'delivered' ? `
            <p>We hope you enjoyed your meal! Please rate your experience and let us know how we did.</p>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for choosing Plateful!</p>
            <p>"A plateful of home in every bite."</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: `Order ${newStatus.replace('-', ' ')} - ${order.orderNumber}`,
      html: emailHTML,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order status update email sent successfully for ${newStatus}`);
  } catch (error) {
    console.error('Error sending order status update email:', error);
    throw error;
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusUpdateEmail,
};
