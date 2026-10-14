import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { type: String, enum: ['backlog', 'todo', 'in-progress', 'review', 'done'], default: 'todo' },
  priority: { type: String, enum: ['urgent', 'high', 'medium', 'low'], default: 'medium' },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  labels: [String],
  dueDate: Date,
  startDate: Date,
  estimatedHours: Number,
  loggedHours: Number,
  columnId: String,
  order: Number,
  subtasks: [{
    title: String,
    completed: { type: Boolean, default: false }
  }],
  attachments: [{
    name: { type: String },
    url: { type: String },
    size: { type: Number },
    fileType: { type: String },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  linkedDocs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doc' }],
  milestone: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
// Built on first use (autoIndex), or up front with `npm run db:indexes`.

// Board and list views: every task in a project, in column order.
// Serves `.sort({ order: 1, createdAt: -1 })`.
TaskSchema.index({ project: 1, order: 1, createdAt: -1 });
// Per-column reads and status counts on the dashboard.
TaskSchema.index({ project: 1, status: 1 });
// "My tasks" across projects, ordered by deadline.
TaskSchema.index({ assignee: 1, dueDate: 1 });
// Multi-assignee lookups (array field).
TaskSchema.index({ assignees: 1 });

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
