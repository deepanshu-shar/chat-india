import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

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

    return Response.json({
      user: {
        id: verified.id,
        name: verified.name,
        email: verified.email,
      }
    });

  } catch (error: any) {
    return Response.json(
      { message: "Kuch gadbad ho gayi", error: error.message },
      { status: 500 }
    );
  }
}