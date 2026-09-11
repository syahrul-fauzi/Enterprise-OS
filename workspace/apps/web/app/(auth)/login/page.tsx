import { redirect } from "next/navigation";

export default function LoginPage() {
  // Redirect ke /enter untuk menghindari duplicate login page,
  // tapi tetap mempertahankan route /login sebagai standard auth gate
  redirect("/enter");
}