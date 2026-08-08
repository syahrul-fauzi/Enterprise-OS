import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LocationFilter } from "./location-filter";

describe("LocationFilter", () => {
  const mockOnChange = vi.fn();
  const locations = ["Jakarta", "Bandung", "Surabaya"];

  it("renders correctly with default placeholder", () => {
    render(
      <LocationFilter
        selectedLocation={null}
        onLocationChange={mockOnChange}
        availableLocations={locations}
      />
    );
    
    expect(screen.getByText("Filter Lokasi")).toBeInTheDocument();
  });

  it("opens dropdown when clicked and shows all locations", async () => {
    render(
      <LocationFilter
        selectedLocation={null}
        onLocationChange={mockOnChange}
        availableLocations={locations}
      />
    );
    
    fireEvent.click(screen.getByText("Filter Lokasi"));
    
    expect(await screen.findByText("Semua Lokasi")).toBeInTheDocument();
    locations.forEach(location => {
      expect(screen.getByText(location)).toBeInTheDocument();
    });
  });

  it("calls onLocationChange when location is selected", async () => {
    render(
      <LocationFilter
        selectedLocation={null}
        onLocationChange={mockOnChange}
        availableLocations={locations}
      />
    );
    
    fireEvent.click(screen.getByText("Filter Lokasi"));
    fireEvent.click(await screen.findByText("Jakarta"));
    
    expect(mockOnChange).toHaveBeenCalledWith("Jakarta");
  });

  it("resets to all locations when 'Semua Lokasi' is clicked", async () => {
    render(
      <LocationFilter
        selectedLocation="Jakarta"
        onLocationChange={mockOnChange}
        availableLocations={locations}
      />
    );
    
    fireEvent.click(screen.getByText("Jakarta"));
    fireEvent.click(await screen.findByText("Semua Lokasi"));
    
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });
});