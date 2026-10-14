import mongoose from 'mongoose';

const MemoryFactSchema = new mongoose.Schema({
  fact: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['preference', 'decision', 'context', 'task_pattern'], 
    default: 'context' 
  },
  importance: { 
    type: String, 
    enum: ['high', 'medium', 'low'], 
    default: 'medium' 
  },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const ChatMemorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  memories: [MemoryFactSchema],
  summary: { type: String, default: '' },
  lastCompressedAt: { type: Date },
  compressionCount: { type: Number, default: 0 },
}, { timestamps: true });

// One memory store per user per org
ChatMemorySchema.index({ userId: 1, orgId: 1 }, { unique: true });

export default mongoose.models.ChatMemory || mongoose.model('ChatMemory', ChatMemorySchema);
