import "@testing-library/jest-dom";

if (typeof window !== "undefined") {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();

  if (!window.matchMedia) {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  }
}