import { NextResponse } from "next/server";

// NextAuth has been removed. Auth is handled by Clerk.
export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
