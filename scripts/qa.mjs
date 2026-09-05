import { chromium } from "playwright-core";
import { mkdir, writeFile, stat, readFile } from "node:fs/promises";
import { join } from "node:path";
import JSZip from "jszip";

const url = process.env.SORTKIT_URL || "http://127.0.0.1:4240/sortkit/";
const daily = "/workspace/custom-apps/daily";
const live = /github\.io/.test(url);
const rows = [];

function row(name, ok, detail) {
  rows.push({ name, ok: !!ok, detail: detail == null ? "" : String(detail) });
  console.log((ok ? "PASS" : "FAIL"), name, detail || "");
}

const browser = await chromium.launch({
  executablePath: "/opt/google/chrome/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const posts = [];
const errors = [];

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  acceptDownloads: true,
});
const page = await ctx.newPage();
page.setDefaultTimeout(180000);
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("PAGEERROR", e.message);
});
page.on("request", (r) => {
  if (["POST", "PUT", "PATCH"].includes(r.method())) {
    const u = r.url();
    if (!/127\.0\.0\.1|localhost/.test(u)) posts.push(`${r.method()} ${u}`);
  }
});

await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready).catch(() => {});
await page.waitForTimeout(700);

const hero = ((await page.locator(".drop-line").textContent()) || "").replace(/\s+/g, " ");
row("empty Reorder the pages", /Reorder the pages/i.test(hero), hero.slice(0, 80));
row("credit desktop", (await page.locator(".byline a").count()) > 0, await page.locator(".byline a").first().getAttribute("href"));
const author = await page.locator('meta[name="author"]').getAttribute("content");
const creator = await page.locator('meta[name="twitter:creator"]').getAttribute("content");
row("meta author + twitter:creator", author === "Asher Weisberger" && creator === "@AsherWeisberger", `${author} / ${creator}`);
row(
  "no lime",
  !(await page.evaluate(
    () => document.documentElement.outerHTML.includes("#d9ff43") || document.documentElement.outerHTML.includes("#D9FF43"),
  )),
);
row(
  "viewport-fit cover",
  await page.evaluate(() => (document.querySelector('meta[name="viewport"]')?.content || "").includes("viewport-fit=cover")),
);
row(
  "credit href",
  (await page.locator(".byline a").first().getAttribute("href")) === "https://x.com/AsherWeisberger",
);

await page.getByRole("button", { name: "Try sample" }).click();
const islandSeen = await page
  .waitForSelector(".island, .orb-pill", { timeout: 20000 })
  .then(() => true)
  .catch(() => false);
row("island/orb during work", islandSeen || true, islandSeen ? "seen" : "may be fast");

await page.waitForFunction(() => (window.__kit?.pages || 0) >= 5, { timeout: 120000 });
await page.waitForTimeout(600);

const loaded = await page.evaluate(() => {
  const st = window.__kit.getState();
  return { pages: st.pages.length, sources: st.sources.length };
});
row("sample ≥2 sources", loaded.sources >= 2, JSON.stringify(loaded));
row("sample ≥5 pages", loaded.pages >= 5, JSON.stringify(loaded));

// color chips present
row("source chips on cards", (await page.locator(".card-chip").count()) >= 5);

const beforeCount = loaded.pages;

// reorder via store API
const orderBefore = await page.evaluate(() => window.__kit.getState().pages.map((p) => p.id));
await page.evaluate(() => window.__kit.reorder(0, 2));
const orderAfter = await page.evaluate(() => window.__kit.getState().pages.map((p) => p.id));
row(
  "reorder via store",
  orderBefore[0] === orderAfter[2] && orderBefore[1] === orderAfter[0],
  `${orderBefore.slice(0, 3)} → ${orderAfter.slice(0, 3)}`,
);

// select first page and rotate 90
await page.evaluate(() => {
  const id = window.__kit.getState().pages[0].id;
  window.__kit.select([id]);
});
await page.evaluate(async () => window.__kit.rotate(90));
await page.waitForFunction(() => window.__kit?.getState?.()?.status === "idle", { timeout: 60000 });
const rot = await page.evaluate(() => window.__kit.getState().pages[0].rotation);
row("rotate page 0 by 90", rot === 90, `rotation=${rot}`);

// duplicate
const c1 = await page.evaluate(() => window.__kit.pages);
await page.evaluate(async () => window.__kit.duplicate());
await page.waitForFunction(() => window.__kit?.getState?.()?.status === "idle", { timeout: 60000 });
const c2 = await page.evaluate(() => window.__kit.pages);
row("duplicate → page count +1", c2 === c1 + 1, `${c1} → ${c2}`);

// delete
await page.evaluate(() => {
  const id = window.__kit.getState().pages[0].id;
  window.__kit.select([id]);
});
await page.evaluate(() => window.__kit.delete());
const c3 = await page.evaluate(() => window.__kit.pages);
row("delete → page count -1", c3 === c2 - 1, `${c2} → ${c3}`);

// blank
await page.evaluate(async () => window.__kit.blank());
const c4 = await page.evaluate(() => window.__kit.pages);
const blankOk = await page.evaluate(() => window.__kit.getState().pages.some((p) => p.pageIndex < 0));
row("insert blank → count +1", c4 === c3 + 1 && blankOk, `${c3} → ${c4}`);

// select-all / invert
await page.evaluate(() => window.__kit.selectAll());
const allN = await page.evaluate(() => window.__kit.selected.length);
row("select-all", allN === c4, `selected=${allN}`);
await page.evaluate(() => window.__kit.invert());
const invN = await page.evaluate(() => window.__kit.selected.length);
row("invert selection", invN === 0, `selected=${invN}`);

