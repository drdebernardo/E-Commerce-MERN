import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    items: { type: Array, required: true },
    amount: { type: Number, required: true },
    address: { type: Object, required: true },
    status: { type: String, required: true, default: 'Order Placed' },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, required: true, default: false },
    date: { type: Number, required: true },
    // Optional expiry for unpaid orders (used with a TTL index)
    expiresAt: { type: Date }
});

// Delete orders when `expiresAt` time is reached (set expireAfterSeconds: 0 so it expires at the given date)
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const orderModel = mongoose.models.order || mongoose.model('order', orderSchema);

export default orderModel;