import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { createToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { message: "Email aur password dono bharo" },
        { status: 400 }
      );
    }

    await connectDB();

    // User dhundo
    const user = await User.findOne({ email });
    if (!user) {
      return Response.json(
        { message: "Email registered nahi hai" },
        { status: 400 }
      );
    }

    // Password check karo
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return Response.json(
        { message: "Password galat hai" },
        { status: 400 }
      );
    }

    // Token banao
    const token = await createToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    // Cookie me save karo
    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7, // 7 din
    });

    return Response.json({
      message: "Login ho gaya! ✅",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}