import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  attachments: [{ name: String, url: String }],
  reactions: [{ emoji: String, users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }],
  editedAt: Date
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Comment thread on a task, oldest first.
CommentSchema.index({ task: 1, createdAt: 1 });

export default mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
