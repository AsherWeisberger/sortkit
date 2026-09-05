import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let ready = false;

export function initPdfjs() {
  if (ready) return;
  GlobalWorkerOptions.workerSrc = workerSrc;
  ready = true;
}

export async function loadPdfjs(data: Uint8Array): Promise<PDFDocumentProxy> {
  initPdfjs();
  return getDocument({
    data: data.slice(),
    isEvalSupported: false,
    useSystemFonts: true,
    verbosity: 0,
  }).promise;
}

export async function getPageCount(data: Uint8Array): Promise<number> {
  const pdf = await loadPdfjs(data);
  try {
    return pdf.numPages;
  } finally {
    await pdf.destroy();
  }
}

/** Render a page with optional display rotation (0/90/180/270). */
export async function renderPageThumb(
  data: Uint8Array,
  pageNumber: number,
  cssWidth: number,
  rotation = 0,
): Promise<{ url: string; width: number; height: number; widthPt: number; heightPt: number }> {
  const pdf = await loadPdfjs(data);
  try {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1, rotation: rotation });
    const scale = cssWidth / base.width;
    const viewport = page.getViewport({ scale, rotation });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return {
      url: canvas.toDataURL("image/jpeg", 0.78),
      width: canvas.width,
      height: canvas.height,
      widthPt: base.width,
      heightPt: base.height,
    };
  } finally {
    await pdf.destroy();
  }
}

export function blankThumbUrl(w = 160, h = 220): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#F0EFEC";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(13,15,20,0.18)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.fillStyle = "rgba(87,88,96,0.7)";
  ctx.font = "12px 'IBM Plex Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Blank", w / 2, h / 2);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function yieldPaint(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}
