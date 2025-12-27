import mongoose from 'mongoose';
import { ALERT_TYPES } from '../config/constants.js';

const alertSchema = new mongoose.Schema({
  gymId: {
    type: String,
    required: [true, 'Gym ID is required'],
  },
  type: {
    type: String,
    enum: Object.values(ALERT_TYPES),
    required: true,
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  }],
  targetRoles: [{
    type: String,
    default: ['owner', 'staff'],
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
}, {
  timestamps: true,
});

// Indexes
alertSchema.index({ member: 1, createdAt: -1 });
alertSchema.index({ isRead: 1 });
alertSchema.index({ targetRoles: 1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;
