import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    // Convert file to base64 for the Anthropic API
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
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
      return NextResponse.json(
        { error: "Failed to parse extracted data", raw: rawText },
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
