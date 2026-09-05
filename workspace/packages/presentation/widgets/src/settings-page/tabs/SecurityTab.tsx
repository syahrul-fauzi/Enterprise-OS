"use client";

import React from "react";

interface SecurityTabProps {
  readonly session: {
    readonly userId: string;
    readonly actorId: string;
  };
  readonly isSaving: boolean;
  readonly setIsSaving: (value: boolean) => void;
  readonly setSaveSuccess: (message: string | null) => void;
}

export function SecurityTab({ session, isSaving, setIsSaving, setSaveSuccess }: SecurityTabProps) {
  const [formData, setFormData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = React.useState(false);

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      setSaveSuccess("New passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/identity/user/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateType: "password",
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      if (response.ok) {
        setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setSaveSuccess("Password updated successfully!");
      } else {
        throw new Error("Failed to update password");
      }
    } catch (err) {
      console.error("[SecurityTab] Password update error:", err);
      setSaveSuccess("Failed to update password. Please check your current password.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle two-factor authentication
  const handleToggleTwoFactor = async () => {
    const newValue = !twoFactorEnabled;
    setIsSaving(true);
    try {
      const response = await fetch("/api/identity/security/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.userId,
          enabled: newValue,
        }),
      });

      if (response.ok) {
        setTwoFactorEnabled(newValue);
        setSaveSuccess(`Two-factor authentication ${newValue ? "enabled" : "disabled"} successfully!`);
      } else {
        throw new Error("Failed to update 2FA setting");
      }
    } catch (err) {
      console.error("[SecurityTab] 2FA update error:", err);
      setSaveSuccess("Failed to update two-factor authentication setting.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Two-factor authentication */}
      <div>
        <h3 className="text-lg font-medium text-slate-900">Two-Factor Authentication</h3>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div>
            <p className="font-medium text-slate-900">Require 2FA for login</p>
            <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
          </div>
          <button
            onClick={handleToggleTwoFactor}
            disabled={isSaving}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              twoFactorEnabled ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                twoFactorEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Password change */}
      <div>
        <h3 className="text-lg font-medium text-slate-900">Change Password</h3>
        <form onSubmit={handlePasswordChange} className="mt-4 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}