import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixPlanIndex = async () => {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('plans');

    // List existing indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:', JSON.stringify(indexes, null, 2));

    // Drop the old name_1 index if it exists
    try {
      await collection.dropIndex('name_1');
      console.log('✅ Dropped old name_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ️  Index name_1 does not exist (already dropped)');
      } else {
        console.log('⚠️  Could not drop index:', err.message);
      }
    }

    // Drop the old compound index if it exists
    try {
      await collection.dropIndex('gymId_1_name_1');
      console.log('✅ Dropped old gymId_1_name_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ️  Index gymId_1_name_1 does not exist');
      } else {
        console.log('⚠️  Could not drop index:', err.message);
      }
    }

    // Create the new partial index (only for active plans)
    await collection.createIndex(
      { gymId: 1, name: 1 }, 
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('✅ Created new partial unique index: gymId_1_name_1 (active plans only)');

    // List indexes again to confirm
    const newIndexes = await collection.indexes();
    console.log('\n📋 Updated indexes:', JSON.stringify(newIndexes, null, 2));

    await mongoose.disconnect();
    console.log('\n✅ Database index cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixPlanIndex();
