import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// Messages lo
export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json({ message: "Login karo pehle" }, { status: 401 });
    }

    const verified = await verifyToken(token) as any;
    if (!verified) {
      return Response.json({ message: "Token galat hai" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return Response.json({ message: "ConversationId chahiye" }, { status: 400 });
    }

    await connectDB();

    const messages = await Message.find({ conversationId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    return Response.json({ messages });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}

// Message bhejo
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json({ message: "Login karo pehle" }, { status: 401 });
    }

    const verified = await verifyToken(token) as any;
    if (!verified) {
      return Response.json({ message: "Token galat hai" }, { status: 401 });
    }

    const { conversationId, text } = await request.json();

    if (!conversationId || !text) {
      return Response.json({ message: "ConversationId aur text chahiye" }, { status: 400 });
    }

    await connectDB();

    const message = await Message.create({
      conversationId,
      sender: verified.id,
      text,
      seenBy: [verified.id],
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastMessageTime: new Date(),
    });

    const populatedMessage = await message.populate("sender", "name email");

    return Response.json({ message: populatedMessage }, { status: 201 });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}