import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const targetUrl = process.argv[2] || "http://127.0.0.1:5176/";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const artifactsDir = path.resolve("artifacts");

function launchOptions() {
  return existsSync(chromePath)
    ? { executablePath: chromePath, headless: true }
    : { channel: "chrome", headless: true };
}

async function sampleCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("[data-testid='canvas-host'] canvas");
    if (!canvas) return { ok: false, reason: "missing-canvas" };

    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return { ok: false, reason: "missing-webgl-context" };

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    const points = [];
    for (let y = 0.12; y <= 0.88; y += 0.08) {
      for (let x = 0.12; x <= 0.88; x += 0.08) {
        points.push([x, y]);
      }
    }

    const pixel = new Uint8Array(4);
    const colors = [];
    let alphaSamples = 0;
    let brightSamples = 0;

    for (const [nx, ny] of points) {
      const x = Math.max(0, Math.min(width - 1, Math.floor(width * nx)));
      const y = Math.max(0, Math.min(height - 1, Math.floor(height * ny)));
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      if (pixel[3] > 0) alphaSamples += 1;
      if (pixel[0] + pixel[1] + pixel[2] > 42) brightSamples += 1;
      colors.push(`${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3]}`);
    }

    const uniqueColors = new Set(colors).size;

    return {
      ok: alphaSamples > 0 && brightSamples > 0 && uniqueColors > 4,
      width,
      height,
      alphaSamples,
      brightSamples,
      uniqueColors,
      signature: colors.join("|"),
    };
  });
}

async function readAppState(page) {
  return page.evaluate(() => {
    const app = document.querySelector("[data-testid='projection-app']");
    const canvas = document.querySelector("[data-testid='canvas-host'] canvas");
    return {
      className: app?.className ?? "",
      bodyScroll: {
        widthOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        heightOverflow: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      },
      canvasSize: canvas
        ? {
            width: canvas.clientWidth,
            height: canvas.clientHeight,
          }
        : null,
    };
  });
}

async function verifyViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto(targetUrl, { waitUntil: "networkidle" });
  const sceneCanvas = page.locator("[data-testid='canvas-host'] canvas");
  await sceneCanvas.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);

  const firstSample = await sampleCanvas(page);
  await page.screenshot({ path: path.join(artifactsDir, `${name}-light.png`), fullPage: false });
  if (!firstSample.ok) {
    throw new Error(`${name}: canvas did not pass nonblank pixel check: ${JSON.stringify(firstSample)}`);
  }

  const canvasBox = await sceneCanvas.boundingBox();
  if (!canvasBox || canvasBox.width < viewport.width * 0.85 || canvasBox.height < viewport.height * 0.85) {
    throw new Error(`${name}: canvas is not full-viewport enough: ${JSON.stringify(canvasBox)}`);
  }

  const darkButton = page.locator('button[title="Dark environment"]');
  await darkButton.click();
  await page.locator(".projection-app--dark").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(450);
  const darkSample = await sampleCanvas(page);
  await page.screenshot({ path: path.join(artifactsDir, `${name}-dark.png`), fullPage: false });
  if (!darkSample.ok) {
    throw new Error(`${name}: dark mode canvas did not pass nonblank pixel check: ${JSON.stringify(darkSample)}`);
  }

  const appState = await readAppState(page);
  if (!appState.className.includes("projection-app--dark")) {
    throw new Error(`${name}: app did not enter dark mode: ${JSON.stringify(appState)}`);
  }
  if (appState.bodyScroll.widthOverflow || appState.bodyScroll.heightOverflow) {
    throw new Error(`${name}: page-level scrolling detected: ${JSON.stringify(appState.bodyScroll)}`);
  }

  await page.mouse.move(viewport.width * 0.58, viewport.height * 0.48);
  await page.mouse.down();
  await page.mouse.move(viewport.width * 0.68, viewport.height * 0.55, { steps: 8 });
  await page.mouse.up();
  await page.mouse.wheel(0, -260);
  await page.waitForTimeout(450);

  const movedSample = await sampleCanvas(page);
  if (movedSample.signature === firstSample.signature) {
    throw new Error(`${name}: canvas signature did not change after orbit/zoom interaction`);
  }

  const overflowingControls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("button, select, output"))
      .filter((element) => element.scrollWidth > element.clientWidth + 2)
      .map((element) => element.textContent?.trim() || element.getAttribute("title") || element.tagName);
  });
  if (overflowingControls.length) {
    throw new Error(`${name}: overflowing controls: ${overflowingControls.join(", ")}`);
  }

  await page.close();

  return {
    name,
    viewport,
    canvas: { width: firstSample.width, height: firstSample.height },
    uniqueColors: firstSample.uniqueColors,
    darkUniqueColors: darkSample.uniqueColors,
    consoleErrors,
  };
}

await mkdir(artifactsDir, { recursive: true });

const browser = await chromium.launch(launchOptions());
try {
  const results = [];
  results.push(await verifyViewport(browser, "render-desktop", { width: 1440, height: 900 }));
  results.push(await verifyViewport(browser, "render-mobile", { width: 390, height: 844 }));

  const errors = results.flatMap((result) => result.consoleErrors);
  if (errors.length) {
    throw new Error(`browser console errors:\n${errors.join("\n")}`);
  }

  console.log(JSON.stringify({ ok: true, targetUrl, results }, null, 2));
} finally {
  await browser.close();
}
