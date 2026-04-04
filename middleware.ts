import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Yeh pages sirf logged out users ke liye
  if (pathname === "/login" || pathname === "/signup") {
    if (token) {
      const verified = await verifyToken(token);
      if (verified) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Yeh pages sirf logged in users ke liye
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const verified = await verifyToken(token);
  if (!verified) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/signup"],
};