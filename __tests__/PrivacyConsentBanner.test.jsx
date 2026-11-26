import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrivacyConsentBanner from "@/components/ui/PrivacyConsentBanner";
import { useActivity } from "@/context/ActivityContext";

jest.mock("@/context/ActivityContext", () => ({ useActivity: jest.fn() }));

function setupConsent({
  consentLoaded = true,
  decided = false,
  analytics = false,
  personalization = false,
  isPreferencesOpen = false,
} = {}) {
  const openPreferences = jest.fn();
  const closePreferences = jest.fn();
  const acceptAllConsent = jest.fn();
  const saveConsentPreferences = jest.fn();

  useActivity.mockReturnValue({
    consent: { decided, analytics, personalization },
    consentLoaded,
    isPreferencesOpen,
    openPreferences,
    closePreferences,
    acceptAllConsent,
    saveConsentPreferences,
  });

  return { openPreferences, closePreferences, acceptAllConsent, saveConsentPreferences };
}

describe("PrivacyConsentBanner", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders nothing before consentLoaded is true or after user decided", () => {
    setupConsent({ consentLoaded: false });
    const { rerender } = render(<PrivacyConsentBanner />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    setupConsent({ consentLoaded: true, decided: true, isPreferencesOpen: false });
    rerender(<PrivacyConsentBanner />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders compact banner and triggers Make Choices and Accept All", async () => {
    const user = userEvent.setup();
    const { openPreferences, acceptAllConsent } = setupConsent({ decided: false });
    render(<PrivacyConsentBanner />);

    expect(screen.getByRole("dialog", { name: /Cookie and privacy consent/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Make Choices/i }));
    expect(openPreferences).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /Accept All/i }));
    expect(acceptAllConsent).toHaveBeenCalledTimes(1);
  });

  test("defaults optional toggles to OFF (DPDP/GDPR) and saves chosen preferences", async () => {
    const user = userEvent.setup();
    const { saveConsentPreferences } = setupConsent({ isPreferencesOpen: true });
    render(<PrivacyConsentBanner />);

    const necessarySwitch = screen.getByRole("switch", {
      name: /Strictly necessary cookies/i,
    });
    const analyticsSwitch = screen.getByRole("switch", {
      name: /Toggle analytics and performance cookies/i,
    });
    const personalizationSwitch = screen.getByRole("switch", {
      name: /Toggle personalization cookies/i,
    });

    expect(necessarySwitch).toBeDisabled();
    expect(necessarySwitch).toHaveAttribute("aria-checked", "true");
    expect(analyticsSwitch).toHaveAttribute("aria-checked", "false");
    expect(personalizationSwitch).toHaveAttribute("aria-checked", "false");

    await user.click(personalizationSwitch);
    await user.click(screen.getByRole("button", { name: /Save Choices/i }));

    expect(saveConsentPreferences).toHaveBeenCalledWith({
      analytics: false,
      personalization: true,
    });
  });
});