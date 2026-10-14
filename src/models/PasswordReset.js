import mongoose from 'mongoose';

const PasswordResetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: true });

// Auto-delete expired tokens after 1 day
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

export default mongoose.models.PasswordReset || mongoose.model('PasswordReset', PasswordResetSchema);
