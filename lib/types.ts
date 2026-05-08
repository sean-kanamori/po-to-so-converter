export interface ContactInfo {
  companyName: string;
  contactName: string;
  address: string;
  phone: string;
}

export interface LineItem {
  qty: number | string;
  itemNumber: string;
  description: string;
  pricePerUnit: number | string;
  extendedPrice: number | string;
}

export interface PurchaseOrder {
  id: string;                  // client-side UUID
  fileName: string;
  billTo: ContactInfo;
  shipTo: ContactInfo;
  poNumber: string;
  date: string;
  requestedShipDate: string;
  shippingMethod: string;
  freightAccount: string;
  terms: string;
  lineItems: LineItem[];
  poTotal: number | string;
}

export type ExtractionStatus = "idle" | "extracting" | "done" | "error";

export interface POFile {
  id: string;
  file: File;
  status: ExtractionStatus;
  data: PurchaseOrder | null;
  error: string | null;
}
