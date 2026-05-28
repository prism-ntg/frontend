import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chatMessage } from '@/db/schema';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, message } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: 'User ID and message are required' },
        { status: 400 }
      );
    }

    const parsedUserId = parseInt(userId);
    if (isNaN(parsedUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    await db.insert(chatMessage).values({
      userId: parsedUserId,
      sender: 'user',
      message: message,
    });

    const nlpApiUrl = process.env.AI_API_URL;
    
    const nlpResponse = await fetch(`${nlpApiUrl}/chat`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pertanyaan: message }),
    });

    if (!nlpResponse.ok) {
      throw new Error(`NLP API responded with status: ${nlpResponse.status}`);
    }

    const nlpData = await nlpResponse.json();
    
    const botResponseText = nlpData.ai_response;
    const generatedPdfUrl = nlpData.pdf_url || nlpData.url || nlpData.pdf || null;

    const [aiMessageResult] = await db.insert(chatMessage).values({
      userId: parsedUserId,
      sender: 'ai',
      message: botResponseText,
      url: generatedPdfUrl,
    });

    const newAiMessage = await db.query.chatMessage.findFirst({
      where: (fields, { eq }) => eq(fields.id, aiMessageResult.insertId),
    });

    return NextResponse.json(
      { 
        message: 'Successfully processed chat', 
        data: newAiMessage || {
          userId: parsedUserId,
          sender: 'ai',
          message: botResponseText,
          url: generatedPdfUrl
        }
      }, 
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat' },
      { status: 500 }
    );
  }
}
