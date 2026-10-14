import mongoose from 'mongoose';
import crypto from 'crypto';

const OAuthCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  codeChallenge: String,
  codeChallengeMethod: String,
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  // The access token (API key) minted from this code, so a replay can revoke it.
  apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey' },
  // Set once someone tries to redeem the code a second time.
  replayed: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-expire after 10 minutes
OAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

OAuthCodeSchema.statics.generateCode = function () {
  return crypto.randomBytes(32).toString('hex');
};

export default mongoose.models.OAuthCode || mongoose.model('OAuthCode', OAuthCodeSchema);
