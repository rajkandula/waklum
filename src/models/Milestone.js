import mongoose from 'mongoose';

const MilestoneSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  description: String,
  dueDate: Date,
  status: { type: String, enum: ['open', 'in-progress', 'completed'], default: 'open' },
  progress: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.Milestone || mongoose.model('Milestone', MilestoneSchema);
