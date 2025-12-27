import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  gymId: {
    type: String,
    required: [true, 'Gym ID is required'],
  },
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  duration: {
    value: {
      type: Number,
      required: [true, 'Duration is required'],
    },
    unit: {
      type: String,
      enum: ['days', 'months', 'years'],
      default: 'months',
    },
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  features: [{
    type: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Partial unique index: only enforce uniqueness for active plans
planSchema.index(
  { gymId: 1, name: 1 }, 
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Calculate duration in days
planSchema.methods.getDurationInDays = function() {
  const { value, unit } = this.duration;
  switch (unit) {
    case 'days':
      return value;
    case 'months':
      return value * 30;
    case 'years':
      return value * 365;
    default:
      return value;
  }
};

const Plan = mongoose.model('Plan', planSchema);

export default Plan;
