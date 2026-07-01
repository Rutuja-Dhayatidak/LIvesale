const crypto = require('crypto');
const { getRazorpay } = require('../utils/razorpay');
const HealthStoreOrder = require('../models/HealthStoreOrder');
const HealthStoreProduct = require('../models/HealthStoreProduct');
const HealthStore = require('../models/HealthStore');
const generateOrderNumber = require('../utils/generateOrderNumber');

// ─── CREATE RAZORPAY ORDER ───────────────────────────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { items, storeId, address, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required' });
    }

    // Validate store
    const store = await HealthStore.findOne({ _id: storeId, status: 'Active' });
    if (!store) return res.status(404).json({ success: false, message: 'Health Store not found or not active' });

    // Fetch product prices from DB (never trust frontend)
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await HealthStoreProduct.findOne({
        _id: item.productId,
        healthStore: storeId,
        isLive: true,
        isActive: true,
      });

      if (!product) {
        return res.status(400).json({ success: false, message: `Product ${item.productId} not available` });
      }

      // Check stock for supplements
      let price = item.purchaseType === 'Monthly' ? product.monthlyPrice : (product.sellingPrice || product.oneTimePrice);
      let variantSku = '';

      if (product.productType === 'Supplement') {
        if (product.variants && product.variants.length > 0 && item.flavor && item.size) {
          const variant = product.variants.find(v => v.flavor === item.flavor && v.size === item.size);
          if (!variant) {
            return res.status(400).json({ success: false, message: `Variant (Flavor: ${item.flavor}, Size: ${item.size}) not found for ${product.name}` });
          }
          if (variant.stock < item.quantity) {
            return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name} (${item.flavor} - ${item.size})` });
          }
          price = variant.sellingPrice;
          variantSku = variant.sku;
        } else {
          if (product.stock < item.quantity) {
            return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
          }
        }
      }

      subtotal += price * item.quantity;

      orderItems.push({
        product: product._id,
        productType: product.productType,
        name: product.name,
        image: product.images?.[0] || '',
        quantity: item.quantity,
        purchaseType: item.purchaseType || 'One Time',
        price,
        flavor: item.flavor || '',
        size: item.size || '',
        sku: variantSku || '',
      });
    }

    const deliveryCharge = subtotal >= 999 ? 0 : 49;
    const total = subtotal + deliveryCharge;

    // Create Razorpay order
    const razorpay = getRazorpay();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    });

    // Save pending order in DB
    const addressObj = typeof address === 'string'
      ? {
          address,
          fullName: req.user?.fullName || req.user?.name || '',
          mobile: req.user?.phone || req.user?.mobile || '',
          email: req.user?.email || '',
        }
      : address;

    const order = await HealthStoreOrder.create({
      orderNumber: generateOrderNumber(),
      customer: req.user._id,
      healthStore: storeId,
      city: store.city,
      items: orderItems,
      subtotal,
      deliveryCharge,
      total,
      address: addressObj,
      paymentStatus: 'Pending',
      orderStatus: 'Pending',
      razorpayOrderId: razorpayOrder.id,
      notes: notes || '',
    });

    res.json({
      success: true,
      data: {
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order._id,
        storeName: store.storeName,
      },
    });
  } catch (err) {
    console.error('Create Razorpay Order Error:', err);
    res.status(500).json({ success: false, message: 'Payment initiation failed', error: err.message });
  }
};

// ─── VERIFY PAYMENT ───────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Invalid signature.' });
    }

    // Update order
    const order = await HealthStoreOrder.findOne({ _id: orderId, customer: req.user._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.paymentStatus = 'Paid';
    order.orderStatus = 'Confirmed';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.invoiceNumber = `INV-${Date.now()}`;
    await order.save();

    // Reduce stock for supplement items
    for (const item of order.items) {
      if (item.productType === 'Supplement') {
        const product = await HealthStoreProduct.findById(item.product);
        if (product) {
          if (product.variants && product.variants.length > 0 && item.flavor && item.size) {
            const vIndex = product.variants.findIndex(v => v.flavor === item.flavor && v.size === item.size);
            if (vIndex !== -1) {
              product.variants[vIndex].stock = Math.max(0, product.variants[vIndex].stock - item.quantity);
              if (vIndex === 0) {
                product.stock = product.variants[0].stock;
              }
              product.markModified('variants');
            }
          } else {
            product.stock = Math.max(0, product.stock - item.quantity);
          }
          await product.save();
        }
      }
    }

    res.json({
      success: true,
      message: 'Payment verified. Order confirmed!',
      data: { orderId: order._id, orderNumber: order.orderNumber, invoiceNumber: order.invoiceNumber },
    });
  } catch (err) {
    console.error('Verify Payment Error:', err);
    res.status(500).json({ success: false, message: 'Payment verification failed', error: err.message });
  }
};

// ─── GET USER ORDERS ─────────────────────────────────────────────────────────
exports.getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      HealthStoreOrder.find({ customer: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('healthStore', 'storeName city logo'),
      HealthStoreOrder.countDocuments({ customer: req.user._id }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
