import mongoose from 'mongoose';
import { MEMBERSHIP_STATUS, FEE_STATUS } from '../config/constants.js';

const memberSchema = new mongoose.Schema({
  gymId: {
    type: String,
    required: [true, 'Gym ID is required'],
  },
  memberId: {
    type: String,
    required: true,
    uppercase: true,
  },
  personalInfo: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    address: {
      type: String,
      trim: true,
    },
    photo: {
      type: String,
    },
  },
  membership: {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(MEMBERSHIP_STATUS),
      default: MEMBERSHIP_STATUS.ACTIVE,
    },
  },
  // Convenience expiryDate stored at top-level for quick checks (kept in sync with membership.endDate)
  expiryDate: {
    type: Date,
  },
  feeStatus: {
    type: String,
    enum: Object.values(FEE_STATUS),
    default: FEE_STATUS.PAID,
  },
  lastPaymentDate: {
    type: Date,
  },
  nextPaymentDue: {
    type: Date,
  },
  qrCode: {
    type: String,
    required: true,
  },
  emergencyContact: {
    name: {
      type: String,
    },
    phone: {
      type: String,
    },
    relationship: {
      type: String,
    },
  },
  notes: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
memberSchema.index({ gymId: 1, memberId: 1 }, { unique: true }); // Compound index for unique memberId per gym
memberSchema.index({ 'personalInfo.phone': 1 });
memberSchema.index({ 'personalInfo.email': 1 });
memberSchema.index({ 'membership.status': 1 });
memberSchema.index({ 'membership.endDate': 1 });
memberSchema.index({ feeStatus: 1 });

// Check if membership is expired
memberSchema.methods.isMembershipExpired = function() {
  const compareDate = this.expiryDate || this.membership.endDate;
  return !compareDate || new Date() > new Date(compareDate);
};

// Check if fee is overdue
memberSchema.methods.isFeeOverdue = function() {
  return this.feeStatus === FEE_STATUS.OVERDUE || 
         (this.nextPaymentDue && new Date() > this.nextPaymentDue);
};

// Check if member can access gym
memberSchema.methods.canAccessGym = function() {
  return this.isActive &&
         this.membership.status === MEMBERSHIP_STATUS.ACTIVE &&
         !this.isMembershipExpired() &&
         this.feeStatus === FEE_STATUS.PAID;
};

const Member = mongoose.model('Member', memberSchema);

export default Member;
