"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Card, 
  Input, 
  TextArea, 
  Button,
  ErrorState
} from "@repo/presentation-ui-system";
import { Loader2 } from "lucide-react";
import type { NewWorkFormClientProps } from "./types";

export function NewWorkFormClient({
  intent,
  intentId,
  handleWorkCreation,
}: NewWorkFormClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    objective: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await handleWorkCreation({
        ...formData,
        intentId,
      });
      
      if (result?.workId) {
        router.push(`/work/${result.workId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat membuat pekerjaan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-surface-background px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mx-auto max-w-3xl">
          {error && <ErrorState title="Gagal membuat pekerjaan" description={error} />}
          
          <Card className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-text-primary mb-6">
              {intent ? `Mulai Pekerjaan: ${intent.title}` : "Buat Pekerjaan Baru"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                id="title"
                name="title"
                label="Judul Pekerjaan"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Masukkan judul yang jelas dan spesifik..."
                className="w-full"
              />

              <TextArea
                id="objective"
                name="objective"
                label="Tujuan Utama"
                rows={3}
                required
                value={formData.objective}
                onChange={(e) => setFormData({...formData, objective: e.target.value})}
                placeholder="Apa tujuan utama dari pekerjaan ini? Apa yang ingin dicapai?"
                className="w-full resize-none"
              />

              <TextArea
                id="description"
                name="description"
                label="Deskripsi / Konteks Tambahan"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Tambahkan informasi tambahan, dokumen yang tersedia, atau hal lain yang relevan..."
                className="w-full resize-none"
              />

              <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row gap-4 justify-end">
                <Link href="/work">
                  <Button intent="secondary" variant="outline" size="lg" className="w-full sm:w-auto">
                    Batal
                  </Button>
                </Link>
                <Button
                  type="submit"
                  intent="primary"
                  variant="solid"
                  size="lg"
                  disabled={isSubmitting}
                  className="px-6 py-3 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                  {isSubmitting ? "Membuat Pekerjaan..." : "Buat Pekerjaan"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}