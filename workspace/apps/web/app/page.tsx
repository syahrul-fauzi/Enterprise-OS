import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export default function RootPage() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

  if (sessionCookie?.value) {
    try {
      // Coba decode untuk memastikan cookie valid
      decodeWorkspaceSession(sessionCookie.value);
      // Jika berhasil, redirect ke home page terotentikasi
      redirect("/my-reality");
    } catch (e) {
      // Jika decode gagal (cookie tidak valid), redirect ke login
      redirect("/login");
    }
  }

  // Jika tidak ada cookie, redirect ke login
  redirect("/login");
}