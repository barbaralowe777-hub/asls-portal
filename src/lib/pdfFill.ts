import { PDFDocument, StandardFonts } from "pdf-lib";

export async function loadTemplate(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Template not found: ${url}`);
  const bytes = await res.arrayBuffer();
  return await PDFDocument.load(bytes);
}

export async function drawText(
  doc: PDFDocument,
  opts: { page: number; x: number; y: number; text: string; fontSize?: number }
) {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPage(opts.page);
  page.drawText(opts.text || "", {
    x: opts.x,
    y: opts.y,
    size: opts.fontSize || 10,
    font,
  });
}

export async function drawPng(
  doc: PDFDocument,
  opts: { page: number; x: number; y: number; width: number; height: number; pngBytes: Uint8Array | ArrayBuffer }
) {
  const png = await doc.embedPng(opts.pngBytes);
  const page = doc.getPage(opts.page);
  page.drawImage(png, {
    x: opts.x,
    y: opts.y,
    width: opts.width,
    height: opts.height,
  });
}

export async function saveToBlob(doc: PDFDocument) {
  const bytes = await doc.save();
  return new Blob([bytes], { type: "application/pdf" });
}

