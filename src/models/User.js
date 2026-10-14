import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String }, // Optional for Google OAuth users
  avatar: String,
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId: { type: String, sparse: true },
  subscription: {
    plan: { type: String, enum: ['free', 'pro', 'team', 'enterprise'], default: 'free' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date
  },
  organizations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Organization' }],
  preferences: {
    theme: { type: String, default: 'dark' },
    notifications: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } }
  },
  lastLoginAt: Date
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
