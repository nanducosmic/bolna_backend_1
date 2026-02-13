
const fs = require('fs');
const mongoose = require('mongoose');

const envContent = fs.readFileSync('.env', 'utf8');
const match = envContent.match(/MONGO_URI=(.+)/);
if (!match) {
    console.error('MONGO_URI not found in .env');
    process.exit(1);
}
const uri = match[1].trim();

// Mock User and Tenant schemas for the fix script
const tenantSchema = new mongoose.Schema({
    name: String,
    balance: Number,
    status: String
}, { timestamps: true });

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    tenant_id: mongoose.Schema.Types.ObjectId,
    role: String
}, { timestamps: true });

const Tenant = mongoose.model('Tenant', tenantSchema);
const User = mongoose.model('User', userSchema);

async function run() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        // 1. Create Tesla Tenant
        let tesla = await Tenant.findOne({ name: 'Tesla' });
        if (!tesla) {
            tesla = await Tenant.create({
                name: 'Tesla',
                balance: 1000,
                status: 'active'
            });
            console.log('Created Tesla Tenant:', tesla._id);
        } else {
            console.log('Tesla Tenant already exists:', tesla._id);
        }

        // 2. Update Admin User
        const adminEmail = 'admin@example.com';
        const result = await User.findOneAndUpdate(
            { email: adminEmail },
            { 
                tenant_id: tesla._id,
                role: 'admin'
            },
            { new: true }
        );

        if (result) {
            console.log(`Successfully updated ${adminEmail} with Tesla Tenant ID`);
            console.log('Updated User:', {
                id: result._id,
                email: result.email,
                role: result.role,
                tenant_id: result.tenant_id
            });
        } else {
            console.log(`User ${adminEmail} not found in database.`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();
