import jwt from 'jsonwebtoken';

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Handle authentication
    socket.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        
        // Get user role (in production, fetch from database)
        const User = (await import('../models/User.js')).default;
        const user = await User.findById(decoded.userId);
        
        if (user) {
          socket.userRole = user.role;
          
          // Join role-based rooms
          socket.join(`${user.role}-room`);
          console.log(`✅ User ${user.name} joined ${user.role}-room`);
          
          socket.emit('authenticated', {
            success: true,
            role: user.role,
          });
        }
      } catch (error) {
        console.error('❌ Socket authentication error:', error.message);
        socket.emit('authentication-error', {
          success: false,
          message: 'Authentication failed',
        });
      }
    });

    // Handle joining specific rooms
    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`📍 Socket ${socket.id} joined room: ${room}`);
    });

    // Handle leaving rooms
    socket.on('leave-room', (room) => {
      socket.leave(room);
      console.log(`📍 Socket ${socket.id} left room: ${room}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });

    // Handle custom events
    socket.on('test-alert', (data) => {
      // For testing purposes
      if (socket.userRole === 'owner') {
        io.to('staff-room').emit('test-notification', {
          message: 'Test alert from owner',
          data,
        });
      }
    });
  });

  return io;
};

export const emitToRole = (io, role, event, data) => {
  io.to(`${role}-room`).emit(event, data);
};

export const emitToAll = (io, event, data) => {
  io.emit(event, data);
};

export const emitToUser = (io, userId, event, data) => {
  io.to(userId).emit(event, data);
};
