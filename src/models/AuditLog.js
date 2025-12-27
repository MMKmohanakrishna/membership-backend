import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'gym_created',
      'gym_updated',
      'gym_deleted',
      'gym_blocked',
      'gym_unblocked',
      'user_created',
      'user_updated',
      'user_deleted',
      'login',
      'logout',
      'settings_updated',
    ],
  },
  resource: {
    type: String,
    required: true,
    enum: ['gym', 'user', 'auth', 'system'],
  },
  resourceId: {
    type: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// TTL index: auto-delete audit logs older than 1 year (365 days)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
