import { printOrderInvoice } from "@/lib/printInvoice";

describe("printOrderInvoice", () => {
  let mockWin;
  let openSpy;

  beforeEach(() => {
    mockWin = {
      document: {
        open: jest.fn(),
        write: jest.fn(),
        close: jest.fn(),
      },
      focus: jest.fn(),
      print: jest.fn(),
    };
    openSpy = jest.spyOn(window, "open").mockReturnValue(mockWin);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  const sampleOrder = {
    orderNumber: "DIV-2026-001",
    status: "PAID",
    currency: "INR",
    createdAt: "2026-11-26T10:00:00.000Z",
    subtotalPaise: 1200000,
    discountPaise: 0,
    totalPaise: 1200000,
    customerEmail: "buyer@example.com",
    shippingAddress: {
      fullName: '<script>alert("xss")</script>Aarav',
      line1: "12 Park Street",
      city: "Kolkata",
      state: "West Bengal",
      postalCode: "700016",
      country: "India",
      phone: "9876543210",
    },
    items: [
      {
        title: '<img src=x onerror=alert(1)>Banarasi Silk Saree',
        category: "saree",
        size: "Free Size",
        quantity: 1,
        price: 12000,
      },
    ],
    attribution: {
      utmSource: "instagram_launch",
    },
  };

  test("escapes HTML/XSS payloads in customer name and item title", () => {
    printOrderInvoice(sampleOrder, { viewer: "customer" });

    expect(mockWin.document.write).toHaveBeenCalledTimes(1);
    const html = mockWin.document.write.mock.calls[0][0];

    expect(html).toContain("INV-DIV-2026-001");
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  test("shows UTM attribution only for admin viewer, not customer viewer", () => {
    printOrderInvoice(sampleOrder, { viewer: "customer" });
    const customerHtml = mockWin.document.write.mock.calls[0][0];
    expect(customerHtml).not.toContain("instagram_launch");

    mockWin.document.write.mockClear();

    printOrderInvoice(sampleOrder, { viewer: "admin" });
    const adminHtml = mockWin.document.write.mock.calls[0][0];
    expect(adminHtml).toContain("instagram_launch");
  });
});