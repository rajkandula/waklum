import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true }, // 'task', 'project', 'comment', 'file', 'member'
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Activity feed for a project, newest first.
ActivitySchema.index({ project: 1, createdAt: -1 });

export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema);
