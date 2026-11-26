import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AiConciergeWidget from "@/components/ai/AiConciergeWidget";
import { useShop } from "@/context/ShopContext";
import { useActivity } from "@/context/ActivityContext";
import { useAiConcierge } from "@/context/AiConciergeContext";

jest.mock("@/context/ShopContext", () => ({ useShop: jest.fn() }));
jest.mock("@/context/ActivityContext", () => ({ useActivity: jest.fn() }));
jest.mock("@/context/AiConciergeContext", () => ({ useAiConcierge: jest.fn() }));

// jsdom doesn't implement scrollIntoView natively
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

function setupMocks({ isAdmin = false, authLoading = false, isOpen = false, currentPath = "/" } = {}) {
  const sendMessage = jest.fn().mockResolvedValue();
  const setIsOpen = jest.fn();

  useShop.mockReturnValue({ isAdmin, authLoading, isBagOpen: false });
  useActivity.mockReturnValue({
    consent: { decided: true },
    consentLoaded: true,
    isPreferencesOpen: false,
  });
  useAiConcierge.mockReturnValue({
    currentPath,
    isOpen,
    setIsOpen,
    isBusy: false,
    voiceMuted: false,
    setVoiceMuted: jest.fn(),
    messages: [{ id: "welcome", role: "assistant", content: "Welcome to DIVARA." }],
    sendMessage,
    transcribeVoiceBlob: jest.fn(),
    stopSpeaking: jest.fn(),
    fetchMemory: jest.fn(),
    clearMemory: jest.fn(),
    clearChat: jest.fn(),
  });

  return { sendMessage, setIsOpen };
}

describe("AiConciergeWidget", () => {
  beforeEach(() => jest.clearAllMocks());

  test("stays hidden while authLoading is true (prevents 1-second admin flash)", () => {
    setupMocks({ authLoading: true });
    render(<AiConciergeWidget />);
    expect(screen.queryByRole("button", { name: /Open NIRA/i })).not.toBeInTheDocument();
  });

  test("stays hidden for admin accounts and /admin routes (air-gap)", () => {
    setupMocks({ isAdmin: true });
    const { rerender } = render(<AiConciergeWidget />);
    expect(screen.queryByRole("button", { name: /Open NIRA/i })).not.toBeInTheDocument();

    setupMocks({ isAdmin: false, currentPath: "/admin" });
    rerender(<AiConciergeWidget />);
    expect(screen.queryByRole("button", { name: /Open NIRA/i })).not.toBeInTheDocument();
  });

  test("renders badge for shoppers and opens chat on click", async () => {
    const user = userEvent.setup();
    const { setIsOpen } = setupMocks({ isOpen: false });
    render(<AiConciergeWidget />);

    const badge = screen.getByRole("button", { name: /Open NIRA/i });
    expect(badge).toBeInTheDocument();

    await user.click(badge);
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });

  test("types a message and submits it to sendMessage", async () => {
    const user = userEvent.setup();
    const { sendMessage } = setupMocks({ isOpen: true });
    render(<AiConciergeWidget />);

    const input = screen.getByPlaceholderText(/Ask NIRA anything/i);
    await user.type(input, "show silk sarees under 15k");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(sendMessage).toHaveBeenCalledWith("show silk sarees under 15k", {
      inputMode: "text",
    });
  });
});