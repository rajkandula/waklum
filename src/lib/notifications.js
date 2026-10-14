import dbConnect from './db';
import Notification from '@/models/Notification';

/**
 * Create a notification for a user
 */
export async function createNotification({ recipientId, type, title, message, link, actorId, metadata }) {
  await dbConnect();
  
  // Don't notify yourself
  if (actorId && recipientId && actorId.toString() === recipientId.toString()) {
    return null;
  }

  return Notification.create({
    recipient: recipientId,
    type,
    title,
    message,
    link,
    actor: actorId,
    metadata,
  });
}

/**
 * Create notifications for multiple users
 */
export async function createBulkNotifications(notifications) {
  await dbConnect();
  
  // Filter out self-notifications
  const filtered = notifications.filter(n => {
    if (n.actorId && n.recipientId) {
      return n.actorId.toString() !== n.recipientId.toString();
    }
    return true;
  });

  if (filtered.length === 0) return [];

  return Notification.insertMany(filtered.map(n => ({
    recipient: n.recipientId,
    type: n.type,
    title: n.title,
    message: n.message,
    link: n.link,
    actor: n.actorId,
    metadata: n.metadata,
  })));
}
