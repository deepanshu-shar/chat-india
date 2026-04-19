// app/api/auth/my-encrypted-key/route.ts
//
// YE API KYA KARTI HAI:
// Logged-in user apna encrypted private key fetch kare.
// Kab use hoti hai? Naye device pe login ke baad:
// 1. Login karo → JWT token mile
// 2. Ye API call karo → encrypted private key aaye
// 3. User apna PIN daale
// 4. Browser mein decrypt karo → private key wapas
// 5. IndexedDB mein save karo → ab messages decrypt ho sakte hain
//
// SECURITY: Sirf apna key fetch kar sakte ho, dusre ka nahi.
// JWT token se userId nikala jaata hai — koi spoofing nahi.

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function GET(req: NextRequest) {
  try {
    // ── AUTH CHECK ────────────────────────────────────────────────
    const token = req.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Login karo pehle' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    await connectDB();

    // ── FETCH ONLY OWN KEY ────────────────────────────────────────
    const user = await User.findById(userId).select('encryptedPrivateKey publicKey');

    if (!user) {
      return NextResponse.json({ error: 'User nahi mila' }, { status: 404 });
    }

    if (!user.encryptedPrivateKey) {
      return NextResponse.json(
        { error: 'E2EE keys nahi hain — registration se setup karo' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      encryptedPrivateKey: user.encryptedPrivateKey, // PIN-encrypted blob
      publicKey: user.publicKey,                     // Apni public key bhi bhejo
    });
  } catch (error) {
    console.error('Encrypted key fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
