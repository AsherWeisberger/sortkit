import JSZip from "jszip";

export async function zipBlobs(entries: { name: string; blob: Blob | Uint8Array }[]): Promise<Blob> {
  const zip = new JSZip();
  for (const e of entries) {
    zip.file(e.name, e.blob);
  }
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}