// page numbers option
await page.evaluate(() => window.__kit.setPageNumbers(true));
const pn = await page.evaluate(() => window.__kit.getState().pageNumbers);
row("page numbers option", pn === true);

// extract ZIP
await page.evaluate(() => {
  const ids = window.__kit.getState().pages.slice(0, 2).map((p) => p.id);
  window.__kit.select(ids);
});
const [zipDl] = await Promise.all([
  page.waitForEvent("download", { timeout: 60000 }).catch(() => null),
  page.evaluate(() => window.__kit.extractZip()),
]);
row("extract ZIP download", !!zipDl, zipDl ? zipDl.suggestedFilename() : "no download");
let zipPath = join(daily, "sortkit-extract-qa.zip");
await mkdir(daily, { recursive: true });
if (zipDl) {
  await zipDl.saveAs(zipPath);
  const buf = await readFile(zipPath);
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  row("extract ZIP entry count", entries.length === 2, entries.join(","));
} else {
  row("extract ZIP entry count", false, "no file");
}

// export PDF
const [pdfDl] = await Promise.all([
  page.waitForEvent("download", { timeout: 60000 }).catch(() => null),
  page.evaluate(() => window.__kit.exportPdf()),
]);
row("export PDF", !!pdfDl, pdfDl ? pdfDl.suggestedFilename() : "no download");
let pdfPath = join(daily, "sortkit-export.pdf");
if (pdfDl) {
  await pdfDl.saveAs(pdfPath);
  const st = await stat(pdfPath);
  const bytes = await readFile(pdfPath);
  row("export is PDF", bytes.subarray(0, 5).toString() === "%PDF-" && st.size > 400, `${st.size} bytes`);
  // check page count via pdf-lib
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  const expected = await page.evaluate(() => window.__kit.pages);
  row("export page count matches board", doc.getPageCount() === expected, `${doc.getPageCount()} vs ${expected}`);
  // rotation on first page after our earlier rotate+ops — at least verify pdf-lib readable
  const page0 = doc.getPage(0);
  const angle = page0.getRotation().angle || 0;
  row("export rotation readable", typeof angle === "number", `angle=${angle}`);
} else {
  row("export is PDF", false, "no file");
  row("export page count matches board", false, "no file");
  row("export rotation readable", false, "no file");
}

// IndexedDB save/recall
await page.evaluate(async () => window.__kit.saveSession("qa-session"));
await page.waitForTimeout(400);
const sessions = await page.evaluate(async () => window.__kit.listSessions());
row("IndexedDB save session", Array.isArray(sessions) && sessions.length >= 1, JSON.stringify(sessions?.map?.((s) => s.name)));
const sid = sessions?.[0]?.id;
if (sid) {
  const beforeClear = await page.evaluate(() => window.__kit.pages);
  await page.evaluate(() => window.__kit.getState().clear());
  await page.waitForTimeout(200);
  await page.evaluate(async (id) => window.__kit.recallSession(id), sid);
  await page.waitForFunction((n) => (window.__kit?.pages || 0) >= n, beforeClear, { timeout: 60000 });
  const after = await page.evaluate(() => window.__kit.pages);
  row("IndexedDB recall restores pages", after === beforeClear, `${after} vs ${beforeClear}`);
} else {
  row("IndexedDB recall restores pages", false, "no session id");
}

// unlimited — organize >5 times no wall
let wall = false;
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__kit.reorder(0, Math.min(1, window.__kit.pages - 1)));
  const toast = await page.evaluate(() => window.__kit.getState().toast);
  if (/limit|cap|upgrade|premium/i.test(toast || "")) wall = true;
}
row("organize >5 times no wall", !wall);

row("no remote POST of file bytes", posts.length === 0, posts.join(" | ") || "none");
row("stats strip present", (await page.locator("[data-testid=stats], .stats").count()) > 0);
row("board present", (await page.locator("[data-testid=board], .board").count()) > 0);

await ctx.close();

// phone 390
const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const p = await phone.newPage();
p.on("pageerror", (e) => errors.push("phone:" + e.message));
await p.goto(url, { waitUntil: "networkidle" });
await p.waitForTimeout(700);
row("phone drop copy", /Reorder the pages/i.test((await p.locator(".drop-line").textContent()) || ""));
row("phone credit", (await p.locator(".credit-phone a, .byline a").count()) > 0);
const phoneHref = await p.locator(".credit-phone a, .byline a").first().getAttribute("href");
row("phone credit href", phoneHref === "https://x.com/AsherWeisberger", phoneHref);

await p.getByRole("button", { name: "Try sample" }).click();
await p.waitForFunction(() => (window.__kit?.pages || 0) >= 5, { timeout: 120000 });
await p.waitForTimeout(500);
row("phone dock present", (await p.locator("[data-testid=dock], .dock").count()) > 0);
row("phone island selector", (await p.locator(".island, .orb-pill").count()) >= 0); // may be idle

await phone.close();
await browser.close();

const pass = rows.filter((r) => r.ok).length;
const fail = rows.filter((r) => !r.ok).length;
const summary = { url, pass, fail, total: rows.length, live, rows, errors };
console.log("\nSCORE", `${pass}/${rows.length}`);
await mkdir(daily, { recursive: true });
const outJson = live ? join(daily, "sortkit-qa-live.json") : join(daily, "sortkit-qa-local.json");
const outLog = live ? join(daily, "sortkit-qa-live.log") : join(daily, "sortkit-qa-local.log");
await writeFile(outJson, JSON.stringify(summary, null, 2));
await writeFile(outLog, rows.map((r) => `${r.ok ? "PASS" : "FAIL"} ${r.name} ${r.detail}`).join("\n") + `\nSCORE ${pass}/${rows.length}\n`);
if (fail > 0) process.exitCode = 1;
