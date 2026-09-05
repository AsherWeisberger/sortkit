import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sampleDir = join(root, "public", "sample");
const outIcon = join(root, "public", "apple-touch-icon.png");

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(w, h, paint) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const i = row + 1 + x * 3;
      const [r, g, b] = paint(x, y, w, h);
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const idat = deflateSync(raw, { level: 1 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("IDAT", idat), pngChunk("IEND", Buffer.alloc(0))]);
}

function makeIcon() {
  const s = 180;
  const png = encodePng(s, s, (x, y) => {
    let r = 13, g = 15, b = 20;
    // three horizontal bars like sort mark
    if (x > 42 && x < 138) {
      if (y > 54 && y < 62) { r = 217; g = 204; b = 172; }
      if (y > 84 && y < 92) { r = 140; g = 146; b = 151; }
      if (y > 114 && y < 122) { r = 240; g = 239; b = 236; }
    }
    if (x > 42 && x < 70 && y > 54 && y < 122) {
      // left accent strip
      if ((y > 54 && y < 62) || (y > 84 && y < 92) || (y > 114 && y < 122)) {
        r = 217; g = 204; b = 172;
      }
    }
    return [r, g, b];
  });
  mkdirSync(dirname(outIcon), { recursive: true });
  writeFileSync(outIcon, png);
  console.log("wrote", outIcon, png.length, "bytes");
}

async function makeAssets() {
  mkdirSync(sampleDir, { recursive: true });
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  // report.pdf — 3 pages
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const titles = ["Quarterly Report", "Findings", "Appendix"];
    for (let i = 0; i < 3; i++) {
      const p = pdf.addPage([612, 792]);
      p.drawText("SORTKIT SAMPLE · REPORT", {
        x: 48, y: 740, size: 11, font, color: rgb(0.34, 0.35, 0.38),
      });
      p.drawText(titles[i], {
        x: 48, y: 700, size: 28, font: bold, color: rgb(0.05, 0.06, 0.08),
      });
      p.drawText(`Page ${i + 1} of 3 — mix me with the invoice.`, {
        x: 48, y: 660, size: 13, font, color: rgb(0.05, 0.06, 0.08),
      });
      for (let L = 0; L < 8; L++) {
        p.drawText("Organize locally. Nothing leaves the tab. Drag, rotate, extract.", {
          x: 48, y: 600 - L * 22, size: 12, font, color: rgb(0.2, 0.21, 0.24),
        });
      }
      p.drawRectangle({
        x: 48, y: 120, width: 516, height: 180,
        color: rgb(0.85 + i * 0.03, 0.84, 0.8),
      });
    }
    const bytes = await pdf.save({ useObjectStreams: false });
    writeFileSync(join(sampleDir, "report.pdf"), bytes);
    console.log("wrote report.pdf", bytes.length);
  }

  // invoice.pdf — 2 pages
  {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    for (let i = 0; i < 2; i++) {
      const p = pdf.addPage([612, 792]);
      p.drawText("INVOICE", {
        x: 48, y: 720, size: 32, font: bold, color: rgb(0.05, 0.06, 0.08),
      });
      p.drawText(i === 0 ? "Invoice #1042 — line items" : "Invoice #1042 — totals", {
        x: 48, y: 680, size: 14, font, color: rgb(0.34, 0.35, 0.38),
      });
      const lines = i === 0
        ? ["Design desk — 12h", "Page organize pass", "Export proof pack", "Local-only processing"]
        : ["Subtotal  $1,200", "Tax            $84", "Total      $1,284", "Due on receipt"];
      lines.forEach((line, li) => {
        p.drawText(line, {
          x: 48, y: 600 - li * 28, size: 14, font, color: rgb(0.05, 0.06, 0.08),
        });
      });
      p.drawText("Sortkit sample — color chip source B", {
        x: 48, y: 48, size: 10, font, color: rgb(0.34, 0.35, 0.38),
      });
    }
    const bytes = await pdf.save({ useObjectStreams: false });
    writeFileSync(join(sampleDir, "invoice.pdf"), bytes);
    console.log("wrote invoice.pdf", bytes.length);
  }
}

makeIcon();
await makeAssets();
