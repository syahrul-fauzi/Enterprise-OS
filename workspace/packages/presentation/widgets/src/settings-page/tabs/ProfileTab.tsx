"use client";

import React from "react";
// Remove direct capability import to fix rootDir violation - queries are resolved server-side
// import { userQueries } from "../../../../../../capabilities/identity/implementation/queries/user.queries";

interface ProfileTabProps {
  readonly session: {
    readonly userId: string;
    readonly actorId: string;
  };
  readonly isSaving: boolean;
  readonly setIsSaving: (value: boolean) => void;
  readonly setSaveSuccess: (message: string | null) => void;
}

export function ProfileTab({ session, isSaving, setIsSaving, setSaveSuccess }: ProfileTabProps) {
  const [profile, setProfile] = React.useState<{
    displayName: string;
    email: string;
  } | null>(null);
  const [formData, setFormData] = React.useState({
    displayName: "",
  });

  // Load user profile on mount
  React.useEffect(() => {
    async function loadProfile() {
      try {
        const user = await userQueries.byId(session.userId);
        if (user) {
          setProfile(user);
          setFormData({ displayName: user.displayName });
        }
      } catch (err) {
        console.error("[ProfileTab] Failed to load profile:", err);
      }
    }
    if (session.userId) loadProfile();
  }, [session.userId]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    try {
      // Use existing identity capability's user repository to save changes
      const response = await fetch("/api/identity/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: "profile",
          displayName: formData.displayName,
        }),
      });

      if (response.ok) {
        setSaveSuccess("Profile updated successfully!");
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (err) {
      console.error("[ProfileTab] Update error:", err);
      setSaveSuccess("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="py-12 text-center text-slate-500">
        Loading profile...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          value={profile.email}
          disabled
          className="mt-1 block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}