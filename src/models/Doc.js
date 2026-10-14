import mongoose from 'mongoose';

const DocSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Docs of a project in their manual ordering.
DocSchema.index({ project: 1, order: 1 });

export default mongoose.models.Doc || mongoose.model('Doc', DocSchema);
