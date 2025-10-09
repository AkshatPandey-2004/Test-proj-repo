import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import cors from 'cors';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes for aes-256-cbc
const IV_LENGTH = 16;

app.use(cors());
app.use(express.json());

// --- Database Connection ---
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ User Service connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// --- NEW USER SCHEMA (for registration/login) ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed password
  accessKeyId: { type: String, required: true },
  encryptedSecretKey: { type: String, required: true },
  region: { type: String, default: 'us-east-1' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// --- OLD CREDENTIAL SCHEMA (for backward compatibility) ---
const credentialSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  accessKeyId: { type: String, required: true },
  encryptedSecretKey: { type: String, required: true },
  region: { type: String, required: true },
});

const Credential = mongoose.model('Credential', credentialSchema);

// --- Encryption Helpers ---
function encrypt(text) {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('Invalid ENCRYPTION_KEY. Must be 32 bytes.');
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
    throw new Error('Invalid ENCRYPTION_KEY. Must be 32 bytes.');
  }
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// --- NEW ROUTES ---

/**
 * POST /api/user/register
 * Registers a new user with username, email, password, access key, and secret key
 */
app.post('/api/user/register', async (req, res) => {
  try {
    const { username, email, password, accessKeyId, secretAccessKey } = req.body;

    // Validate required fields
    if (!username || !email || !password || !accessKeyId || !secretAccessKey) {
      return res.status(400).send({ message: 'All fields are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).send({ message: 'Username or email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Encrypt secret key
    const encryptedSecretKey = encrypt(secretAccessKey);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      accessKeyId,
      encryptedSecretKey,
      region: 'us-east-1' // Default region
    });

    await newUser.save();

    console.log('✅ User registered:', username);

    res.status(201).send({ 
      message: '✅ User registered successfully!',
      userId: newUser._id 
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send({ message: '❌ Internal server error during registration.' });
  }
});

/**
 * POST /api/user/login
 * Authenticates user with username, email, password, and optional region
 */
app.post('/api/user/login', async (req, res) => {
  try {
    const { username, email, password, region } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).send({ message: 'Username, email, and password are required.' });
    }

    // Find user by username and email
    const user = await User.findOne({ username, email });
    if (!user) {
      return res.status(401).send({ message: 'Invalid credentials.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).send({ message: 'Invalid credentials.' });
    }

    // Update region if provided
    if (region && region !== user.region) {
      user.region = region;
      await user.save();
    }

    console.log('✅ User logged in:', username);

    res.status(200).send({ 
      message: '✅ Login successful!',
      userId: user._id,
      username: user.username,
      email: user.email,
      region: user.region || region
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send({ message: '❌ Internal server error during login.' });
  }
});

/**
 * GET /api/user/profile/:userId
 * Get user profile data (without sensitive info)
 */
app.get('/api/user/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📋 Fetching profile for user:', userId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).send({ message: 'User not found.' });
    }

    console.log('✅ Profile found for user:', user.username);

    // Return user data without password and secret key
    res.status(200).send({
      username: user.username,
      email: user.email,
      accessKeyId: user.accessKeyId,
      region: user.region
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).send({ message: '❌ Internal server error while fetching profile.' });
  }
});

/**
 * POST /api/user/update-profile
 * Update user profile information
 */
app.post('/api/user/update-profile', async (req, res) => {
  try {
    const { userId, username, email, accessKeyId, secretAccessKey, newPassword } = req.body;

    console.log('📝 Updating profile for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).send({ message: 'User not found.' });
    }

    // Update fields only if provided
    if (username) {
      console.log('Updating username:', username);
      user.username = username;
    }
    if (email) {
      console.log('Updating email:', email);
      user.email = email;
    }
    if (accessKeyId) {
      console.log('Updating access key');
      user.accessKeyId = accessKeyId;
    }
    if (secretAccessKey) {
      console.log('Updating secret key (encrypted)');
      user.encryptedSecretKey = encrypt(secretAccessKey);
    }
    if (newPassword) {
      console.log('Updating password (hashed)');
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    console.log('✅ Profile updated successfully for user:', user.username);

    res.status(200).send({ message: '✅ Profile updated successfully!' });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).send({ message: '❌ Internal server error while updating profile.' });
  }
});

/**
 * POST /api/user/update-region
 * Update user's preferred AWS region
 */
app.post('/api/user/update-region', async (req, res) => {
  try {
    const { userId, region } = req.body;

    console.log('🌍 Updating region for user:', userId, 'to:', region);

    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).send({ message: 'User not found.' });
    }

    user.region = region;
    await user.save();

    console.log('✅ Region updated to:', region);

    res.status(200).send({ message: '✅ Region updated successfully!' });
  } catch (error) {
    console.error('❌ Error updating region:', error);
    res.status(500).send({ message: '❌ Internal server error while updating region.' });
  }
});

// --- OLD ROUTES (for backward compatibility) ---

/**
 * POST /api/user/credentials
 * Saves or updates a user's AWS credentials (OLD METHOD).
 */
app.post('/api/user/credentials', async (req, res) => {
  try {
    const { userId, accessKeyId, secretAccessKey, region } = req.body;

    if (!userId || !accessKeyId || !secretAccessKey || !region) {
      return res.status(400).send({ message: 'Missing required fields.' });
    }

    const encryptedSecretKey = encrypt(secretAccessKey);

    const newCred = { userId, accessKeyId, encryptedSecretKey, region };
    await Credential.updateOne({ userId }, newCred, { upsert: true });

    res.status(200).send({ message: '✅ Credentials saved securely.' });
  } catch (error) {
    console.error('Error saving credentials:', error);
    res.status(500).send({ message: '❌ Internal server error while saving credentials.' });
  }
});

/**
 * GET /api/user/credentials/:userId/:provider
 * Retrieves and decrypts AWS credentials for Monitoring Service.
 */
app.get('/api/user/credentials/:userId/:provider', async (req, res) => {
  try {
    const { userId, provider } = req.params;

    if (provider !== 'aws') {
      return res.status(400).send({ message: 'Only AWS provider is supported.' });
    }

    // Try to get from new User schema first
    const user = await User.findById(userId);
    if (user) {
      const decryptedSecret = decrypt(user.encryptedSecretKey);
      return res.status(200).send({
        decryptedSecret: {
          accessKeyId: user.accessKeyId,
          secretAccessKey: decryptedSecret,
          region: user.region
        }
      });
    }

    // Fallback to old Credential schema
    const cred = await Credential.findOne({ userId });
    if (!cred) {
      return res.status(404).send({ message: 'No credentials found for user.' });
    }

    const decryptedSecretKey = decrypt(cred.encryptedSecretKey);

    res.status(200).send({
      decryptedSecret: {
        accessKeyId: cred.accessKeyId,
        secretAccessKey: decryptedSecretKey,
        region: cred.region,
      },
    });
  } catch (error) {
    console.error('Error retrieving credentials:', error);
    res.status(500).send({
      message: '❌ Error retrieving or decrypting credentials.',
      error: error.message,
    });
  }
});

app.listen(PORT, () => console.log(`🚀 User Service listening on port ${PORT}`));