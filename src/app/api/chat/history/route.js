import dbConnect from '@/lib/db';
import { getSession } from '@/lib/auth';
import ChatConversation from '@/models/ChatConversation';

// GET — Load chat history (scoped to org)
export async function GET(req) {
  try {
    const session = await getSession(req);
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    await dbConnect();

    const query = { userId: session.userId };
    if (orgId) query.orgId = orgId;

    const conversation = await ChatConversation.findOne(query)
      .sort({ updatedAt: -1 })
      .lean();

    if (!conversation) {
      return Response.json({ messages: [] });
    }

    return Response.json({ 
      conversationId: conversation._id,
      messages: conversation.messages || [],
    });
  } catch (error) {
    console.error('Chat history error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// DELETE — Clear chat history (scoped to org)
export async function DELETE(req) {
  try {
    const session = await getSession(req);
    if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    await dbConnect();

    const query = { userId: session.userId };
    if (orgId) query.orgId = orgId;

    await ChatConversation.deleteMany(query);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Chat clear error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
