// app/api/users/[userId]/public-key/route.ts
//
// YE API KYA KARTI HAI:
// Kisi bhi user ki public key fetch karo.
// Jab A, B se pehli baar chat kare → A ko B ki public key chahiye
// Taaki A apni private key + B ki public key se shared secret compute kare.
//
// Ye public info hai — koi bhi logged-in user kisi ki bhi public key dekh sakta hai.
// Private key kabhi yahan se nahi aayegi.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // ── AUTH CHECK ────────────────────────────────────────────────
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Login karo pehle' }, { status: 401 });
    }

    await jwtVerify(token, JWT_SECRET);
    await connectDB();

    // ── AWAIT PARAMS (Next.js 16 requirement) ────────────────────
    const { userId } = await params;

    // ── FETCH USER ────────────────────────────────────────────────
    // Sirf publicKey field chahiye — baaki sensitive info mat bhejo
    const user = await User.findById(userId).select('publicKey name');

    if (!user) {
      return NextResponse.json({ error: 'User nahi mila' }, { status: 404 });
    }

    if (!user.publicKey) {
      return NextResponse.json(
        { error: 'Is user ne E2EE setup nahi kiya' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: userId,
      name: user.name,
      publicKey: user.publicKey, // Base64 string
    });
  } catch (error) {
    console.error('Public key fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
