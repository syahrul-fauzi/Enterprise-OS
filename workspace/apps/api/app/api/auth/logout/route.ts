import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { WORKSPACE_SESSION_COOKIE } from "@repo/core-kernel";

export async function POST() {
  try {
    // Clear the session cookie
    cookies().delete(WORKSPACE_SESSION_COOKIE);

    return NextResponse.json({
      success: true,
      message: "Logout successful",
    }, { status: 200 });

  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({
      success: false,
      message: "An unexpected error occurred during logout.",
    }, { status: 500 });
  }
}