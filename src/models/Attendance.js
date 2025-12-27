import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  gymId: {
    type: String,
    required: [true, 'Gym ID is required'],
  },
  member: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  checkInTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  checkOutTime: {
    type: Date,
  },
  method: {
    type: String,
    enum: ['qr', 'manual'],
    default: 'qr',
  },
  location: {
    type: String,
    default: 'Main Entrance',
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
  },
  accessGranted: {
    type: Boolean,
    default: true,
  },
  denialReason: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes
attendanceSchema.index({ gymId: 1, member: 1, checkInTime: -1 });
attendanceSchema.index({ gymId: 1, checkInTime: -1 });
attendanceSchema.index({ member: 1, checkInTime: -1 });
attendanceSchema.index({ checkInTime: -1 });
attendanceSchema.index({ accessGranted: 1 });

// TTL index: remove attendance records 60 days (approx. 2 months) after `checkInTime`
// expireAfterSeconds is in seconds: 60 days = 60 * 24 * 60 * 60 = 5184000
attendanceSchema.index({ checkInTime: 1 }, { expireAfterSeconds: 5184000 });

// Calculate duration
attendanceSchema.virtual('duration').get(function() {
  if (this.checkOutTime) {
    return Math.round((this.checkOutTime - this.checkInTime) / 1000 / 60); // minutes
  }
  return null;
});

attendanceSchema.set('toJSON', { virtuals: true });
attendanceSchema.set('toObject', { virtuals: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
