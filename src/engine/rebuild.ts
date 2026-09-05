import { PDFDocument, StandardFonts, degrees, rgb, type PDFPage } from "pdf-lib";
import type { PageModel, SourceFile } from "../types";

export type RebuildOptions = {
  pageNumbers?: boolean;
  pageNumberStart?: number;
  pageNumberColor?: "cream" | "ink";
};

function normRot(r: number): 0 | 90 | 180 | 270 {
  const n = ((r % 360) + 360) % 360;
  if (n === 90 || n === 180 || n === 270) return n;
  return 0;
}

/**
 * Rebuild a PDF from page models. Respects rotation, blank pages, optional footers.
 * Returns Uint8Array of the new PDF.
 */
export async function rebuildPdf(
  pages: PageModel[],
  sources: SourceFile[],
  opts: RebuildOptions = {},
): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const font = opts.pageNumbers ? await out.embedFont(StandardFonts.Helvetica) : null;
  const srcCache = new Map<string, PDFDocument>();

  async function getSrc(id: string): Promise<PDFDocument | null> {
    if (srcCache.has(id)) return srcCache.get(id)!;
    const s = sources.find((x) => x.id === id);
    if (!s) return null;
    const doc = await PDFDocument.load(s.bytes.slice(), { ignoreEncryption: true });
    srcCache.set(id, doc);
    return doc;
  }

  let num = opts.pageNumberStart ?? 1;
  const cream = rgb(0.94, 0.937, 0.925);
  const ink = rgb(0.05, 0.06, 0.08);
  const color = opts.pageNumberColor === "cream" ? cream : ink;

  for (const p of pages) {
    let page: PDFPage;
    if (p.pageIndex < 0) {
      const w = p.blankW || 612;
      const h = p.blankH || 792;
      page = out.addPage([w, h]);
    } else {
      const src = await getSrc(p.sourceId);
      if (!src) continue;
      const [embedded] = await out.copyPages(src, [p.pageIndex]);
      page = out.addPage(embedded);
      const rot = normRot(p.rotation);
      if (rot) {
        const cur = page.getRotation().angle || 0;
        page.setRotation(degrees(((cur + rot) % 360 + 360) % 360));
      }
    }

    if (opts.pageNumbers && font) {
      const { width } = page.getSize();
      const label = String(num);
      const size = 10;
      const tw = font.widthOfTextAtSize(label, size);
      page.drawText(label, {
        x: (width - tw) / 2,
        y: 18,
        size,
        font,
        color,
      });
      num++;
    }
  }

  return out.save({ useObjectStreams: false });
}

/** Build a single-page PDF for one page model. */
export async function rebuildSinglePage(
  page: PageModel,
  sources: SourceFile[],
  opts: RebuildOptions = {},
): Promise<Uint8Array> {
  return rebuildPdf([page], sources, opts);
}
