
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const User = require('./src/models/User').default || require('./src/models/User');
const Tenant = require('./src/models/Tenant').default || require('./src/models/Tenant');

async function fixAdminUser() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

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

    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (adminUser) {
      adminUser.tenant_id = teslaTenant._id;
      adminUser.role = 'admin';
      await adminUser.save();
      console.log('Updated admin@example.com with Tesla Tenant ID and admin role');
    } else {
      console.log('User admin@example.com not found.');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixAdminUser();
