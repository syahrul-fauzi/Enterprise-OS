"use client";
import React, { useState } from "react";

export interface LocationFilterProps {
  readonly selectedLocation: string | null;
  readonly onLocationChange: (location: string | null) => void;
  readonly availableLocations: readonly string[];
}

export function LocationFilter({ 
  selectedLocation, 
  onLocationChange, 
  availableLocations 
}: LocationFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 text-sm font-medium"
      >
        {selectedLocation || "Filter Lokasi"}
      </button>
      
      {isOpen && (
        <div className="absolute top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
          <button
            onClick={() => { onLocationChange(null); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
          >
            Semua Lokasi
          </button>
          {availableLocations.map((location) => (
            <button
              key={location}
              onClick={() => { onLocationChange(location); setIsOpen(false); }}
              className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-sm ${
                selectedLocation === location ? "bg-blue-50 text-blue-700" : ""
              }`}
            >
              {location}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}