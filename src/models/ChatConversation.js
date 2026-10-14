import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
  content: { type: String, default: '' },
  parts: { type: mongoose.Schema.Types.Mixed }, // Store AI SDK v6 parts (text, tool-invocation, etc.)
}, { _id: false });

const ChatConversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  messages: [ChatMessageSchema],
  title: { type: String, default: 'New Conversation' },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Index for quick lookup — one active conversation per user
ChatConversationSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.ChatConversation || mongoose.model('ChatConversation', ChatConversationSchema);
