"use client";

import { useState, useRef, useCallback } from "react";
import { POFile, PurchaseOrder } from "@/lib/types";
import { buildCSV, downloadCSV } from "@/lib/csvExport";

let idCounter = 0;
function nextId() {
  return `po-${++idCounter}-${Date.now()}`;
}

// ─── Editable field ───────────────────────────────────────────────────────────
function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {multiline ? (
        <textarea
          className="input"
          rows={2}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ resize: "vertical" }}
        />
      ) : (
        <input
          className="input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ─── SO Card ─────────────────────────────────────────────────────────────────
function SOCard({
  poFile,
  index,
  onChange,
  onRemove,
}: {
  poFile: POFile;
  index: number;
  onChange: (updated: PurchaseOrder) => void;
  onRemove: () => void;
}) {
  const po = poFile.data;

  function updateField(
    section: "billTo" | "shipTo" | "root",
    field: string,
    value: string
  ) {
    if (!po) return;
    if (section === "root") {
      onChange({ ...po, [field]: value });
    } else {
      onChange({ ...po, [section]: { ...po[section], [field]: value } });
    }
  }

  function updateLineItem(lineIdx: number, field: string, value: string) {
    if (!po) return;
    const items = po.lineItems.map((item, i) =>
      i === lineIdx ? { ...item, [field]: value } : item
    );
    onChange({ ...po, lineItems: items });
  }

  function addLineItem() {
    if (!po) return;
    onChange({
      ...po,
      lineItems: [
        ...po.lineItems,
        {
          qty: "",
          itemNumber: "",
          description: "",
          pricePerUnit: "",
          extendedPrice: "",
        },
      ],
    });
  }

  function removeLineItem(lineIdx: number) {
    if (!po) return;
    onChange({
      ...po,
      lineItems: po.lineItems.filter((_, i) => i !== lineIdx),
    });
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header-bar" />
      <div className="card-body">
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <p className="section-eyebrow">Sales Order {index + 1}</p>
            <p className="section-title" style={{ fontSize: 16 }}>
              {poFile.file.name}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {poFile.status === "extracting" && (
              <span className="badge badge-processing" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="spinner" style={{ width: 10, height: 10 }} />
                Extracting…
              </span>
            )}
            {poFile.status === "done" && (
              <span className="badge badge-done">✓ Extracted</span>
            )}
            {poFile.status === "error" && (
              <span className="badge badge-error">✗ Error</span>
            )}
            <button className="btn-ghost" onClick={onRemove} title="Remove">
              ✕ Remove
            </button>
          </div>
        </div>

        {poFile.status === "extracting" && (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--muted)",
            }}
          >
            <div
              className="spinner"
              style={{ width: 28, height: 28, margin: "0 auto 12px" }}
            />
            <p style={{ fontSize: 14 }}>Extracting purchase order data…</p>
          </div>
        )}

        {poFile.status === "error" && (
          <div
            style={{
              padding: "16px",
              borderRadius: 4,
              background: "#fdecea",
              color: "var(--error)",
              fontSize: 14,
            }}
          >
            {poFile.error || "Failed to extract data from this PDF."}
          </div>
        )}

        {poFile.status === "done" && po && (
          <>
            {/* PO Details */}
            <div className="highlight-panel" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: "12px 20px",
                }}
              >
                <Field
                  label="PO Number"
                  value={po.poNumber}
                  onChange={(v) => updateField("root", "poNumber", v)}
                />
                <Field
                  label="Date"
                  value={po.date}
                  onChange={(v) => updateField("root", "date", v)}
                />
                <Field
                  label="Requested Ship Date"
                  value={po.requestedShipDate}
                  onChange={(v) => updateField("root", "requestedShipDate", v)}
                />
                <Field
                  label="Shipping Method"
                  value={po.shippingMethod}
                  onChange={(v) => updateField("root", "shippingMethod", v)}
                />
                <Field
                  label="Freight Account"
                  value={po.freightAccount}
                  onChange={(v) => updateField("root", "freightAccount", v)}
                />
                <Field
                  label="Terms"
                  value={po.terms}
                  onChange={(v) => updateField("root", "terms", v)}
                />
              </div>
            </div>

            {/* Bill To / Ship To */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginBottom: 20,
              }}
            >
              {(
                [
                  ["billTo", "Bill To"],
                  ["shipTo", "Ship To"],
                ] as const
              ).map(([key, title]) => (
                <div key={key}>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "1.5px",
                      color: "var(--accent)",
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: "2px solid var(--border)",
                    }}
                  >
                    {title}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field
                      label="Company Name"
                      value={po[key].companyName}
                      onChange={(v) => updateField(key, "companyName", v)}
                    />
                    <Field
                      label="Contact Name"
                      value={po[key].contactName}
                      onChange={(v) => updateField(key, "contactName", v)}
                    />
                    <Field
                      label="Address"
                      value={po[key].address}
                      onChange={(v) => updateField(key, "address", v)}
                      multiline
                    />
                    <Field
                      label="Phone"
                      value={po[key].phone}
                      onChange={(v) => updateField(key, "phone", v)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Line Items */}
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  color: "var(--accent)",
                  marginBottom: 10,
                  paddingBottom: 6,
                  borderBottom: "2px solid var(--border)",
                }}
              >
                Line Items
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className="so-table">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Qty</th>
                      <th style={{ width: 100 }}>Item #</th>
                      <th>Description</th>
                      <th style={{ width: 110 }}>Price / Unit</th>
                      <th style={{ width: 110 }}>Extended</th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {po.lineItems.map((item, li) => (
                      <tr key={li}>
                        <td>
                          <input
                            className="input"
                            style={{ padding: "4px 6px", fontSize: 13 }}
                            value={String(item.qty)}
                            onChange={(e) =>
                              updateLineItem(li, "qty", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ padding: "4px 6px", fontSize: 13 }}
                            value={item.itemNumber}
                            onChange={(e) =>
                              updateLineItem(li, "itemNumber", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ padding: "4px 6px", fontSize: 13 }}
                            value={item.description}
                            onChange={(e) =>
                              updateLineItem(li, "description", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ padding: "4px 6px", fontSize: 13 }}
                            value={String(item.pricePerUnit)}
                            onChange={(e) =>
                              updateLineItem(li, "pricePerUnit", e.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ padding: "4px 6px", fontSize: 13 }}
                            value={String(item.extendedPrice)}
                            onChange={(e) =>
                              updateLineItem(
                                li,
                                "extendedPrice",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="btn-ghost"
                            style={{ padding: "2px 6px", color: "var(--error)" }}
                            onClick={() => removeLineItem(li)}
                            title="Remove line"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <button className="btn-ghost" onClick={addLineItem}>
                  + Add Line
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "1.5px",
                      color: "var(--muted)",
                    }}
                  >
                    PO Total
                  </span>
                  <input
                    className="input"
                    style={{
                      width: 130,
                      padding: "6px 10px",
                      fontWeight: 700,
                      color: "var(--accent)",
                    }}
                    value={String(po.poTotal)}
                    onChange={(e) =>
                      updateField("root", "poTotal", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [poFiles, setPoFiles] = useState<POFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") return;

    const id = nextId();
    const entry: POFile = {
      id,
      file,
      status: "extracting",
      data: null,
      error: null,
    };

    setPoFiles((prev) => [...prev, entry]);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/extract", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error || "Extraction failed");
      }

      const po: PurchaseOrder = {
        id,
        fileName: file.name,
        ...json.data,
      };

      setPoFiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "done", data: po } : p
        )
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPoFiles((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "error", error: msg } : p
        )
      );
    }
  }, []);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(processFile);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function removeFile(id: string) {
    setPoFiles((prev) => prev.filter((p) => p.id !== id));
  }

  function updatePO(id: string, updated: PurchaseOrder) {
    setPoFiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, data: updated } : p))
    );
  }

  const donePOs = poFiles.filter((p) => p.status === "done" && p.data);

  function exportAll() {
    const orders = donePOs.map((p) => p.data!);
    const csv = buildCSV(orders);
    const ts = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `sales-orders-${ts}.csv`);
  }

  function exportSingle(po: PurchaseOrder) {
    const csv = buildCSV([po]);
    downloadCSV(csv, `SO-${po.poNumber || po.id}.csv`);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)" }}>
      {/* ── Nav bar ── */}
      <header
        style={{
          background: "var(--accent)",
          borderBottom: "3px solid var(--accent-secondary)",
          padding: "0 32px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <span
            style={{
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "0.3px",
            }}
          >
            PO → SO Converter
          </span>
        </div>
        {donePOs.length > 0 && (
          <button
            className="btn-primary"
            style={{
              background: "#fff",
              color: "var(--accent)",
              fontSize: 13,
              padding: "7px 16px",
            }}
            onClick={exportAll}
          >
            ↓ Export All ({donePOs.length}) to CSV
          </button>
        )}
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 64px" }}>
        {/* ── Upload area ── */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card-header-bar" />
          <div className="card-body">
            <p className="section-eyebrow">Step 1</p>
            <p className="section-title" style={{ marginBottom: 16 }}>
              Upload Purchase Orders
            </p>
            <div
              className={`drop-zone${dragOver ? " drag-over" : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <div
                style={{ fontSize: 36, marginBottom: 12, lineHeight: 1 }}
              >
                📄
              </div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--accent)",
                  marginBottom: 6,
                }}
              >
                Drop PDF purchase orders here
              </p>
              <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
                or click to browse — any PO format accepted
              </p>
              <button
                className="btn-secondary"
                style={{ pointerEvents: "none" }}
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>
        </div>

        {/* ── SO cards ── */}
        {poFiles.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div>
                <p className="section-eyebrow">Step 2</p>
                <p className="section-title">Review &amp; Edit Sales Orders</p>
              </div>
              {donePOs.length > 1 && (
                <button className="btn-primary" onClick={exportAll}>
                  ↓ Export All to CSV
                </button>
              )}
            </div>

            {poFiles.map((pf, idx) => (
              <div key={pf.id}>
                <SOCard
                  poFile={pf}
                  index={idx}
                  onChange={(updated) => updatePO(pf.id, updated)}
                  onRemove={() => removeFile(pf.id)}
                />
                {pf.status === "done" && pf.data && (
                  <div
                    style={{
                      textAlign: "right",
                      marginTop: -16,
                      marginBottom: 24,
                    }}
                  >
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 12 }}
                      onClick={() => exportSingle(pf.data!)}
                    >
                      ↓ Export this SO to CSV
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {poFiles.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 0",
              color: "var(--muted)",
            }}
          >
            <p style={{ fontSize: 13 }}>
              Upload one or more PDF purchase orders above to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
