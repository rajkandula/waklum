import mongoose from 'mongoose';

/**
 * One fixed rate-limit window. `key` is "<bucket>:<client>", e.g. "login:1.2.3.4".
 * Documents are disposable; the TTL index sweeps them once the window has passed.
 */
const RateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: false, versionKey: false });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Built on first use (autoIndex), or up front with `npm run db:indexes`.
RateLimitSchema.index({ key: 1 }, { unique: true });
// Sweep windows a minute after they lapse. The limiter never trusts this for
// correctness; it compares expiresAt itself.
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 60 });

export default mongoose.models.RateLimit || mongoose.model('RateLimit', RateLimitSchema);
