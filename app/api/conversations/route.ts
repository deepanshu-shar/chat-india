import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

// Conversation banao ya dhundo
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

    const { participantId } = await request.json();

    await connectDB();

    // Pehle check karo kya conversation pehle se hai
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [verified.id, participantId] },
    });

    // Nahi hai toh nayi banao
    if (!conversation) {
      conversation = await Conversation.create({
        isGroup: false,
        participants: [verified.id, participantId],
      });
    }

    return Response.json({ conversation });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}

// Apni saari conversations lo
export async function GET() {
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

    await connectDB();

    const conversations = await Conversation.find({
      participants: { $in: [verified.id] },
    })
      .populate("participants", "name email isOnline")
      .populate("lastMessage")
      .sort({ lastMessageTime: -1 });

    return Response.json({ conversations });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}