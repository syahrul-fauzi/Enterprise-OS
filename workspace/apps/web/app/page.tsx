// Kembalikan ke konfigurasi asli yang work: redirect root ke /my-reality SEKALI SAJA
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Hanya redirect SEKALI dari root, tidak ada redirect balik dari /my-reality ke /
  redirect("/my-reality");
}