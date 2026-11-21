"use client";

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInrExact(paise) {
  const inr = Math.round((Number(paise) || 0) / 100);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(inr);
}

function numberToIndianWords(num) {
  const n = Math.max(0, Math.round(Number(num) || 0));
  if (n === 0) return "Zero";
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (x) =>
    x < 20 ? ones[x] : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`;
  const threeDigits = (x) =>
    x >= 100
      ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? " " + twoDigits(x % 100) : ""}`
      : twoDigits(x);

  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));

  return parts.join(" ");
}

/**
 * Opens a crisp, A4 print-ready DIVARA GST Tax Invoice in a new window and triggers print.
 * Works identically for both Customer My Account orders and Admin Orders console.
 */
export function printOrderInvoice(order, { viewer = "customer" } = {}) {
  if (typeof window === "undefined" || !order) return;

  const totalPaise = Number(order.totalPaise) || 0;
  const subtotalPaise = Number(order.subtotalPaise) || totalPaise;
  const discountPaise = Number(order.discountPaise) || 0;
  const shippingPaise = Number(order.shippingPaise) || 0;
  const gstRate = Number(order.gstRatePercent) || 12;
  const taxableBasePaise =
    order.taxableBasePaise ?? Math.round(totalPaise / (1 + gstRate / 100));
  const gstPaise = order.gstPaise ?? Math.max(0, totalPaise - taxableBasePaise);
  const isIntraState =
    order.taxType === "CGST_SGST" ||
    (!order.taxType &&
      String(order.shippingAddress?.state || "").trim().toLowerCase() === "west bengal");
  const cgstPaise = order.cgstPaise ?? (isIntraState ? Math.floor(gstPaise / 2) : 0);
  const sgstPaise = order.sgstPaise ?? (isIntraState ? gstPaise - cgstPaise : 0);
  const igstPaise = order.igstPaise ?? (isIntraState ? 0 : gstPaise);
  const hsnCode = order.hsnCode || "6204";
  const addr = order.shippingAddress || {};

  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const paidDate = order.paidAt
    ? new Date(order.paidAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const itemsHtml = (order.items || [])
    .map((item, idx) => {
      const unitPaise = item.unitPricePaise ?? Math.round((item.unitPrice || 0) * 100);
      const qty = Number(item.quantity) || 1;
      const linePaise = unitPaise * qty;
      const lineTaxablePaise = Math.round(linePaise / (1 + gstRate / 100));
      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>
            <div style="font-weight:600;color:#1b1717;">${escapeHtml(item.title)}</div>
            <div style="font-size:10px;color:#555;margin-top:2px;">
              ${escapeHtml(item.category || "Garment")} &bull; Size: <strong>${escapeHtml(item.size)}</strong> &bull; SKU: <span style="font-family:monospace;">${escapeHtml(item.sku || "—")}</span>
            </div>
          </td>
          <td style="text-align:center;font-family:monospace;">${escapeHtml(hsnCode)}</td>
          <td style="text-align:center;">${qty}</td>
          <td style="text-align:right;">${formatInrExact(unitPaise)}</td>
          <td style="text-align:right;">${formatInrExact(lineTaxablePaise)}</td>
          <td style="text-align:right;font-weight:600;">${formatInrExact(linePaise)}</td>
        </tr>
      `;
    })
    .join("");

  const refundHtml =
    order.refund?.razorpayRefundId || order.status === "REFUNDED"
      ? `
        <div class="box" style="margin-top:16px;border-color:#5d100a;background:#fdf8f8;">
          <div class="section-label" style="color:#5d100a;">Refund Record</div>
          <div class="meta-grid">
            <div><strong>Refund Status:</strong> ${escapeHtml(order.status)}</div>
            <div><strong>Refund Amount:</strong> ${formatInrExact(order.refund?.amountPaise || totalPaise)}</div>
            <div><strong>Razorpay Refund ID:</strong> <span style="font-family:monospace;">${escapeHtml(order.refund?.razorpayRefundId || "—")}</span></div>
            <div><strong>Reason:</strong> ${escapeHtml(order.refund?.reason || "Atelier approved refund")}</div>
          </div>
        </div>
      `
      : "";

  const totalInrRounded = Math.round(totalPaise / 100);
  const amountInWords = `Rupees ${numberToIndianWords(totalInrRounded)} Only`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DIVARA Tax Invoice — ${escapeHtml(order.orderNumber)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1b1717;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.45;
    }
    .sheet { max-width: 794px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1b1717;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 28px;
      letter-spacing: 0.22em;
      color: #1b1717;
      margin: 0;
    }
    .brand-sub {
      font-size: 10px;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: #5d100a;
      margin-top: 3px;
      font-weight: 600;
    }
    .inv-badge {
      text-align: right;
    }
    .inv-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #5d100a;
    }
    .status-pill {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      border: 1px solid #1b1717;
    }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }
    .box {
      border: 1px solid #d4d4d8;
      padding: 12px 14px;
    }
    .section-label {
      font-size: 10px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      color: #555;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #1b1717;
      color: #ffffff;
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 8px 8px;
      text-align: left;
      font-weight: 600;
    }
    td {
      border-bottom: 1px solid #e4e4e7;
      padding: 9px 8px;
      vertical-align: top;
      font-size: 11.5px;
    }
    .summary-wrap {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 18px;
      margin-top: 18px;
      align-items: start;
    }
    .totals-table td {
      border-bottom: 1px dashed #e4e4e7;
      padding: 6px 4px;
    }
    .totals-table tr.grand td {
      border-top: 2px solid #1b1717;
      border-bottom: 2px solid #1b1717;
      font-size: 14px;
      font-weight: 700;
      padding: 9px 4px;
      color: #1b1717;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      font-size: 11px;
    }
    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #d4d4d8;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #555;
    }
    .print-bar {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 16px;
    }
    .btn {
      padding: 8px 18px;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-weight: 600;
      border: 1px solid #1b1717;
      background: #1b1717;
      color: #ffffff;
      cursor: pointer;
    }
    .btn-outline {
      background: #ffffff;
      color: #1b1717;
    }
    @media print {
      body { padding: 0; }
      .print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="print-bar">
      <button class="btn btn-outline" onclick="window.close()">Close</button>
      <button class="btn" onclick="window.print()">Print / Save PDF</button>
    </div>

    <div class="header">
      <div>
        <h1 class="brand">DIVARA</h1>
        <div class="brand-sub">Limitless Luxury &bull; Atelier Tax Invoice</div>
        <div style="font-size:11px;color:#444;margin-top:6px;">
          DIVARA Luxury Fashion Atelier, West Bengal, India<br />
          Web: divara.byfalguni.com &bull; Support: divara@byfalguni.com
        </div>
      </div>
      <div class="inv-badge">
        <div class="inv-title">Tax Invoice</div>
        <div style="font-size:11px;margin-top:4px;">
          <strong>Invoice No:</strong> INV-${escapeHtml(order.orderNumber)}<br />
          <strong>Order No:</strong> ${escapeHtml(order.orderNumber)}<br />
          <strong>Order Date:</strong> ${escapeHtml(orderDate)}
        </div>
        <div class="status-pill">${escapeHtml(order.status)}</div>
      </div>
    </div>

    <div class="two-col">
      <div class="box">
        <div class="section-label">Bill To / Ship To</div>
        <div style="font-weight:700;font-size:13px;">${escapeHtml(addr.fullName || "Valued Client")}</div>
        <div style="margin-top:4px;color:#333;">
          ${escapeHtml(addr.line1 || "")}${addr.line2 ? `, ${escapeHtml(addr.line2)}` : ""}<br />
          ${escapeHtml(addr.city || "")}, ${escapeHtml(addr.state || "")} - ${escapeHtml(addr.postalCode || "")}<br />
          ${escapeHtml(addr.country || "India")}
        </div>
        <div style="margin-top:6px;font-size:11px;color:#444;">
          <strong>Phone:</strong> ${escapeHtml(addr.phone || "—")}<br />
          <strong>Email:</strong> ${escapeHtml(order.customerEmail || addr.email || "—")}
        </div>
      </div>

      <div class="box">
        <div class="section-label">Payment &amp; Fulfillment Details</div>
        <div style="font-size:11.5px;line-height:1.65;">
          <strong>Place of Supply:</strong> ${escapeHtml(addr.state || "India")} (${isIntraState ? "Intra-State" : "Inter-State"})<br />
          <strong>Payment Gateway:</strong> Razorpay (${escapeHtml(order.currency || "INR")})<br />
          <strong>Razorpay Order ID:</strong> <span style="font-family:monospace;">${escapeHtml(order.razorpayOrderId || "—")}</span><br />
          <strong>Payment ID:</strong> <span style="font-family:monospace;">${escapeHtml(order.razorpayPaymentId || "Pending")}</span><br />
          ${paidDate ? `<strong>Paid At:</strong> ${escapeHtml(paidDate)}<br />` : ""}
          ${order.courierName || order.trackingNumber ? `<strong>Dispatch:</strong> ${escapeHtml(order.courierName || "Courier")} (${escapeHtml(order.trackingNumber || "—")})` : ""}
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th>Garment Description</th>
          <th style="width:68px;text-align:center;">HSN</th>
          <th style="width:44px;text-align:center;">Qty</th>
          <th style="width:92px;text-align:right;">Unit MRP</th>
          <th style="width:96px;text-align:right;">Taxable</th>
          <th style="width:98px;text-align:right;">Line Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="summary-wrap">
      <div class="box">
        <div class="section-label">Amount in Words</div>
        <div style="font-weight:600;color:#1b1717;margin-bottom:10px;">${escapeHtml(amountInWords)}</div>
        <div class="section-label" style="margin-top:8px;">Tax &amp; Policy Notes</div>
        <div style="font-size:10.5px;color:#444;line-height:1.55;">
          &bull; All product prices are Final MRP inclusive of ${gstRate}% GST.<br />
          &bull; Tax Type: <strong>${isIntraState ? "CGST 6% + SGST 6% (West Bengal)" : "IGST 12% (Inter-State)"}</strong>.<br />
          &bull; 7-day return window applies from date of delivery on unworn garments with original tags intact.
          ${viewer === "admin" && order.attribution?.utmSource ? `<br />&bull; Attribution: <strong>${escapeHtml(order.attribution.utmSource)}</strong>${order.attribution.referralPerson ? ` (${escapeHtml(order.attribution.referralPerson)})` : ""}` : ""}
        </div>
      </div>

      <table class="totals-table" style="margin-top:0;">
        <tbody>
          <tr>
            <td>MRP Subtotal (Incl. GST)</td>
            <td style="text-align:right;">${formatInrExact(subtotalPaise)}</td>
          </tr>
          ${
            discountPaise > 0
              ? `<tr>
                  <td style="color:#5d100a;font-weight:600;">Coupon Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}</td>
                  <td style="text-align:right;color:#5d100a;font-weight:600;">-${formatInrExact(discountPaise)}</td>
                </tr>`
              : ""
          }
          <tr>
            <td>Insured Shipping</td>
            <td style="text-align:right;">${shippingPaise > 0 ? formatInrExact(shippingPaise) : "Complimentary"}</td>
          </tr>
          <tr>
            <td style="color:#555;">Taxable Value (Excl. GST)</td>
            <td style="text-align:right;color:#555;">${formatInrExact(taxableBasePaise)}</td>
          </tr>
          ${
            isIntraState
              ? `<tr>
                  <td style="color:#555;">CGST @ ${(gstRate / 2).toFixed(0)}%</td>
                  <td style="text-align:right;color:#555;">${formatInrExact(cgstPaise)}</td>
                </tr>
                <tr>
                  <td style="color:#555;">SGST @ ${(gstRate / 2).toFixed(0)}%</td>
                  <td style="text-align:right;color:#555;">${formatInrExact(sgstPaise)}</td>
                </tr>`
              : `<tr>
                  <td style="color:#555;">IGST @ ${gstRate}%</td>
                  <td style="text-align:right;color:#555;">${formatInrExact(igstPaise)}</td>
                </tr>`
          }
          <tr class="grand">
            <td>Grand Total (${escapeHtml(order.currency || "INR")})</td>
            <td style="text-align:right;">${formatInrExact(totalPaise)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${refundHtml}

    <div class="footer">
      <span>This is a computer-generated GST Tax Invoice — no physical signature required.</span>
      <span>DIVARA Atelier &bull; divara.byfalguni.com</span>
    </div>
  </div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=920,height=860");
  if (!win) {
    alert("Please allow pop-ups in your browser to print or save the invoice.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}