import mongoose from 'mongoose';

const mcpUsageSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  month: { type: String, required: true }, // Format: "YYYY-MM"
  callCount: { type: Number, default: 0 },
  lastCallAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound index for fast lookups: one doc per org per month
mcpUsageSchema.index({ organization: 1, month: 1 }, { unique: true });

// Atomic increment — returns the updated doc
mcpUsageSchema.statics.incrementCalls = async function (orgId) {
  const month = new Date().toISOString().slice(0, 7); // "2026-05"
  return this.findOneAndUpdate(
    { organization: orgId, month },
    { $inc: { callCount: 1 }, $set: { lastCallAt: new Date() } },
    { upsert: true, new: true }
  );
};

// Get current month's usage without incrementing
mcpUsageSchema.statics.getCurrentUsage = async function (orgId) {
  const month = new Date().toISOString().slice(0, 7);
  const doc = await this.findOne({ organization: orgId, month });
  return doc?.callCount || 0;
};

export default mongoose.models.McpUsage || mongoose.model('McpUsage', mcpUsageSchema);
