import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerificationProofPanel } from "../experience/components/VerificationProofPanel.js";

// Mock fetch to prevent actual API calls in tests
global.fetch = vi.fn(() => 
  Promise.resolve({
    ok: false,
    json: () => Promise.resolve({}),
  } as Response)
);

describe("VerificationProofPanel", () => {
  it("renders requirement title correctly (uses static fallback)", async () => {
    render(<VerificationProofPanel requirementId="req-011" />);
    
    // Wait for static fallback data to load
    const titleElement = await screen.findByText("REQ-011: Visible Proof Panel Implementation");
    expect(titleElement).toBeInTheDocument();
  });

  it("displays requirement summary correctly", async () => {
    render(<VerificationProofPanel requirementId="req-011" />);
    
    const summaryElement = await screen.findByText(/Membuat panel bukti yang menampilkan traceability/);
    expect(summaryElement).toBeInTheDocument();
  });

  it("verifies all 6 core verification questions are rendered in the component", async () => {
    render(<VerificationProofPanel requirementId="req-011" />);
    
    // These are the actual 6 verification questions implemented in the component
    expect(await screen.findByText("Apa yang diminta?")).toBeInTheDocument();
    expect(await screen.findByText("Di mana requirement tersebut ditrace?")).toBeInTheDocument();
    expect(await screen.findByText("Implementasinya apa?")).toBeInTheDocument();
    expect(await screen.findByText("Evidence-nya apa?")).toBeInTheDocument();
    expect(await screen.findByText("Verdict-nya apa?")).toBeInTheDocument();
    expect(await screen.findByText("Apakah requirement tersebut benar-benar proven?")).toBeInTheDocument();
  });

  it("shows isStaticData indicator when using fallback data", async () => {
    render(<VerificationProofPanel requirementId="req-011" />);
    
    const staticIndicator = await screen.findByText(/Static fallback data/);
    expect(staticIndicator).toBeInTheDocument();
  });
});