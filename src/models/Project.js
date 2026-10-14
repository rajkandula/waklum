import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  slug: { type: String, required: true },
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  status: { type: String, enum: ['active', 'on-hold', 'completed', 'archived'], default: 'active' },
  visibility: { type: String, enum: ['private', 'team', 'public'], default: 'team' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now }
  }],
  tags: [String],
  color: String,
  icon: String,
  columns: [{
    id: String,
    name: String,
    color: String,
    order: Number
  }],
  files: [{
    name: String,
    url: String,
    key: String,
    size: Number,
    type: { type: String },
    isFolder: { type: Boolean, default: false },
    folder: { type: String, default: '/' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Project list for an organization, newest first.
ProjectSchema.index({ organization: 1, createdAt: -1 });
// "Which projects can this user see?" — array field on the members subdocument.
ProjectSchema.index({ 'members.user': 1 });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
