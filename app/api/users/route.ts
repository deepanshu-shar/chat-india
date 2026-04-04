import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    // Token verify karo
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json({ message: "Login karo pehle" }, { status: 401 });
    }

    const verified = await verifyToken(token) as any;
    if (!verified) {
      return Response.json({ message: "Token galat hai" }, { status: 401 });
    }

    // Search query lo URL se
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    await connectDB();

    // Apne aap ko chod ke baaki users dhundo
    const users = await User.find({
      _id: { $ne: verified.id },
      name: { $regex: search, $options: "i" },
    }).select("name email avatar isOnline");

    return Response.json({ users });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}