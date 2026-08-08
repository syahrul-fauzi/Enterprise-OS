"use client";
import React, { useState, useMemo } from "react";
import { BaseSearchBar } from "@repo/ui-components";
import { LocationFilter } from "./location-filter";

interface CommunityMember {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly role: string;
  readonly avatar: string;
}

const MOCK_MEMBERS: readonly CommunityMember[] = [
  { id: "1", name: "Andi Pratama", location: "Jakarta", role: "Developer", avatar: "" },
  { id: "2", name: "Budi Santoso", location: "Bandung", role: "Designer", avatar: "" },
  { id: "3", name: "Citra Lestari", location: "Surabaya", role: "Product Manager", avatar: "" },
  { id: "4", name: "Dedi Wijaya", location: "Jakarta", role: "Engineer", avatar: "" },
  { id: "5", name: "Eka Putra", location: "Yogyakarta", role: "Researcher", avatar: "" },
];

export function CommunityPage() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const availableLocations = useMemo(() => {
    const locations = [...new Set(MOCK_MEMBERS.map(m => m.location))];
    return locations.sort();
  }, []);

  const filteredMembers = useMemo(() => {
    return MOCK_MEMBERS.filter(member => {
      const matchesLocation = !selectedLocation || member.location === selectedLocation;
      const matchesSearch = !searchQuery || 
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.role.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesLocation && matchesSearch;
    });
  }, [selectedLocation, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Komunitas EOS</h1>
        <p className="text-gray-600">Jelajahi anggota komunitas berdasarkan lokasi dan minat</p>
      </header>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <BaseSearchBar 
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari anggota komunitas..."
          className="flex-1 min-w-[300px]"
        />
        <LocationFilter
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          availableLocations={availableLocations}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <div key={member.id} className="border rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-gray-600">{member.role}</p>
                <p className="text-xs text-gray-500 mt-1">📍 {member.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada anggota yang cocok dengan filter yang dipilih.
        </div>
      )}

      <footer className="mt-8 pt-4 border-t text-sm text-gray-500">
        Total {filteredMembers.length} dari {MOCK_MEMBERS.length} anggota ditampilkan
      </footer>
    </div>
  );
}