import connectDB from "@/lib/mongodb";
import Message from "@/models/Message";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

    const { conversationId } = await request.json();

    await connectDB();

    // Saare unseen messages seen mark karo
    await Message.updateMany(
      {
        conversationId,
        seenBy: { $nin: [verified.id] },
        sender: { $ne: verified.id },
      },
      {
        $addToSet: { seenBy: verified.id },
      }
    );

    return Response.json({ message: "Seen ho gaya ✅" });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}