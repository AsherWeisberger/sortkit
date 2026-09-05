import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const url = process.env.SORTKIT_URL || "http://127.0.0.1:4240/sortkit/";

const browser = await chromium.launch({
  executablePath: "/opt/google/chrome/chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
});

async function shot(path, size, withSample) {
  const ctx = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 2,
    isMobile: size.width <= 400,
    hasTouch: size.width <= 400,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  if (withSample) {
    await page.getByRole("button", { name: "Try sample" }).click();
    await page.waitForFunction(() => (window.__kit?.pages || 0) >= 5, { timeout: 120000 });
    await page.waitForTimeout(2800);
  } else {
    await page.waitForTimeout(2800);
  }
  await page.screenshot({ path, fullPage: false });
  await ctx.close();
  console.log("wrote", path);
}

await mkdir("/workspace/custom-apps/daily", { recursive: true });
await shot("/workspace/custom-apps/daily/sortkit-desktop.png", { width: 1440, height: 900 }, true);
await shot("/workspace/custom-apps/daily/sortkit-phone.png", { width: 390, height: 844 }, true);
await browser.close();
