import mongoose from 'mongoose';
import crypto from 'crypto';

const ApiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  prefix: { type: String, required: true },
  name: { type: String, default: 'API Key' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUsedAt: Date,
  expiresAt: Date,
}, { timestamps: true });

// Static method to generate a new API key
ApiKeySchema.statics.generateKey = function () {
  const raw = crypto.randomBytes(32).toString('hex');
  const key = `pw_sk_${raw}`;
  const prefix = key.substring(0, 12);
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
};

// Static method to find user by raw API key
ApiKeySchema.statics.findByKey = async function (rawKey) {
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const apiKey = await this.findOne({ key: hash });
  if (apiKey) {
    apiKey.lastUsedAt = new Date();
    await apiKey.save();
  }
  return apiKey;
};

export default mongoose.models.ApiKey || mongoose.model('ApiKey', ApiKeySchema);
