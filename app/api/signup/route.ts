import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    // Sab fields hain?
    if (!name || !email || !password) {
      return Response.json(
        { message: "Sab fields bharo" },
        { status: 400 }
      );
    }

    await connectDB();

    // Pehle check karo email already registered toh nahi
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.json(
        { message: "Email already registered hai" },
        { status: 400 }
      );
    }

    // Password hash karo
    const hashedPassword = await bcrypt.hash(password, 10);

    // User banao
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return Response.json(
      { message: "Account ban gaya! ✅", user: newUser },
      { status: 201 }
    );

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}