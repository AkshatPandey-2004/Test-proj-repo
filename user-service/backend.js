import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Add detailed logging
console.log('🚀 Starting User Service...');
console.log('📍 Environment:', process.env.NODE_ENV);
console.log('🔌 MongoDB URI:', process.env.MONGO_URI ? 'Set ✓' : 'Missing ✗');
console.log('🔐 Encryption Key:', process.env.ENCRYPTION_KEY ? 'Set ✓' : 'Missing ✗');
console.log('🔢 Port:', PORT);

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ User Service connected to MongoDB Atlas'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  region: { type: String, default: 'us-east-1' },
  awsCredentials: {
    accessKeyId: String,
    secretAccessKey: String,
    iv: String,
  },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Encryption functions
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'defaultkey12345678901234567890';
const algorithm = 'aes-256-cbc';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex')
  };
}

function decrypt(encryptedData, ivHex) {
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    service: 'user-service',
    timestamp: new Date().toISOString()
  });
});

// --- AUTHENTICATION ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📝 Register request received');
    const { username, email, password, region, awsAccessKeyId, awsSecretAccessKey } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Encrypt AWS credentials if provided
    let awsCredentials = {};
    if (awsAccessKeyId && awsSecretAccessKey) {
      const encryptedAccessKey = encrypt(awsAccessKeyId);
      const encryptedSecretKey = encrypt(awsSecretAccessKey);
      
      awsCredentials = {
        accessKeyId: encryptedAccessKey.encryptedData,
        secretAccessKey: encryptedSecretKey.encryptedData,
        iv: encryptedAccessKey.iv, // Same IV for both
      };
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      region: region || 'us-east-1',
      awsCredentials
    });

    await newUser.save();
    console.log('✅ User registered successfully:', username);

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser._id,
      username: newUser.username,
      email: newUser.email,
      region: newUser.region
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 Login request received');
    const { username, email, password } = req.body;

    // Find user by username or email
    const user = await User.findOne({ $or: [{ username }, { email }] });
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('✅ Login successful for:', user.username);

    res.status(200).json({
      message: 'Login successful',
      userId: user._id,
      username: user.username,
      email: user.email,
      region: user.region,
      hasAwsCredentials: !!(user.awsCredentials?.accessKeyId)
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// Update Region
app.post('/api/auth/update-region', async (req, res) => {
  try {
    const { userId, region } = req.body;

    if (!userId || !region) {
      return res.status(400).json({ message: 'userId and region are required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { region },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Region updated successfully',
      region: user.region
    });
  } catch (error) {
    console.error('❌ Update region error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- PROFILE ROUTES ---

// Get Profile
app.get('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      userId: user._id,
      username: user.username,
      email: user.email,
      region: user.region,
      hasAwsCredentials: !!(user.awsCredentials?.accessKeyId),
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Profile
app.put('/api/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, email, password, region, awsAccessKeyId, awsSecretAccessKey } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update basic fields
    if (username) user.username = username;
    if (email) user.email = email;
    if (region) user.region = region;

    // Update password if provided
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    // Update AWS credentials if provided
    if (awsAccessKeyId && awsSecretAccessKey) {
      const encryptedAccessKey = encrypt(awsAccessKeyId);
      const encryptedSecretKey = encrypt(awsSecretAccessKey);
      
      user.awsCredentials = {
        accessKeyId: encryptedAccessKey.encryptedData,
        secretAccessKey: encryptedSecretKey.encryptedData,
        iv: encryptedAccessKey.iv,
      };
    }

    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      userId: user._id,
      username: user.username,
      email: user.email,
      region: user.region,
      hasAwsCredentials: !!(user.awsCredentials?.accessKeyId)
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- CREDENTIALS ROUTES ---

// Get Decrypted AWS Credentials
app.get('/api/user/credentials/:userId/aws', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.awsCredentials?.accessKeyId) {
      // Return 200 with empty credentials object instead of 404
      // This allows monitoring service to gracefully fall back to ENV credentials
      return res.status(200).json({ 
        decryptedSecret: {
          accessKeyId: null,
          secretAccessKey: null,
          region: user.region || 'us-east-1'
        },
        message: 'No AWS credentials stored for this user'
      });
    }

    // Decrypt credentials
    const accessKeyId = decrypt(user.awsCredentials.accessKeyId, user.awsCredentials.iv);
    const secretAccessKey = decrypt(user.awsCredentials.secretAccessKey, user.awsCredentials.iv);

    res.status(200).json({
      decryptedSecret: {
        accessKeyId,
        secretAccessKey,
        region: user.region
      }
    });
  } catch (error) {
    console.error('❌ Get credentials error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 User Service listening on port ${PORT}`);
});