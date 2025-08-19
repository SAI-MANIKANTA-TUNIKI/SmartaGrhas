import mongoose from "mongoose";
import dotenv from "dotenv";
import asyncRetry from "async-retry";

dotenv.config();

const connectDB = async () => {
  try {
    await asyncRetry(
      async () => {
        console.log("Attempting MongoDB connection...");
        await mongoose.connect(process.env.MONGODB_URI, {
          maxPoolSize: 10, // Reduced for Render’s resources
          serverSelectionTimeoutMS: 10000, // Reduced to 10s
          socketTimeoutMS: 20000, // Reduced to 20s
          connectTimeoutMS: 10000, // Reduced to 10s
          heartbeatFrequencyMS: 10000,
          retryWrites: true,
          retryReads: true,
        });
        console.log("MongoDB connected successfully");
      },
      {
        retries: 3,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (err, attempt) => {
          console.log(`Retry ${attempt} for MongoDB connection: ${err.message}`);
        },
      }
    );
    return true;
  } catch (error) {
    console.error("MongoDB connection failed after retries:", error.message);
    return false; // Allow server to continue
  }
};

export default connectDB;