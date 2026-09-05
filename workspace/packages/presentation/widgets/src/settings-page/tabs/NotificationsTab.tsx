"use client";

import React from "react";

interface NotificationsTabProps {
  readonly session: {
    readonly userId: string;
    readonly actorId: string;
  };
  readonly isSaving: boolean;
  readonly setIsSaving: (value: boolean) => void;
  readonly setSaveSuccess: (message: string | null) => void;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  workAssigned: boolean;
  workUpdated: boolean;
  comments: boolean;
  weeklyDigest: boolean;
}

export function NotificationsTab({ session, isSaving, setIsSaving, setSaveSuccess }: NotificationsTabProps) {
  const [settings, setSettings] = React.useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    workAssigned: true,
    workUpdated: true,
    comments: true,
    weeklyDigest: false,
  });

  // Load notification settings on mount
  React.useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(`/api/identity/notifications/${session.userId}`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (err) {
        console.error("[NotificationsTab] Failed to load settings:", err);
      }
    }
    if (session.userId) loadSettings();
  }, [session.userId]);

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/identity/notifications/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          ...settings,
        }),
      });

      if (response.ok) {
        setSaveSuccess("Notification settings saved successfully!");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (err) {
      console.error("[NotificationsTab] Save error:", err);
      setSaveSuccess("Failed to save notification settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setSaveSuccess(null);
  };

  const notificationItems = [
    {
      id: "emailNotifications",
      title: "Email Notifications",
      description: "Receive notifications via email",
      enabled: settings.emailNotifications,
    },
    {
      id: "pushNotifications",
      title: "Push Notifications",
      description: "Receive browser push notifications",
      enabled: settings.pushNotifications,
    },
    {
      id: "workAssigned",
      title: "Work Assigned",
      description: "Get notified when new work is assigned to you",
      enabled: settings.workAssigned,
    },
    {
      id: "workUpdated",
      title: "Work Updated",
      description: "Get notified when work you're involved with is updated",
      enabled: settings.workUpdated,
    },
    {
      id: "comments",
      title: "Comments",
      description: "Get notified when someone comments on your work",
      enabled: settings.comments,
    },
    {
      id: "weeklyDigest",
      title: "Weekly Digest",
      description: "Receive a weekly summary of your activity",
      enabled: settings.weeklyDigest,
    },
  ] as const;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Configure how and when you receive notifications across all platforms.
      </p>

      <div className="mt-6 space-y-3">
        {notificationItems.map(item => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-500">{item.description}</p>
            </div>
            <button
              onClick={() => handleToggle(item.id as keyof NotificationSettings)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                item.enabled ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  item.enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Notification Settings"}
        </button>
      </div>
    </div>
  );
}