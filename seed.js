import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Gym from './src/models/Gym.js';
import User from './src/models/User.js';
import Plan from './src/models/Plan.js';
import Member from './src/models/Member.js';
import { generateMemberId, generateQRCodeData, generateQRCodeImage } from './src/utils/qrGenerator.js';
import { ROLES, MEMBERSHIP_STATUS, FEE_STATUS } from './src/config/constants.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Gym.deleteMany({});
    await User.deleteMany({});
    await Plan.deleteMany({});
    await Member.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Super Admin (no gymId)
    const superAdmin = await User.create({
      email: 'superadmin@system.com',
      password: 'superadmin123',
      name: 'Super Administrator',
      phone: '+1000000000',
      role: ROLES.SUPER_ADMIN,
      isActive: true,
    });
    console.log('🔑 Created Super Admin');

    // Create Gym 1: FitZone Fitness
    const gym1 = await Gym.create({
      name: 'FitZone Fitness',
      description: 'Premium fitness center in downtown',
      address: {
        street: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
      },
      contact: {
        phone: '+1234567890',
        email: 'contact@fitzone.com',
        website: 'https://fitzone.com',
      },
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        maxMembers: 500,
      },
      createdBy: superAdmin._id,
    });

    const gym1Owner = await User.create({
      gymId: gym1.gymId,
      email: 'owner@fitzone.com',
      password: 'password123',
      name: 'John Smith',
      phone: '+1234567890',
      role: ROLES.GYM_OWNER,
      isActive: true,
      createdBy: superAdmin._id,
    });

    const gym1Staff = await User.create({
      gymId: gym1.gymId,
      email: 'staff@fitzone.com',
      password: 'password123',
      name: 'Jane Wilson',
      phone: '+1234567891',
      role: ROLES.STAFF,
      isActive: true,
      createdBy: gym1Owner._id,
    });

    console.log(`🏢 Created Gym 1: ${gym1.name} (${gym1.gymId})`);

    // Create Gym 2: PowerHouse Gym
    const gym2 = await Gym.create({
      name: 'PowerHouse Gym',
      description: 'Strength and conditioning facility',
      address: {
        street: '456 Oak Avenue',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA',
      },
      contact: {
        phone: '+1987654321',
        email: 'info@powerhouse.com',
        website: 'https://powerhouse.com',
      },
      settings: {
        timezone: 'America/Los_Angeles',
        currency: 'USD',
        maxMembers: 300,
      },
      createdBy: superAdmin._id,
    });

    const gym2Owner = await User.create({
      gymId: gym2.gymId,
      email: 'owner@powerhouse.com',
      password: 'password123',
      name: 'Mike Johnson',
      phone: '+1987654321',
      role: ROLES.GYM_OWNER,
      isActive: true,
      createdBy: superAdmin._id,
    });

    const gym2Staff = await User.create({
      gymId: gym2.gymId,
      email: 'staff@powerhouse.com',
      password: 'password123',
      name: 'Sarah Davis',
      phone: '+1987654322',
      role: ROLES.STAFF,
      isActive: true,
      createdBy: gym2Owner._id,
    });

    console.log(`🏢 Created Gym 2: ${gym2.name} (${gym2.gymId})`);

    // Create plans for Gym 1
    const gym1BasicPlan = await Plan.create({
      gymId: gym1.gymId,
      name: 'Basic Monthly',
      description: 'Access to gym equipment and facilities',
      duration: { value: 1, unit: 'months' },
      price: 29.99,
      features: [
        'Access to gym equipment',
        'Locker room access',
        'Free WiFi',
      ],
      createdBy: gym1Owner._id,
    });

    const gym1PremiumPlan = await Plan.create({
      gymId: gym1.gymId,
      name: 'Premium Monthly',
      description: 'All basic features plus group classes',
      duration: { value: 1, unit: 'months' },
      price: 49.99,
      features: [
        'All Basic features',
        'Group fitness classes',
        'Personal training session (1/month)',
        'Sauna access',
      ],
      createdBy: gym1Owner._id,
    });

    console.log(`📋 Created plans for ${gym1.name}`);

    // Create plans for Gym 2
    const gym2BasicPlan = await Plan.create({
      gymId: gym2.gymId,
      name: 'Strength Basic',
      description: 'Access to strength training equipment',
      duration: { value: 1, unit: 'months' },
      price: 39.99,
      features: [
        'Access to weight room',
        'Locker room access',
        'Free parking',
      ],
      createdBy: gym2Owner._id,
    });

    const gym2PremiumPlan = await Plan.create({
      gymId: gym2.gymId,
      name: 'Strength Elite',
      description: 'Premium strength training package',
      duration: { value: 1, unit: 'months' },
      price: 59.99,
      features: [
        'All basic features',
        'Personal training (2/month)',
        'Nutrition planning',
        'Competition training area access',
      ],
      createdBy: gym2Owner._id,
    });

    console.log(`📋 Created plans for ${gym2.name}`);

    // Create sample members for Gym 1
    const gym1Member1Id = generateMemberId();
    const gym1Member1QrData = generateQRCodeData(gym1.gymId, gym1Member1Id);
    const gym1Member1QrCode = await generateQRCodeImage(gym1Member1QrData);
    
    const gym1Member1StartDate = new Date();
    const gym1Member1EndDate = new Date(gym1Member1StartDate);
    gym1Member1EndDate.setDate(gym1Member1EndDate.getDate() + gym1BasicPlan.getDurationInDays());

    await Member.create({
      gymId: gym1.gymId,
      memberId: gym1Member1Id,
      personalInfo: {
        name: 'Alex Thompson',
        email: 'alex@example.com',
        phone: '+1111111111',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'male',
        address: '123 Main St, New York, NY',
      },
      membership: {
        plan: gym1BasicPlan._id,
        startDate: gym1Member1StartDate,
        endDate: gym1Member1EndDate,
        status: MEMBERSHIP_STATUS.ACTIVE,
      },
      feeStatus: FEE_STATUS.PAID,
      qrCode: gym1Member1QrCode,
      createdBy: gym1Staff._id,
      isActive: true,
    });

    const gym1Member2Id = generateMemberId();
    const gym1Member2QrData = generateQRCodeData(gym1.gymId, gym1Member2Id);
    const gym1Member2QrCode = await generateQRCodeImage(gym1Member2QrData);
    
    const gym1Member2StartDate = new Date();
    const gym1Member2EndDate = new Date(gym1Member2StartDate);
    gym1Member2EndDate.setDate(gym1Member2EndDate.getDate() + gym1PremiumPlan.getDurationInDays());

    await Member.create({
      gymId: gym1.gymId,
      memberId: gym1Member2Id,
      personalInfo: {
        name: 'Emily Rodriguez',
        email: 'emily@example.com',
        phone: '+1111111112',
        dateOfBirth: new Date('1995-08-22'),
        gender: 'female',
        address: '456 Oak Ave, New York, NY',
      },
      membership: {
        plan: gym1PremiumPlan._id,
        startDate: gym1Member2StartDate,
        endDate: gym1Member2EndDate,
        status: MEMBERSHIP_STATUS.ACTIVE,
      },
      feeStatus: FEE_STATUS.PAID,
      qrCode: gym1Member2QrCode,
      createdBy: gym1Staff._id,
      isActive: true,
    });

    console.log(`👥 Created members for ${gym1.name}`);

    // Create sample members for Gym 2
    const gym2Member1Id = generateMemberId();
    const gym2Member1QrData = generateQRCodeData(gym2.gymId, gym2Member1Id);
    const gym2Member1QrCode = await generateQRCodeImage(gym2Member1QrData);
    
    const gym2Member1StartDate = new Date();
    const gym2Member1EndDate = new Date(gym2Member1StartDate);
    gym2Member1EndDate.setDate(gym2Member1EndDate.getDate() + gym2BasicPlan.getDurationInDays());

    await Member.create({
      gymId: gym2.gymId,
      memberId: gym2Member1Id,
      personalInfo: {
        name: 'David Chen',
        email: 'david@example.com',
        phone: '+2222222221',
        dateOfBirth: new Date('1988-03-10'),
        gender: 'male',
        address: '789 Pine Blvd, Los Angeles, CA',
      },
      membership: {
        plan: gym2BasicPlan._id,
        startDate: gym2Member1StartDate,
        endDate: gym2Member1EndDate,
        status: MEMBERSHIP_STATUS.ACTIVE,
      },
      feeStatus: FEE_STATUS.PAID,
      qrCode: gym2Member1QrCode,
      createdBy: gym2Staff._id,
      isActive: true,
    });

    const gym2Member2Id = generateMemberId();
    const gym2Member2QrData = generateQRCodeData(gym2.gymId, gym2Member2Id);
    const gym2Member2QrCode = await generateQRCodeImage(gym2Member2QrData);
    
    const gym2Member2StartDate = new Date();
    const gym2Member2EndDate = new Date(gym2Member2StartDate);
    gym2Member2EndDate.setDate(gym2Member2EndDate.getDate() + gym2PremiumPlan.getDurationInDays());

    await Member.create({
      gymId: gym2.gymId,
      memberId: gym2Member2Id,
      personalInfo: {
        name: 'Lisa Martinez',
        email: 'lisa@example.com',
        phone: '+2222222222',
        dateOfBirth: new Date('1992-11-30'),
        gender: 'female',
        address: '321 Maple Dr, Los Angeles, CA',
      },
      membership: {
        plan: gym2PremiumPlan._id,
        startDate: gym2Member2StartDate,
        endDate: gym2Member2EndDate,
        status: MEMBERSHIP_STATUS.ACTIVE,
      },
      feeStatus: FEE_STATUS.PAID,
      qrCode: gym2Member2QrCode,
      createdBy: gym2Staff._id,
      isActive: true,
    });

    console.log(`👥 Created members for ${gym2.name}`);

    // Summary
    console.log('\n✅ Database seeded successfully!\n');
    console.log('📊 Seed Summary:');
    console.log('================');
    console.log(`Super Admin: superadmin@system.com / superadmin123`);
    console.log(`\nGym 1: ${gym1.name} (ID: ${gym1.gymId})`);
    console.log(`  Owner: owner@fitzone.com / password123`);
    console.log(`  Staff: staff@fitzone.com / password123`);
    console.log(`  Members: 2`);
    console.log(`\nGym 2: ${gym2.name} (ID: ${gym2.gymId})`);
    console.log(`  Owner: owner@powerhouse.com / password123`);
    console.log(`  Staff: staff@powerhouse.com / password123`);
    console.log(`  Members: 2`);
    console.log('\nℹ️  Note: Gym owners never see or enter gymId manually.');
    console.log('   The system automatically manages gym data isolation.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
