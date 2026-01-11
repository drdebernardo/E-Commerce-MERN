import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import cartRouter from './routes/cartRoute.js';
import orderRouter from './routes/orderRoute.js';
import { verifyWebhook } from './controllers/orderController.js';

// App Config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// Stripe webhook endpoint needs raw body for signature verification. Register it before JSON body parser.
app.post('/api/order/webhook', express.raw({ type: 'application/json' }), verifyWebhook);

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'https://forever-frontend-3hsz.onrender.com',
    'http://localhost:5173'
  ],
  credentials: true
}));

// Graceful JSON parse errors from express.json()
app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
        console.error('Invalid JSON received:', err.message);
        return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
    }
    next(err);
});

// API Endpoints
app.use('/api/user', userRouter);
app.use('/api/product', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/order', orderRouter);

app.get('/', (req, res) => {
    res.send("API Working!");
})

app.listen(port, () => console.log('Server running on port:'+ port));