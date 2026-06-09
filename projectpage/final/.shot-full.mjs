// Full-page screenshot with prefers-reduced-motion emulated so scroll-reveal
// content is visible (reveals become opacity:1 under reduced motion), letting us
// audit every section's copy/layout in one tall image. Writes to /tmp.
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FILE_URL = "file://" + process.cwd() + "/index.html";
const PORT = 9355;
const userDir = mkdtempSync(join(tmpdir(), "rho-full-"));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--no-default-browser-check", "--remote-debugging-port=" + PORT,
  "--user-data-dir=" + userDir, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl; } catch {}
    await sleep(200);
  }
  throw new Error("no CDP");
}
function cdp(ws){let id=0;const p=new Map();ws.addEventListener("message",e=>{const m=JSON.parse(e.data);
  if(m.id&&p.has(m.id)){const{resolve,reject}=p.get(m.id);p.delete(m.id);m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result);}});
  return{send:(method,params={},sessionId)=>new Promise((resolve,reject)=>{const mid=++id;p.set(mid,{resolve,reject});ws.send(JSON.stringify({id:mid,method,params,sessionId}));})};}

const shots = [
  { name: "desktop", w: 1440, h: 1200, scale: 1, mobile: false },
  { name: "mobile", w: 390, h: 844, scale: 2, mobile: true },
];
(async () => {
  const ws = new WebSocket(await getWsUrl());
  await new Promise(r => ws.addEventListener("open", r, { once: true }));
  const c = cdp(ws);
  const { targetId } = await c.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await c.send("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => c.send(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable");
  await S("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  for (const v of shots) {
    await S("Emulation.setDeviceMetricsOverride", { width: v.w, height: v.h, deviceScaleFactor: v.scale, mobile: v.mobile });
    await S("Page.navigate", { url: FILE_URL });
    await sleep(2500);
    const shot = await S("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
    const path = `/tmp/rho-full-${v.name}.png`;
    writeFileSync(path, Buffer.from(shot.data, "base64"));
    console.log(path);
  }
  chrome.kill(); ws.close(); process.exit(0);
})().catch(e => { console.error("ERR", e); chrome.kill(); process.exit(1); });
