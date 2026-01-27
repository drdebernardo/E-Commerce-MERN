import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
    })

    // Debug log to check the actual URI being used
    console.log('Connecting to MongoDB with URI:', `${process.env.MONGODB_URI}/e-commerce`);
    await mongoose.connect(`${process.env.MONGODB_URI}/e-commerce`)
};

export default connectDB;