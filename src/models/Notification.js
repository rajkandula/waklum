import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: [
      'task_assigned', 
      'task_updated', 
      'task_due_soon',
      'comment_added', 
      'comment_mentioned',
      'invite_received',
      'workspace_invite',
      'invite_accepted',
      'member_joined',
      'member_removed',
      'project_created',
      'project_added',
    ], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  link: String, // URL to navigate to when clicked
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: String,
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    taskTitle: String,
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    orgName: String,
    inviteRole: String,
    inviteToken: String,
  },
}, { timestamps: true });

// Index for efficient queries
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
