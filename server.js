import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

import connectDB from './src/config/database.js';
import { initializeSocket } from './src/socket/socketHandler.js';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import gymRoutes from './src/routes/gymRoutes.js';
import memberRoutes from './src/routes/memberRoutes.js';
import attendanceRoutes from './src/routes/attendanceRoutes.js';
import alertRoutes from './src/routes/alertRoutes.js';
import planRoutes from './src/routes/planRoutes.js';
import userRoutes from './src/routes/userRoutes.js';

// Load environment variables (MUST be at top)
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Initialize Socket.io handlers
initializeSocket(io);

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts, please try again later.',
});

// Apply general rate limiter to all API routes
app.use('/', limiter);
// Apply stricter rate limit to auth login endpoint
app.use('/auth/login', authLimiter);

// Routes mounted at root-level paths per specification
// Temporary health/check route for POST diagnostics
app.post('/__test_post', (req, res) => {
  console.log('DEBUG: Received POST /__test_post');
  return res.status(200).json({ ok: true, time: new Date().toISOString() });
});

console.log('DEBUG: Mounting auth and API routes now');
app.use('/auth', authRoutes);
app.use('/gyms', gymRoutes);
app.use('/members', memberRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/alerts', alertRoutes);
app.use('/plans', planRoutes);
app.use('/users', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
const PORT = process.env.PORT || 5002;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    mongoose.connection.close();
    process.exit(0);
  });
});

export default app;
