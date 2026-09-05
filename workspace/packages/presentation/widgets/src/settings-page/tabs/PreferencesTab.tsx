"use client";

import React from "react";

interface PreferencesTabProps {
  readonly session: {
    readonly userId: string;
    readonly actorId: string;
  };
  readonly isSaving: boolean;
  readonly setIsSaving: (value: boolean) => void;
  readonly setSaveSuccess: (message: string | null) => void;
}

interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  compactMode: boolean;
}

export function PreferencesTab({ session, isSaving, setIsSaving, setSaveSuccess }: PreferencesTabProps) {
  const [preferences, setPreferences] = React.useState<UserPreferences>({
    theme: "system",
    language: "en",
    timezone: "Asia/Jakarta",
    compactMode: false,
  });

  // Load preferences on mount
  React.useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch(`/api/identity/preferences/${session.userId}`);
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
        }
      } catch (err) {
        console.error("[PreferencesTab] Failed to load preferences:", err);
      }
    }
    if (session.userId) loadPreferences();
  }, [session.userId]);

  // Save preferences
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/identity/preferences/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          ...preferences,
        }),
      });

      if (response.ok) {
        setSaveSuccess("Preferences saved successfully!");
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (err) {
      console.error("[PreferencesTab] Save error:", err);
      setSaveSuccess("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setSaveSuccess(null);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-600">
        Customize your workspace preferences. These settings apply across all products you access.
      </p>

      <div>
        <label htmlFor="theme" className="block text-sm font-medium text-slate-700">
          Theme
        </label>
        <select
          id="theme"
          value={preferences.theme}
          onChange={(e) => handleChange("theme", e.target.value as UserPreferences["theme"])}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System Default</option>
        </select>
      </div>

      <div>
        <label htmlFor="language" className="block text-sm font-medium text-slate-700">
          Language
        </label>
        <select
          id="language"
          value={preferences.language}
          onChange={(e) => handleChange("language", e.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        >
          <option value="en">English</option>
          <option value="id">Bahasa Indonesia</option>
        </select>
      </div>

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-slate-700">
          Timezone
        </label>
        <select
          id="timezone"
          value={preferences.timezone}
          onChange={(e) => handleChange("timezone", e.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        >
          <option value="Asia/Jakarta">Western Indonesia Time (WIB) - Jakarta</option>
          <option value="Asia/Makassar">Central Indonesia Time (WITA) - Makassar</option>
          <option value="Asia/Jayapura">Eastern Indonesia Time (WIT) - Jayapura</option>
        </select>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
        <div>
          <p className="font-medium text-slate-900">Compact Mode</p>
          <p className="text-sm text-slate-500">Reduce spacing to display more content</p>
        </div>
        <button
          onClick={() => handleChange("compactMode", !preferences.compactMode)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            preferences.compactMode ? "bg-blue-600" : "bg-slate-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              preferences.compactMode ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}