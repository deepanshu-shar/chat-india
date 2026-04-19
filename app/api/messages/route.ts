// app/api/messages/route.ts
//
// CHANGES FROM ORIGINAL:
// - body.text → body.encryptedContent + body.nonce
//
// Server ko decrypt nahi karna — sirf store aur forward karna hai.
// Isliye ye API bahut simple hai: jo aaya, wo save karo.
//
// POST /api/messages → message save karo
// GET  /api/messages?conversationId=xxx → messages fetch karo (encrypted)

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

// ── GET: Conversation ke saare messages fetch karo ────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await jwtVerify(token, JWT_SECRET);
    await connectDB();

    const conversationId = req.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    // Messages fetch karo — encrypted content as-is return karenge
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar')
      .lean();

    // Response mein encryptedContent aur nonce dono hain
    // Client ko decrypt karna hoga — server nahi karega
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ── POST: Naya message save karo ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const senderId = payload.id as string;

    await connectDB();

    const body = await req.json();
    const { conversationId, encryptedContent, nonce } = body;

    // ── VALIDATION ────────────────────────────────────────────────
    if (!conversationId || !encryptedContent || !nonce) {
      return NextResponse.json(
        { error: 'conversationId, encryptedContent aur nonce required hain' },
        { status: 400 }
      );
    }

    // ── MESSAGE SAVE ──────────────────────────────────────────────
    // Server sirf encrypted blob save karta hai — plain text kabhi nahi dekha
    const message = await Message.create({
      conversationId,
      sender: senderId,
      encryptedContent, // ChaCha20 encrypted (Base64)
      nonce,            // Random nonce (Base64)
      seenBy: [senderId],
    });

    // ── CONVERSATION LAST MESSAGE UPDATE ──────────────────────────
    // lastMessage mein bhi encrypted content save karo
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageTime: new Date(),
    });

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar')
      .lean();

    return NextResponse.json({ message: populatedMessage }, { status: 201 });
  } catch (error) {
    console.error('Message save error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
