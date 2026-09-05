import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  readWorkspaceSessionFromRequest,
} from "@repo/core-kernel";
import { getUserRepositoryPostgres, initIdentitySchema } from "@repo/capabilities-identity/repositories";
import { UserId } from "@repo/capabilities-identity/implementation/contracts/identity.contracts";
import { passwordService } from "@repo/capabilities-identity/implementation/services/password.service";

// Initialize schema once at route load
initIdentitySchema().catch(err => console.error("[user/update] Failed to init identity schema:", err));
const userRepository = getUserRepositoryPostgres();

// Validation schema for profile updates
const UpdateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
});

// Validation schema for password changes
const UpdateUserPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function PATCH(request: Request) {
  try {
    // Read session from request to authenticate caller
    const requestSession = readWorkspaceSessionFromRequest(request);
    if (!requestSession?.sessionId || !requestSession?.userId) {
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { updateType } = body;

    // Get the current user from database
    const currentUser = await userRepository.byId(UserId(requestSession.userId));
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Handle profile updates (displayName, email)
    if (updateType === "profile") {
      const profileData = UpdateUserProfileSchema.parse(body);
      
      // Update only provided fields
      const updatedUser = {
        ...currentUser,
        ...(profileData.displayName && { displayName: profileData.displayName }),
        ...(profileData.email && { email: profileData.email }),
        updatedAt: new Date(),
      };

      await userRepository.save(updatedUser);

      return NextResponse.json({
        ok: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          displayName: updatedUser.displayName,
          updatedAt: updatedUser.updatedAt,
        }
      }, { status: 200 });
    }

    // Handle password changes
    if (updateType === "password") {
      const passwordData = UpdateUserPasswordSchema.parse(body);

      // Verify current password
      const isPasswordValid = await passwordService.verify(
        currentUser.passwordHash,
        passwordData.currentPassword
      );

      if (!isPasswordValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      // Hash new password
      const newPasswordHash = await passwordService.hash(passwordData.newPassword);
      
      // Update user with new password
      const updatedUser = {
        ...currentUser,
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      };

      await userRepository.save(updatedUser);

      return NextResponse.json({
        ok: true,
        message: "Password updated successfully"
      }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid updateType" }, { status: 400 });

  } catch (error) {
    console.error("[PATCH /api/identity/user/update] Error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        ok: false,
        error: "Invalid request data",
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: false,
      error: "Failed to update user profile",
    }, { status: 500 });
  }
}