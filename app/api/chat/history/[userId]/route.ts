import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessage } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.userId);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const history = await db.query.chatMessage.findMany({
      where: eq(chatMessage.userId, userId),
      orderBy: [asc(chatMessage.timestamp)],
    });

    return NextResponse.json({ data: history }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.userId);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await db.delete(chatMessage).where(eq(chatMessage.userId, userId));

    return NextResponse.json(
      { message: 'Chat history deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting chat history:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat history' },
      { status: 500 }
    );
  }
}
