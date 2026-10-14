import mongoose from 'mongoose';

const OrganizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  plan: { type: String, enum: ['free', 'pro', 'team', 'enterprise'], default: 'free' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'manager', 'member', 'guest'], default: 'member' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active' }
  }],
  pendingInvites: [{
    email: String,
    role: String,
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    token: String,
    expiresAt: Date,
    projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    projectRole: { type: String, default: 'member' },
    invitedAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now }
  }],
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  limits: {
    maxProjects: { type: Number, default: 2 },
    maxMembers: { type: Number, default: 3 },
    maxStorage: { type: Number, default: 1073741824 }, // 1GB in bytes
    aiCallsPerMonth: { type: Number, default: 50 }
  },
  settings: {
    defaultProjectRole: { type: String, default: 'member' },
    allowMemberInvites: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: false }
  }
}, { timestamps: true });

export default mongoose.models.Organization || mongoose.model('Organization', OrganizationSchema);
