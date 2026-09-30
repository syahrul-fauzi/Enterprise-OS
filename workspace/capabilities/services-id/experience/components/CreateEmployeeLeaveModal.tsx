"use client";

import React, { useState, useEffect } from "react";
import { useLocale } from "@repo/presentation-hooks";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

const LEAVE_TYPES = [
  "Tahunan",
  "Sakit",
  "Penting",
  "Lainnya"
] as const;

type LeaveType = typeof LEAVE_TYPES[number];

interface CreateEmployeeLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
}

export function CreateEmployeeLeaveModal({ 
  isOpen, 
  onClose, 
  sessionId,
  tenantId,
  workspaceId,
  actorId
}: CreateEmployeeLeaveModalProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [leaveStartDate, setLeaveStartDate] = useState("");
  const [leaveEndDate, setLeaveEndDate] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("Tahunan");
  const [reason, setReason] = useState("");
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(false);
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  const validateDates = (): boolean => {
    if (!leaveStartDate || !leaveEndDate) {
      setDateError("Tanggal mulai dan selesai harus diisi");
      return false;
    }
    const start = new Date(leaveStartDate);
    const end = new Date(leaveEndDate);
    if (end < start) {
      setDateError("Tanggal selesai harus setelah tanggal mulai");
      return false;
    }
    setDateError("");
    return true;
  };

  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    if (!validateDates()) return;
    
    setLoading(true);
    try {
      await capabilityRegistry.invokeAsync("work-core", "work.create", {
        title,
        description,
        domainType: "employee-leave",
        sessionId,
        tenantId,
        workspaceId,
        actorId,
        domainSpecificData: {
          leaveStartDate,
          leaveEndDate,
          leaveType,
          reason,
        } as Record<string, unknown>,
      });

      setTitle("");
      setDescription("");
      setLeaveStartDate("");
      setLeaveEndDate("");
      setLeaveType("Tahunan");
      setReason("");
      onClose();
      
      window.dispatchEvent(new CustomEvent('employee-leaves:refresh'));
    } catch (err) {
      console.error("[CreateEmployeeLeaveModal] Failed to create leave request:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!localIsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h3 className="text-xl font-bold">Ajukan Cuti Karyawan</h3>
          <p className="text-sm text-slate-500 mt-1">Masukkan data cuti untuk memulai proses persetujuan</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Judul Cuti *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              placeholder="Contoh: Cuti Tahunan Desember 2024"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Deskripsi Tambahan</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition"
              placeholder="Ceritakan detail tambahan mengenai cuti Anda..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Mulai *</label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => {
                  setLeaveStartDate(e.target.value);
                  if (leaveEndDate) validateDates();
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${dateError ? 'border-red-500' : ''}`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Selesai *</label>
              <input
                type="date"
                value={leaveEndDate}
                onChange={(e) => {
                  setLeaveEndDate(e.target.value);
                  if (leaveStartDate) validateDates();
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${dateError ? 'border-red-500' : ''}`}
                required
              />
            </div>
          </div>
          {dateError && <p className="text-red-500 text-sm">{dateError}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Jenis Cuti *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
            >
              {LEAVE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Alasan Tambahan</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] transition"
              placeholder="Alasan tambahan mengenai pengajuan cuti (maksimal 500 karakter)"
              maxLength={500}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Mengajukan..." : "Ajukan Cuti"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}