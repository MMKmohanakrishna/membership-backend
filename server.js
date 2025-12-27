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

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // limit each IP to 20 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
});

app.use('/api/', limiter);
app.use('/api/v1/auth/login', authLimiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/gyms', gymRoutes); // Super admin only
app.use('/api/v1/members', memberRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/users', userRoutes);

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
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
// Default backend port changed to 5002 to avoid conflicts
const PORT = process.env.PORT || 5002;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
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
