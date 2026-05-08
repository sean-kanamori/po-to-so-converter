import { PurchaseOrder } from "./types";

function escapeCell(value: string | number | undefined | null): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCSV(orders: PurchaseOrder[]): string {
  const rows: string[][] = [];

  // Header
  rows.push([
    "SO #",
    "PO #",
    "Date",
    "Requested Ship Date",
    "Shipping Method",
    "Freight Account",
    "Terms",
    "Bill To Company",
    "Bill To Contact",
    "Bill To Address",
    "Bill To Phone",
    "Ship To Company",
    "Ship To Contact",
    "Ship To Address",
    "Ship To Phone",
    "Line #",
    "Item #",
    "Description",
    "Qty",
    "Price Per Unit",
    "Extended Price",
    "PO Total",
  ]);

  orders.forEach((po, poIdx) => {
    const soNumber = `SO-${String(poIdx + 1).padStart(4, "0")}`;

    if (po.lineItems.length === 0) {
      rows.push([
        soNumber,
        po.poNumber,
        po.date,
        po.requestedShipDate,
        po.shippingMethod,
        po.freightAccount,
        po.terms,
        po.billTo.companyName,
        po.billTo.contactName,
        po.billTo.address,
        po.billTo.phone,
        po.shipTo.companyName,
        po.shipTo.contactName,
        po.shipTo.address,
        po.shipTo.phone,
        "",
        "",
        "",
        "",
        "",
        "",
        String(po.poTotal),
      ]);
    } else {
      po.lineItems.forEach((item, lineIdx) => {
        rows.push([
          soNumber,
          po.poNumber,
          po.date,
          po.requestedShipDate,
          po.shippingMethod,
          po.freightAccount,
          po.terms,
          po.billTo.companyName,
          po.billTo.contactName,
          po.billTo.address,
          po.billTo.phone,
          po.shipTo.companyName,
          po.shipTo.contactName,
          po.shipTo.address,
          po.shipTo.phone,
          String(lineIdx + 1),
          item.itemNumber,
          item.description,
          String(item.qty),
          String(item.pricePerUnit),
          String(item.extendedPrice),
          lineIdx === 0 ? String(po.poTotal) : "",
        ]);
      });
    }
  });

  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
