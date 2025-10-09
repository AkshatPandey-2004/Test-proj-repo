import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import cors from 'cors';

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

// --- Schema ---
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

// --- ROUTES ---

/**
 * POST /api/user/credentials
 * Saves or updates a user's AWS credentials.
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
 * GET /api/user/credentials/:userId/aws
 * Retrieves and decrypts AWS credentials for Monitoring Service.
 */
app.get('/api/user/credentials/:userId/:provider', async (req, res) => {
  try {
    const { userId, provider } = req.params;

    if (provider !== 'aws') {
      return res.status(400).send({ message: 'Only AWS provider is supported.' });
    }

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
