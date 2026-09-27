import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Basic abuse protection for a public demo that runs on a paid API key.
// Counts live in memory, so they reset when a serverless instance recycles;
// that's fine for keeping casual traffic in check, not a hard guarantee.
const PER_IP_LIMIT = 5;
const GLOBAL_LIMIT = 100;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const hits = new Map<string, number[]>();
let globalHits: number[] = [];

function allowRequest(ip: string): boolean {
  const cutoff = Date.now() - WINDOW_MS;
  globalHits = globalHits.filter((t) => t > cutoff);
  const mine = (hits.get(ip) ?? []).filter((t) => t > cutoff);
  if (mine.length >= PER_IP_LIMIT || globalHits.length >= GLOBAL_LIMIT) {
    hits.set(ip, mine);
    return false;
  }
  mine.push(Date.now());
  hits.set(ip, mine);
  globalHits.push(Date.now());
  return true;
}

const EXTRACTION_PROMPT = `You are a purchase order data extraction specialist. Extract all information from this purchase order PDF and return it as a single valid JSON object with exactly this structure — no markdown, no explanation, just the JSON:

{
  "billTo": {
    "companyName": "",
    "contactName": "",
    "address": "",
    "phone": ""
  },
  "shipTo": {
    "companyName": "",
    "contactName": "",
    "address": "",
    "phone": ""
  },
  "poNumber": "",
  "date": "",
  "requestedShipDate": "",
  "shippingMethod": "",
  "freightAccount": "",
  "terms": "",
  "lineItems": [
    {
      "qty": "",
      "itemNumber": "",
      "description": "",
      "pricePerUnit": "",
      "extendedPrice": ""
    }
  ],
  "poTotal": ""
}

Who is who:
- This purchase order was issued by a customer (the buyer) to us (the vendor/supplier). We are turning it into a Sales Order for that customer.
- billTo is the customer who issued the PO and will pay the invoice. Use an explicit "Bill To", "Invoice To", or "Accounts Payable" block if one exists; otherwise use the issuing company's name, address, and phone from the letterhead/header. For contactName, use the buyer or purchasing contact if one is named.
- shipTo is the "Ship To" / "Deliver To" block. If there is none, copy billTo.
- Never put the vendor/supplier (the "Vendor", "Supplier", "Sold By", or "To:" addressee the PO is sent to) in billTo or shipTo — that is us.

Rules:
- Extract every line item as a separate object in lineItems
- For extendedPrice: if not explicitly shown, calculate qty × pricePerUnit
- For poTotal: sum all extended prices if not explicitly shown
- Use empty string "" for any field not found
- Keep numeric values as strings (preserve formatting like "$1,234.56")
- For address fields, use a single string with line breaks replaced by ", "
- Return ONLY the JSON object, nothing else`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File is too large (10 MB max)." },
        { status: 413 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (!allowRequest(ip)) {
      return NextResponse.json(
        {
          error:
            "Demo limit reached: this public demo allows 5 purchase orders per day. Please try again tomorrow.",
        },
        { status: 429 }
      );
    }

    // Convert file to base64 for the Anthropic API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Strip any accidental markdown fences
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      // Help diagnose truncation: report how many tokens were used
      const hint =
        response.stop_reason === "max_tokens"
          ? "Response was cut off (max_tokens reached) — the PO may be too large."
          : "Claude returned non-JSON output.";
      return NextResponse.json(
        { error: `Failed to parse extracted data: ${hint}`, raw: rawText },
        { status: 422 }
      );
    }

    return NextResponse.json({ data: extracted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Extraction error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
