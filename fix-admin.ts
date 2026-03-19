
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from './src/models/User';
import Tenant from './src/models/Tenant';

dotenv.config();

async function fixAdminUser() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/voiaz';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // 1. Create or find 'Tesla' tenant
    let teslaTenant = await Tenant.findOne({ name: 'Tesla' });
    if (!teslaTenant) {
      teslaTenant = await Tenant.create({
        name: 'Tesla',
        balance: 1000,
        status: 'active'
      });
      console.log('Created Tesla Tenant:', teslaTenant._id);
    } else {
      console.log('Found existing Tesla Tenant:', teslaTenant._id);
    }

    // 2. Find and update admin@example.com
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (adminUser) {
      adminUser.tenant_id = teslaTenant._id as mongoose.Types.ObjectId;
      adminUser.role = 'admin';
      await adminUser.save();
      console.log('Updated admin@example.com with Tesla Tenant ID and admin role');
    } else {
      console.log('User admin@example.com not found. Please ensure the user exists.');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error fixing admin user:', error);
    process.exit(1);
  }
}

fixAdminUser();
