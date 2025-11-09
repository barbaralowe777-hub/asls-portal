import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { supabase } from "@/lib/supabase";
import { loadTemplate, drawText, drawPng, saveToBlob } from "@/lib/pdfFill";
import { contractFieldCoords as F } from "@/config/contractFields";
import type { PDFDocument } from "pdf-lib";

type AppRow = {
  id: string;
  status?: string | null;
  data?: any;
  contract_url?: string | null;
};

const toAUD = (n?: number | string) => {
  const val = Number(n || 0);
  return val ? val.toLocaleString("en-AU", { style: "currency", currency: "AUD" }) : "";
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

  useEffect(() => {
    const load = async () => {
      if (!appId) return;
      if (isDemo) {
        try {
          const raw = sessionStorage.getItem(`demo_app_${appId}`);
          if (raw) {
            const data = JSON.parse(raw);
            setApp({ id: appId, status: 'submitted', data, contract_url: null });
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
              contract_url: null,
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
            contract_url: null,
          });
        }
        setLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from("applications")
          .select("id, status, data, contract_url")
          .eq("id", appId)
          .single();
        setApp(data as AppRow);
      } catch (err: any) {
        // If the column "data" doesn't exist yet, retry without it for preview
        try {
          const { data } = await supabase
            .from("applications")
            .select("id, status, contract_url")
            .eq("id", appId)
            .single();
          setApp((data as any) ?? { id: appId, status: 'submitted', contract_url: null, data: {} });
        } catch (e2: any) {
          setError(e2.message || 'Failed to load application.');
        }
      }
      setLoading(false);
    };
    load();
  }, [appId]);

  const buildFilledPdf = useCallback(async (data: { businessName: string; abnNumber: string; businessAddress: string; financeAmount: string; term: string }, includeSignature: boolean) => {
    // Load template (try common names)
    let doc: PDFDocument | undefined;
    const candidates = [
      "/grenke-agreement.pdf",
      "/Grenke%20Agreement.pdf",
      "/Grenke Agreement.pdf",
    ];
    let lastErr: any = null;
    for (const url of candidates) {
      try { doc = await loadTemplate(url); break; } catch (e) { lastErr = e; }
    }
    if (!doc) throw lastErr || new Error('Contract template not found in /public');

    // Draw fields
    await drawText(doc, { page: F.businessName.page, x: F.businessName.x, y: F.businessName.y, text: data.businessName, fontSize: F.businessName.fontSize });
    await drawText(doc, { page: F.abnNumber.page, x: F.abnNumber.x, y: F.abnNumber.y, text: data.abnNumber, fontSize: F.abnNumber.fontSize });
    await drawText(doc, { page: F.businessAddress.page, x: F.businessAddress.x, y: F.businessAddress.y, text: data.businessAddress, fontSize: F.businessAddress.fontSize });
    await drawText(doc, { page: F.financeAmount.page, x: F.financeAmount.x, y: F.financeAmount.y, text: data.financeAmount, fontSize: F.financeAmount.fontSize });
    await drawText(doc, { page: F.term.page, x: F.term.x, y: F.term.y, text: data.term, fontSize: F.term.fontSize });

    // In demo, annotate summary for clarity
    if (isDemo) {
      const firstPage = 0;
      const topY = 800;
      await drawText(doc, { page: firstPage, x: 40, y: topY, text: "DEMO PREVIEW", fontSize: 12 });
    }

    // Optional signature overlay for preview
    if (includeSignature && sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      const pngBytes = await (await fetch(dataUrl)).arrayBuffer();
      await drawPng(doc, { page: F.signature.page, x: F.signature.x, y: F.signature.y, width: F.signature.width, height: F.signature.height, pngBytes });
    }

    return await saveToBlob(doc);
  }, [isDemo]);

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
        // ignore, preview link still available
      }
    })();
  }, [app, buildFilledPdf]);

  const form = useMemo(() => app?.data || {}, [app]);
  const display = useMemo(() => {
    const baseTerm = form.term || form.financeTerm || form.leaseTerm || "";
    return {
      businessName: form.businessName || form.entity_name || "",
      abnNumber: form.abnNumber || form.abn || "",
      businessAddress:
        form.businessAddress ||
        [form.streetAddress, form.streetAddress2, form.city, form.state, form.postcode]
          .filter(Boolean)
          .join(" "),
      financeAmount: toAUD(form.financeAmount || form.totalAmount || form.amount || 0),
      term: baseTerm ? `${baseTerm} months` : "",
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
      const { error: updErr } = await supabase
        .from("applications")
        .update({ contract_url: publicUrl, signed_at: new Date().toISOString(), status: nextStatus })
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
                } catch {}
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
