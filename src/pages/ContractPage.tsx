import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/lib/supabase";
import { loadTemplate, drawText, drawPng, saveToBlob, clearArea, drawRect } from "@/lib/pdfFill";
import { contractFieldCoords as F } from "@/config/contractFields";
import { rgb } from "pdf-lib";
import type { PDFDocument } from "pdf-lib";

type AppRow = {
  id: string;
  status?: string | null;
  data?: any;
};

const toAUD = (n?: number | string) => {
  const val = Number(n || 0);
  return val ? val.toLocaleString("en-AU", { style: "currency", currency: "AUD" }) : "";
};

const numericValue = (value?: number | string | null) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAddress = (parts: Array<string | null | undefined>) =>
  parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");

const getBaseRate = (amount: number) => {
  if (amount <= 20000) return 11.9;
  if (amount <= 35000) return 10.9;
  if (amount <= 50000) return 9.9;
  return 9.5;
};

const upliftIndustries = ["beauty", "gym", "hospitality"];

const deriveIndustry = (industry?: string) => {
  if (!industry) return "general";
  const normalized = industry.toLowerCase();
  if (normalized.includes("beauty")) return "beauty";
  if (normalized.includes("gym")) return "gym";
  if (normalized.includes("hospitality")) return "hospitality";
  return "general";
};

const estimateMonthlyRepayment = (amount: number, months: number, industry?: string) => {
  if (!amount || !months) return 0;
  let rate = getBaseRate(amount);
  if (upliftIndustries.includes(deriveIndustry(industry))) {
    rate += 1;
  }
  const monthlyRate = rate / 100 / 12;
  if (!monthlyRate) return amount / months;
  const numerator = amount * monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  if (!denominator) return amount / months;
  return numerator / denominator;
};

// Basic outstanding tasks checker (adjust as needed)
const hasOutstandingTasks = (d: any) => {
  if (!d) return true;
  const reqDocs = ["certificateFiles", "bankStatement", "taxInvoiceTemplate"];
  const docsOk = reqDocs.every((k) => !!d[k]);
  const directors = Array.isArray(d.directors) ? d.directors : [];
  const directorsOk = directors.slice(0, d.directorCount || directors.length).every(
    (x: any) => !!x?.licenceFront && !!x?.licencePhoto
  );
  return !(docsOk && directorsOk);
};

const ContractPage: React.FC = () => {
  const { appId } = useParams();
  const navigate = useNavigate();
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [app, setApp] = useState<AppRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lastPreviewUrl = useRef<string | null>(null);
  const pdfSrc = useMemo(() => (previewUrl ? encodeURI(previewUrl) : null), [previewUrl]);

  const isDemo = useMemo(
    () => new URLSearchParams(window.location.search).get("demo") === "1" || import.meta.env.VITE_DEMO_NO_BACKEND === "1",
    []
  );
  const showOverlay = useMemo(
    () => new URLSearchParams(window.location.search).get("overlay") === "1",
    []
  );

  useEffect(() => {
    const load = async () => {
      if (!appId) return;
      if (isDemo) {
        try {
          const raw = sessionStorage.getItem(`demo_app_${appId}`);
          if (raw) {
            const data = JSON.parse(raw);
            setApp({ id: appId, status: 'submitted', data });
          } else {
            // Fallback mock
            setApp({
              id: appId,
              status: 'submitted',
              data: {
                businessName: 'Demo Solar Pty Ltd',
                abnNumber: '12 345 678 901',
                streetAddress: '100 Market St',
                city: 'Sydney',
                state: 'NSW',
                postcode: '2000',
                financeAmount: '29500',
                term: '48',
              },
            });
          }
        } catch {
          // Ignore parse errors – use mock
          setApp({
            id: appId,
            status: 'submitted',
            data: {
              businessName: 'Demo Solar Pty Ltd',
              abnNumber: '12 345 678 901',
              streetAddress: '100 Market St',
              city: 'Sydney',
              state: 'NSW',
              postcode: '2000',
              financeAmount: '29500',
              term: '48',
            },
          });
        }
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("application_forms")
          .select("id, status, data")
          .eq("id", appId)
          .single();
        setApp(data as AppRow);
      } catch (err: any) {
        setError(err.message || 'Failed to load application.');
      }
      setLoading(false);
    };
    load();
  }, [appId]);

  const buildFilledPdf = useCallback(
    async (
      data: {
        lessee: {
          entityName: string;
          installationAddress: string;
          phone: string;
          email: string;
          abn: string;
        };
        supplier: {
          supplierName: string;
          supplierAddress: string;
          supplierABN: string;
          supplierPhone: string;
          supplierEmail: string;
        };
        equipmentItems: Array<{
          description?: string;
          category?: string;
          asset?: string;
          quantity?: string | number;
        }>;
        finance: {
          amount: string;
          term: string;
          monthlyPayment: string;
          specialConditions: string;
        };
        directors: Array<{ fullName?: string; date?: string; position?: string }>;
      },
      includeSignature: boolean
    ) => {
      // Load template (try common names)
      let doc: PDFDocument | undefined;
      const candidates = ["/Grenke Agreement.pdf"];
    let lastErr: any = null;
    for (const url of candidates) {
      try { doc = await loadTemplate(url); break; } catch (e) { lastErr = e; }
    }
    if (!doc) throw lastErr || new Error('Contract template not found in /public');

      const writeField = async (
        field: typeof F.lessee.entityName,
        text: string
      ) => {
        if (field.clearWidth && field.clearHeight) {
          clearArea(doc, {
            page: field.page,
          x: field.x + (field.clearOffsetX ?? 0),
          y: field.y + (field.clearOffsetY ?? 0),
          width: field.clearWidth,
          height: field.clearHeight,
        });
      }
        await drawText(doc, {
          page: field.page,
          x: field.x,
          y: field.y,
          text,
          fontSize: field.fontSize,
        });
      };

      const writeIfPresent = async (
        field: typeof F.lessee.entityName | undefined,
        value?: string | null
      ) => {
        if (!field || !value) return;
        const safeText = String(value);
        if (!safeText.trim()) return;
        await writeField(field, safeText);
      };

      const wrapText = (text: string, maxChars = 80) => {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let current = "";
        for (const word of words) {
          if (!word) continue;
          if ((current + " " + word).trim().length > maxChars) {
            if (current) lines.push(current.trim());
            current = word;
          } else {
            current = current ? `${current} ${word}` : word;
          }
        }
        if (current) lines.push(current.trim());
        return lines.length ? lines : [text];
      };

      const writeMultilineField = async (
        field: (typeof F.finance.specialConditions) | undefined,
        value?: string | null
      ) => {
        if (!field || !value) return;
        const text = String(value);
        if (!text.trim()) return;
        const lineHeight = field.lineHeight ?? (field.fontSize || 10) + 2;
        const maxChars = field.maxCharsPerLine ?? 80;
        const lines = wrapText(text, maxChars);
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];
          if (!line) continue;
          await writeField({ ...field, y: field.y - i * lineHeight }, line);
        }
      };

      // Lessee information
      await writeIfPresent(F.lessee?.entityName, data.lessee?.entityName);
      await writeIfPresent(
        F.lessee?.installationAddress,
        data.lessee?.installationAddress
      );
      await writeIfPresent(F.lessee?.phone, data.lessee?.phone);
      await writeIfPresent(F.lessee?.email, data.lessee?.email);
      await writeIfPresent(F.lessee?.abn, data.lessee?.abn);

      // Supplier
      await writeIfPresent(F.supplier?.name, data.supplier?.supplierName);
      await writeIfPresent(
        F.supplier?.address,
        data.supplier?.supplierAddress
      );
      await writeIfPresent(F.supplier?.abn, data.supplier?.supplierABN);
      await writeIfPresent(F.supplier?.phone, data.supplier?.supplierPhone);
      await writeIfPresent(F.supplier?.email, data.supplier?.supplierEmail);

      // Equipment rows
      if (Array.isArray(F.equipmentDescriptions) && F.equipmentDescriptions.length) {
        const equipmentList = Array.isArray(data.equipmentItems)
          ? data.equipmentItems
          : [];
        const count = Math.min(
          equipmentList.length,
          F.equipmentDescriptions.length
        );
        for (let i = 0; i < count; i += 1) {
          const descField = F.equipmentDescriptions[i];
          const qtyField = F.equipmentQuantities?.[i];
          const item = equipmentList[i];
          if (!item) continue;
          const description =
            item.description || item.asset || item.category || "";
          await writeIfPresent(descField, description);
          await writeIfPresent(
            qtyField,
            item.quantity !== undefined && item.quantity !== ""
              ? String(item.quantity)
              : ""
          );
        }
      }

      await writeIfPresent(
        F.finance?.monthlyPayment,
        data.finance?.monthlyPayment
      );
      await writeIfPresent(F.finance?.term, data.finance?.term);
      await writeMultilineField(
        F.finance?.specialConditions,
        data.finance?.specialConditions
      );

      if (Array.isArray(F.directors) && F.directors.length) {
        const directors = Array.isArray(data.directors) ? data.directors : [];
        const dirCount = Math.min(directors.length, F.directors.length);
        for (let i = 0; i < dirCount; i += 1) {
          const fieldSet = F.directors[i];
          const director = directors[i];
          if (!director) continue;
          await writeIfPresent(fieldSet.name, director.fullName || "");
          await writeIfPresent(
            fieldSet.position,
            director.position || "Director"
          );
          await writeIfPresent(fieldSet.date, director.date || "");
        }
      }
      if (Array.isArray(F.equipmentDescriptions) && F.equipmentDescriptions.length) {
        const equipmentList = Array.isArray(data.equipmentItems) ? data.equipmentItems : [];
        const count = Math.min(equipmentList.length, F.equipmentDescriptions.length);
        for (let i = 0; i < count; i += 1) {
          const field = F.equipmentDescriptions[i];
          const item = equipmentList[i];
          if (!field || !item) continue;
          const details = [item.asset, item.description, item.category]
            .filter(Boolean)
            .join(" ");
          await writeField(field, details);
          const qtyField = F.equipmentQuantities?.[i];
          if (qtyField) {
            const qtyValue = item.quantity ?? item.qty ?? "";
            await writeField(qtyField, qtyValue ? String(qtyValue) : "");
          }
        }
      }

    // In demo, annotate summary for clarity
    if (isDemo) {
      const firstPage = 0;
      const topY = 800;
      await drawText(doc, { page: firstPage, x: 40, y: topY, text: "DEMO PREVIEW", fontSize: 12 });
    }

    if (showOverlay) {
      type FieldDef = {
        page: number;
        x: number;
        y: number;
        clearWidth?: number;
        clearHeight?: number;
        clearOffsetX?: number;
        clearOffsetY?: number;
        fontSize?: number;
      };
      const overlayColor = rgb(0.04, 0.45, 0.95);
      const overlayFill = rgb(0.69, 0.83, 1);
      const highlightField = async (field: FieldDef | undefined, label: string) => {
        if (!field) return;
        const width = field.clearWidth ?? 140;
        const height = field.clearHeight ?? ((field.fontSize || 10) + 8);
        const x = field.clearWidth
          ? field.x + (field.clearOffsetX ?? 0)
          : field.x - 2;
        const y = field.clearHeight
          ? field.y + (field.clearOffsetY ?? 0)
          : field.y - 2;
        await drawRect(doc, {
          page: field.page,
          x,
          y,
          width,
          height,
          borderColor: overlayColor,
          borderWidth: 0.8,
          color: overlayFill,
          opacity: 0.2,
        });
        await drawText(doc, {
          page: field.page,
          x,
          y: y + height + 4,
          text: label,
          fontSize: 6,
        });
      };
      const overlays: Array<Promise<void>> = [];
      const pushField = (field: FieldDef | undefined, label: string) => {
        if (!field) return;
        overlays.push(highlightField(field, label));
      };
      pushField(F.lessee?.entityName, "lessee.entityName");
      pushField(F.lessee?.installationAddress, "lessee.installationAddress");
      pushField(F.lessee?.phone, "lessee.phone");
      pushField(F.lessee?.email, "lessee.email");
      pushField(F.lessee?.abn, "lessee.abn");
      pushField(F.supplier?.name, "supplier.name");
      pushField(F.supplier?.address, "supplier.address");
      pushField(F.supplier?.abn, "supplier.abn");
      pushField(F.supplier?.phone, "supplier.phone");
      pushField(F.supplier?.email, "supplier.email");
      F.equipmentDescriptions?.forEach((field, idx) =>
        pushField(field, `equipment[${idx}].description`)
      );
      F.equipmentQuantities?.forEach((field, idx) =>
        pushField(field, `equipment[${idx}].qty`)
      );
      pushField(F.finance?.monthlyPayment, "finance.monthlyPayment");
      pushField(F.finance?.term, "finance.term");
      pushField(F.finance?.specialConditions, "finance.specialConditions");
      F.directors?.forEach((set, idx) => {
        pushField(set.name, `director[${idx}].name`);
        pushField(set.position, `director[${idx}].position`);
        pushField(set.date, `director[${idx}].date`);
      });
      pushField(F.signature, "signature");
      await Promise.all(overlays);
    }

    // Optional signature overlay for preview
    if (includeSignature && sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      const pngBytes = await (await fetch(dataUrl)).arrayBuffer();
      await drawPng(doc, { page: F.signature.page, x: F.signature.x, y: F.signature.y, width: F.signature.width, height: F.signature.height, pngBytes });
    }

    return await saveToBlob(doc);
  }, [isDemo, showOverlay]);

  // Generate initial preview once data is ready
  useEffect(() => {
    if (!app) return;
    (async () => {
      try {
        const blob = await buildFilledPdf(display, false);
        const url = URL.createObjectURL(blob);
        if (lastPreviewUrl.current) URL.revokeObjectURL(lastPreviewUrl.current);
        lastPreviewUrl.current = url;
        setPreviewUrl(url);
      } catch (e) {
        console.error("Contract preview failed", e);
      }
    })();
  }, [app, buildFilledPdf]);

  const form = useMemo(() => {
    if (!app) return {};
    return { ...app, ...(app.data || {}) };
  }, [app]);
  const display = useMemo(() => {
    const entityName =
      form.businessName || form.entity_name || form.entityName || "";
    const abnNumber = form.abnNumber || form.abn || form.abn_number || "";
    const installationAddress = formatAddress([
      form.streetAddress,
      form.streetAddress2,
      form.city,
      form.state,
      form.postcode,
    ]);
    const summaryAddress = form.businessAddress || installationAddress;
    const supplierAddress = formatAddress([
      form.supplierAddress,
      form.supplierCity,
      form.supplierState,
      form.supplierPostcode,
    ]);
    const financeAmountRaw = numericValue(
      form.financeAmount ||
        form.finance_amount ||
        form.totalAmount ||
        form.amount ||
        form.total ||
        form.invoiceAmount ||
        0
    );
    const baseTerm =
      form.term || form.financeTerm || form.leaseTerm || form.loanTerm || "";
    const termNumber = Number(baseTerm) || 0;
    const termString = baseTerm ? String(baseTerm) : "";
    const monthlyPaymentValue = estimateMonthlyRepayment(
      financeAmountRaw,
      termNumber,
      form.industryType
    );
    const monthlyPayment = monthlyPaymentValue
      ? toAUD(monthlyPaymentValue)
      : "";
    const equipmentItems = Array.isArray(form.equipmentItems)
      ? form.equipmentItems.map((item: any) => {
          const rawQty =
            item?.quantity !== undefined && item?.quantity !== null && item?.quantity !== ""
              ? item?.quantity
              : item?.qty;
          return {
            category: item?.category || "",
            description: item?.description || item?.asset || "",
            asset: item?.asset || "",
            quantity: rawQty !== undefined && rawQty !== null ? String(rawQty) : "",
          };
        })
      : [];
    const directors = (Array.isArray(form.directors) ? form.directors : [])
      .map((director: any) => {
        const fullName =
          director?.fullName ||
          director?.name ||
          [director?.firstName, director?.lastName].filter(Boolean).join(" ").trim();
        const date =
          director?.date ||
          director?.signatureDate ||
          director?.signedAt ||
          director?.signature_date ||
          director?.dateSigned ||
          "";
        const position = director?.position || director?.role || "Director";
        return { fullName, date, position };
      })
      .filter((d: any) => d.fullName || d.date);
    const financeAmountDisplay = financeAmountRaw
      ? toAUD(financeAmountRaw)
      : "";

    return {
      businessName: entityName,
      abnNumber,
      businessAddress: summaryAddress,
      financeAmount: financeAmountDisplay,
      term: termString,
      lessee: {
        entityName,
        installationAddress,
        phone: form.phone || form.businessPhone || form.mobile || "",
        email: form.email || form.contactEmail || "",
        abn: abnNumber,
      },
      supplier: {
        supplierName:
          form.supplierBusinessName ||
          form.vendorName ||
          form.supplierName ||
          "",
        supplierAddress,
        supplierABN: form.supplierAbn || "",
        supplierPhone: form.supplierPhone || form.vendorPhone || "",
        supplierEmail: form.supplierEmail || "",
      },
      equipmentItems,
      finance: {
        amount: financeAmountDisplay,
        term: termString,
        monthlyPayment,
        specialConditions:
          form.specialConditions ||
          form.financeSpecialConditions ||
          form.additionalInfo ||
          "",
      },
      directors,
    };
  }, [form]);

  const handleSave = async () => {
    if (!appId) return;
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setToast("Please add a signature before saving.");
      setTimeout(() => setToast(null), 3500);
      return;
    }
    setSaving(true);
    try {
      // Build filled PDF with signature
      const blob = await buildFilledPdf(display, true);

      if (isDemo) {
        // Download locally for preview, skip upload/email/status
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contract_signed_demo.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setToast('Signed contract downloaded (demo).');
        setTimeout(() => setToast(null), 2500);
        navigate('/vendor-dashboard');
        return;
      }

      // 5) Upload to storage
      const path = `applications/${appId}/contract_signed.pdf`;
      const { error: upErr } = await supabase.storage.from("uploads").upload(path, blob, {
        contentType: "application/pdf",
        upsert: true,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      // 6) Update status based on outstanding tasks
      const nextStatus = hasOutstandingTasks(form) ? "submitted" : "under_review";
      const updatedData = { ...(form || {}), contractUrl: publicUrl };
      const { error: updErr } = await supabase
        .from("application_forms")
        .update({ data: updatedData, signed_at: new Date().toISOString(), status: nextStatus })
        .eq("id", appId);
      if (updErr) throw updErr;

      // 7) Email admins
      await supabase.functions.invoke("send-email", {
        body: {
          to: ["john@asls.net.au", "admin@asls.net.au"],
          subject: `Signed Contract - Application ${appId}`,
          html: `
            <p>Contract signed for Application <strong>${appId}</strong>.</p>
            <p><a href="${publicUrl}" target="_blank">View Signed Contract</a></p>
            <p>Status set to <strong>${nextStatus}</strong>.</p>
          `,
          text: `Contract signed for Application ${appId}\nURL: ${publicUrl}\nStatus: ${nextStatus}`,
        },
      });

      setToast("Contract saved and emailed to admin.");
      setTimeout(() => setToast(null), 3000);
      navigate("/vendor-dashboard");
    } catch (e: any) {
      setError(e.message || "Failed to save contract.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }
  if (error) {
    return <div className="p-6 text-red-600">Error: {error}</div>;
  }
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto bg-white shadow rounded-2xl p-6 sm:p-8 border-t-4 border-green-600">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Contract Signature</h1>
          <p className="text-gray-600 mt-1">Please review and sign the contract. Fields are prefilled from your application.</p>
        </div>

        {pdfSrc && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800">Contract Preview</h2>
              <a href={pdfSrc} target="_blank" rel="noreferrer" className="text-green-700 underline">Open in new tab</a>
            </div>
            <div className="border rounded overflow-hidden">
              <object data={`${pdfSrc}#toolbar=1`} type="application/pdf" className="w-full h-[700px]">
                <iframe title="Contract PDF" src={pdfSrc} className="w-full h-[700px]" />
                <div className="p-4 text-sm text-gray-700">
                  Preview unavailable in this browser. <a className="text-green-700 underline" href={pdfSrc} target="_blank" rel="noreferrer">Open PDF</a>
                </div>
              </object>
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm text-gray-700 mb-6">
          <div><span className="font-semibold">Business:</span> {display.businessName}</div>
          <div><span className="font-semibold">ABN:</span> {display.abnNumber}</div>
          <div><span className="font-semibold">Address:</span> {display.businessAddress}</div>
          <div><span className="font-semibold">Finance Amount:</span> {display.financeAmount}</div>
          <div><span className="font-semibold">Term:</span> {display.term}</div>
        </div>

        <div className="mb-4">
          <label className="block font-semibold text-gray-700 mb-2">Signature</label>
          <div className="border rounded-lg bg-gray-100 p-2">
            <SignatureCanvas
              ref={sigRef}
              penColor="#0a7f2e"
              onEnd={async () => {
                try {
                  const blob = await buildFilledPdf(display, true);
                  const url = URL.createObjectURL(blob);
                  if (lastPreviewUrl.current) URL.revokeObjectURL(lastPreviewUrl.current);
                  lastPreviewUrl.current = url;
                  setPreviewUrl(url);
                } catch (err) {
                  console.error("Contract preview refresh failed", err);
                }
              }}
              canvasProps={{ width: 640, height: 180, className: "w-full h-44 bg-white rounded" }}
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2 rounded text-white ${saving ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
          >
            {saving ? "Saving…" : "Save & Send"}
          </button>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        {toast && <div className="rounded-lg px-4 py-3 shadow-lg text-white bg-emerald-600">{toast}</div>}
      </div>
    </div>
  );
};

export default ContractPage;
