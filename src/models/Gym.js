import mongoose from 'mongoose';
import crypto from 'crypto';

const gymSchema = new mongoose.Schema({
  gymId: {
    type: String,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Gym name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
  },
  contact: {
    phone: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    website: String,
  },
  settings: {
    timezone: {
      type: String,
      default: 'UTC',
    },
    currency: {
      type: String,
      default: 'USD',
    },
    maxMembers: {
      type: Number,
      default: null, // null means unlimited
    },
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
}, {
  timestamps: true,
});

// Generate unique gymId before saving
gymSchema.pre('save', async function(next) {
  if (!this.gymId) {
    // Generate a unique 12-character alphanumeric gymId
    let unique = false;
    let newGymId;
    
    while (!unique) {
      // Generate random string: GYM + 9 random alphanumeric chars
      newGymId = 'GYM' + crypto.randomBytes(6).toString('hex').toUpperCase().substring(0, 9);
      
      // Check if gymId already exists
      const existing = await mongoose.model('Gym').findOne({ gymId: newGymId });
      if (!existing) {
        unique = true;
      }
    }
    
    this.gymId = newGymId;
  }
  next();
});

// Indexes
gymSchema.index({ isActive: 1 });
gymSchema.index({ createdBy: 1 });

export default mongoose.model('Gym', gymSchema);
