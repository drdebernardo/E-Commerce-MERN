import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe';
import razorpay from 'razorpay';

// Global Variables
const currency = 'usd'
const deliveryCharge = 10;

// Gateway Initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Placing orders using COD method
const placeOrder = async (req, res) => {
    try {
        console.log('placeOrder called, token header:', req.headers.token);
        console.log('placeOrder body:', req.body);
        const { userId, items, amount, address } = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "COD",
            payment: false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        await userModel.findByIdAndUpdate(userId, {cartData: {}});

        res.json({success: true, message: "Order Placed"});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// Placing orders using Stripe
const placeOrderStripe = async (req, res) => {
    try {
        const { userId, items, amount, address } = req.body;
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now()
        }

        // Expire unpaid Stripe-created orders after 24 hours
        orderData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        const newOrder = new orderModel(orderData);
        await newOrder.save();

        const line_items = items.map((item) => ({
            price_data: {
                currency: currency,
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }));

        line_items.push({
            price_data: {
                currency: currency,
                product_data: {
                    name: 'Delivery Charges'
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        });

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
            locale: 'en',
            metadata: { orderId: newOrder._id.toString() }
        });

        res.json({success: true, session_url: session.url});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// Verify Stripe 
const verifyStripe = async (req, res) => {
    const { orderId, success, userId } = req.body;
    try {
        if (success === "true") {
            // Mark as paid and remove expiry so it won't be auto-deleted
            await orderModel.findByIdAndUpdate(orderId, { payment: true, $unset: { expiresAt: "" } });
            await userModel.findByIdAndUpdate(userId, {cartData: {}});
            res.json({success: true});
        } else {
            await orderModel.findByIdAndDelete(orderId);
            res.json({success: false});
        }
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
} 

// Stripe webhook handler — expects raw body (use express.raw middleware on the route)
const verifyWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            // In development without a webhook secret, parse the raw body (not recommended for production)
            try {
                event = JSON.parse(req.body.toString());
                console.warn('Processing webhook without signature verification (STRIPE_WEBHOOK_SECRET not set)');
            } catch (err) {
                console.log('Failed to parse webhook event body:', err.message);
                return res.status(400).send(`Webhook parse error: ${err.message}`);
            }
        } else {
            event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        }
    } catch (err) {
        console.log('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const orderId = session.metadata ? session.metadata.orderId : null;
            if (orderId) {
                // Mark payment as true and remove expiry so it doesn't get auto-deleted
                await orderModel.findByIdAndUpdate(orderId, { payment: true, $unset: { expiresAt: "" } });
                // Clear user's cart (if the order exists and has a userId)
                const order = await orderModel.findById(orderId);
                if (order && order.userId) {
                    await userModel.findByIdAndUpdate(order.userId, { cartData: {} });
                }
                console.log(`Order ${orderId} marked paid via webhook`);
            }
        }
        res.json({ received: true });
    } catch (error) {
        console.log('Error processing webhook:', error);
        res.status(500).send();
    }
}

// Placing orders using Razorpay
const placeOrderRazorpay = async (req, res) => {
    try {
        console.log('placeOrderRazorpay called, token header:', req.headers.token);
        console.log('placeOrderRazorpay body:', req.body);
        const { userId, items, amount, address } = req.body;

        // Create order data but do NOT save to DB yet (wait for payment verification)
        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Razorpay",
            payment: false,
            date: Date.now()
        }

        const options = {
            amount: amount * 100,
            currency: currency.toUpperCase(),
            receipt: `order_${Date.now()}`
        }

        // Use promise-based API to create Razorpay order
        const razorpayOrder = await razorpayInstance.orders.create(options);
        
        // Return only Razorpay order; client will pass orderData during verification
        res.json({ 
            success: true, 
            order: razorpayOrder
        });
    } catch (error) {
        console.log('Error in placeOrderRazorpay:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
}

// Verify Razorpay Payment
const verifyRazorpay = async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderData } = req.body;
        const { userId, items, address, amount } = orderData;

        console.log('verifyRazorpay called, orderId:', razorpayOrderId, 'paymentId:', razorpayPaymentId);

        // Verify signature
        const sign = razorpayOrderId + "|" + razorpayPaymentId;
        const crypto = await import('crypto');
        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(sign).digest('hex');

        if (generated_signature !== razorpaySignature) {
            console.log('Razorpay signature verification failed');
            return res.json({ success: false, message: 'Signature verification failed' });
        }

        // Signature verified, now save the order
        const newOrder = new orderModel({
            userId,
            items,
            address,
            amount,
            paymentMethod: "Razorpay",
            payment: true, // Mark as paid after verification
            date: Date.now()
        });
        

        await newOrder.save();
        await userModel.findByIdAndUpdate(userId, { cartData: {} });

        res.json({ success: true, message: 'Payment verified and order placed', orderId: newOrder._id });
    } catch (error) {
        console.log('Error in verifyRazorpay:', error);
        res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
}

// All Orders Data for Admin Panel
const allOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({});
        res.json({success: true, orders});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// User order data for frontend - return only paid orders or COD orders (exclude unpaid Stripe sessions)
const userOrders = async (req, res) => {
    try {
        const { userId } = req.body;
        // Include orders that are paid, or were placed with COD
        const orders = await orderModel.find({
            userId,
            $or: [
                { payment: true },
                { paymentMethod: 'COD' }
            ]
        });
        res.json({success: true, orders});
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

// Update order status from admin panel
const updateStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        await orderModel.findByIdAndUpdate(orderId, { status })
        res.json({ success: true, message: 'Status Updated' })
    } catch (error) {
        console.log(error);
        res.json({success: false, message: error.message});
    }
}

export { verifyStripe, verifyWebhook, verifyRazorpay, placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus }