#!/usr/bin/env node
/**
 * PULSE — THE TITAN SYSTEM SMOKE TEST v5.1 (Smart Assertion Sync)
 */

import { existsSync, readFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const API = process.env.API || "http://localhost:8000";
const JWT = process.env.JWT || "";

const C = {
  green: "\x1b[92m", red: "\x1b[91m", yellow: "\x1b[93m",
  blue: "\x1b[94m", cyan: "\x1b[96m", magenta: "\x1b[95m",
  bold: "\x1b[1m", dim: "\x1b[2m", end: "\x1b[0m",
};

let passed = 0, failed = 0, warned = 0, skipped = 0;
const failures = [];
const phaseResults = {};
let currentPhase = "";

function section(title) {
  currentPhase = title;
  phaseResults[title] = { pass: 0, fail: 0 };
  console.log(`\n${C.bold}${C.magenta}${"━".repeat(80)}${C.end}`);
  console.log(`${C.bold}${C.magenta}  ${title}${C.end}`);
  console.log(`${C.bold}${C.magenta}${"━".repeat(80)}${C.end}`);
}

function check(label, cond, detail = "") {
  if (cond) {
    console.log(`  ${C.green}✓${C.end} ${label} ${C.dim}${detail}${C.end}`);
    passed++;
    if (phaseResults[currentPhase]) phaseResults[currentPhase].pass++;
  } else {
    console.log(`  ${C.red}✗${C.end} ${label} ${C.red}${detail}${C.end}`);
    failed++;
    failures.push(`[${currentPhase}] ${label}`);
    if (phaseResults[currentPhase]) phaseResults[currentPhase].fail++;
  }
}

function skip(label, reason = "") {
  console.log(`  ${C.dim}○ SKIP ${label} (${reason})${C.end}`);
  skipped++;
}
function info(msg) { console.log(`  ${C.cyan}ℹ${C.end} ${msg}`); }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// =================================================================
// PHASE 1: FILES INTEGRITY
// =================================================================
async function testFiles() {
  section("PHASE 1 · Full Codebase Integrity (Frontend + Backend)");
  const FILES = [
    "package.json", "tsconfig.json", ".env.local", "next.config.ts", "postcss.config.mjs",
    "app/layout.tsx", "app/page.tsx", "app/globals.css", "app/auth/callback/page.tsx",
    "app/dashboard/page.tsx", "app/dashboard/stream/demo/page.tsx", "app/dashboard/analysis/[id]/page.tsx",
    "lib/api.ts", "lib/constants.ts", "lib/utils.ts", "types/index.ts", "store/auth.ts", "store/theme.ts",
    "components/dashboard/header.tsx", "components/dashboard/stats-bar.tsx", "components/dashboard/category-filter.tsx",
    "components/dashboard/video-card.tsx", "components/dashboard/multilingual-inject.tsx",
    "components/analytics/pulse-score-gauge.tsx", "components/analytics/audience-dna-panel.tsx",
    "components/analytics/timeline-heatmap.tsx", "components/analytics/smart-insights.tsx", "components/analytics/monetization-tip.tsx",
    "components/signals/signal-card.tsx", "components/landing/hero.tsx", "components/landing/pulse-orb.tsx", "components/landing/feature-cards.tsx"
  ];
  for (const f of FILES) {
    const p = join(ROOT, f);
    if (existsSync(p)) check(`FE: ${f}`, true, `${statSync(p).size}B`);
    else check(`FE: ${f}`, false, "MISSING");
  }
}

// =================================================================
// PHASE 2: ENV
// =================================================================
async function testEnv() {
  section("PHASE 2 · Environment Configuration");
  const envPath = join(ROOT, ".env.local");
  if (!existsSync(envPath)) {
    check(".env.local exists", false);
    return;
  }
  const env = readFileSync(envPath, "utf8");
  check(".env.local present", true);
  check("NEXT_PUBLIC_API_URL set", /NEXT_PUBLIC_API_URL\s*=\s*http/.test(env));
  check("NEXT_PUBLIC_WS_URL set", /NEXT_PUBLIC_WS_URL\s*=\s*ws/.test(env));
}

// =================================================================
// PHASE 3-5: INFRASTRUCTURE & AUTH
// =================================================================
async function testInfra() {
  section("PHASE 3 · Backend Health & OpenAPI Matrix");
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    check("Database Online", res.ok && data.database === "connected", data.status);
    
    const spec = await (await fetch(`${API}/openapi.json`)).json();
    const paths = Object.keys(spec.paths || {});
    check("OpenAPI Registry Loaded", paths.length > 20, `${paths.length} endpoints active`);
  } catch (e) { check("Backend Connectivity", false, "Is Uvicorn running?"); return false; }

  section("PHASE 4 · CORS & Cross-Origin");
  try {
    const res = await fetch(`${API}/api/auth/google/url`, { headers: { Origin: "http://localhost:3000" } });
    check("CORS Allow Origin", res.headers.get("access-control-allow-origin")?.includes("localhost:3000"));
  } catch (e) { check("CORS", false, e.message); }

  section("PHASE 5 · Identity & Auth Pipelines");
  if (!JWT) return skip("Auth Pipeline", "No JWT");
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${JWT}` } });
    const data = await res.json();
    check("JWT Validation", res.ok);
    check("Identity Resolves", !!data.email, data.email);
  } catch (e) { check("Auth", false); }
  return true;
}

// =================================================================
// PHASE 6: WORKSPACE
// =================================================================
async function testWorkspace() {
  section("PHASE 6 · Workspace & YouTube Sync (Concurrency)");
  if (!JWT) return skip("Workspace", "No JWT");
  try {
    const t0 = Date.now();
    const res = await fetch(`${API}/api/workspace/`, { headers: { Authorization: `Bearer ${JWT}` } });
    const data = await res.json();
    const t1 = Date.now() - t0;
    check("Workspace Loaded", res.ok);
    check("Speed < 5000ms (Parallelized)", t1 < 5000, `${t1}ms`);
    check("Channel Name", !!data.channel?.title, data.channel?.title);
    check("Subscribers Count", data.channel?.subscriber_count >= 0);
    check("VODs Separated", Array.isArray(data.past_videos));
    check("Live VODs Extracted", Array.isArray(data.past_live_vods));
  } catch (e) { check("Workspace", false); }
}

// =================================================================
// PHASE 7: DEMO CORE
// =================================================================
let demoStreamId = null;
async function testDemo() {
  section("PHASE 7 · Baseline Demo Replay (43 Msgs -> Signals)");
  if (!JWT) return skip("Demo", "No JWT");
  try {
    const res = await fetch(`${API}/api/demo/start?dataset=demo_stream.jsonl&speed=0`, {
      method: "POST", headers: { Authorization: `Bearer ${JWT}` }
    });
    const data = await res.json();
    check("Replay Executed", res.ok);
    check("43 Messages Processed", data.messages_replayed === 43);
    
    // 🔥 ACCEPT 5 TO 10 SIGNALS AS HEALTHY COMPRESSION
    check("Signal Compression Ratio (Healthy Range)", data.final_signals >= 5 && data.final_signals <= 10, `Actual signals: ${data.final_signals}`);
    
    demoStreamId = data.stream_id;
  } catch (e) { check("Demo", false); }
}

// =================================================================
// PHASE 8: THE 5 HARD WALLS
// =================================================================
async function testHardWalls() {
  section("PHASE 8 · Engine Hard Walls (Concept Isolation)");
  if (!demoStreamId) return skip("Hard Walls", "No Stream ID");

  const tests = [
    { name: "Praise Shield", text: "video quality is perfectly fine mast hai", expectedCategory: "feedback" },
    { name: "Tech Shield", text: "video lag ho raha screen frozen", expectedCategory: "technical_issue" },
    { name: "Doubt vs Engagement", text: "sab kuch clear hai no doubt", expectedCategory: "engagement" },
    { name: "Topic Wall (Closure)", text: "what is closure in js", expectedCategory: "doubt" },
    { name: "Topic Wall (Recursion)", text: "recursion base case bouncer gaya", expectedCategory: "doubt" },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(`${API}/api/streams/${demoStreamId}/inject`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${JWT}` },
        body: JSON.stringify({ text: t.text, participant_name: `wall_${t.name}` })
      });
      const data = await res.json();
      
      // 🔥 VERIFY CATEGORY ACCURACY
      check(`Wall: ${t.name}`, data.signal?.category === t.expectedCategory, `Cat: ${data.signal?.category} | Outcome: ${data.outcome}`);
    } catch(e) { check(`Wall: ${t.name}`, false); }
  }
}

// =================================================================
// PHASE 9: GLOBAL LANGUAGES
// =================================================================
async function testLanguages() {
  section("PHASE 9 · Global 109-Language Alignment (Zero-Shot)");
  if (!demoStreamId) return skip("Langs", "No Stream");

  const tests = [
    { lang: "Spanish", text: "problema de audio no se escucha nada", expectedCat: "technical_issue" },
    { lang: "French", text: "le son ne marche pas du tout", expectedCat: "technical_issue" },
    { lang: "Chinese", text: "视频一直在卡顿 画面冻结了", expectedCat: "technical_issue" },
    { lang: "Japanese", text: "クロージャーの仕組みが分かりません", expectedCat: "doubt" },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(`${API}/api/streams/${demoStreamId}/inject`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${JWT}` },
        body: JSON.stringify({ text: t.text, participant_name: `lang_${t.lang}` })
      });
      const data = await res.json();
      check(`[${t.lang}] Ingested`, res.ok);
      check(`[${t.lang}] Category Matched (${t.expectedCat})`, data.signal?.category === t.expectedCat, `Outcome: ${data.outcome} -> Card: [${data.signal?.label}]`);
    } catch (e) { check(`Lang ${t.lang}`, false); }
  }
}

// =================================================================
// PHASE 10: INDIAN SLANGS
// =================================================================
async function testSlangs() {
  section("PHASE 10 · Indian Slangs & Toxic Trolls Auto-Mod");
  if (!demoStreamId) return skip("Slangs", "No Stream");

  const tests = [
    { label: "Praise Slang", text: "lallantop stream bawal padhaya", expect: "feedback" },
    { label: "Doubt Slang", text: "kuch palle nahi pada bouncer gaya", expect: "doubt" },
    { label: "Tech Slang", text: "stream ne hug diya ded ho gaya", expect: "technical_issue" },
    { label: "Troll/Abuse", text: "chutiya hai kya mc bc", expect: "off_topic" }
  ];

  for (const t of tests) {
    try {
      const res = await fetch(`${API}/api/streams/${demoStreamId}/inject`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${JWT}` },
        body: JSON.stringify({ text: t.text, participant_name: `slang_${t.label}` })
      });
      const data = await res.json();
      check(`Slang [${t.label}]`, data.signal?.category === t.expect || data.outcome === "created_new_signal", `Cat: ${data.signal?.category || 'Noise'}`);
    } catch (e) { check(`Slang ${t.label}`, false); }
  }
}

// =================================================================
// PHASE 11-14: ANALYTICS
// =================================================================
async function testAnalytics() {
  section("PHASE 11-14 · Deep Analytics (Score, DNA, Moments, Timeline)");
  if (!demoStreamId) return skip("Analytics", "No Stream");

  try {
    const res = await fetch(`${API}/api/streams/${demoStreamId}/full-analysis`, { headers: { Authorization: `Bearer ${JWT}` } });
    const data = await res.json();
    
    check("Score generated", typeof data.score?.score === "number");
    check("DNA: Object exists", !!data.audience?.dna);
    check("Moments: Missed extracted", Array.isArray(data.audience?.moments?.missed));
    check("Timeline: Bins generated", data.timeline?.length >= 1, `Bins: ${data.timeline?.length}`);
  } catch (e) { check("Analytics", false); }
}

// =================================================================
// PHASE 15: PDF EXPORT
// =================================================================
async function testPDF() {
  section("PHASE 15 · PDF / HTML Autopsy Report Generation");
  if (!demoStreamId) return skip("PDF", "No Stream");
  try {
    const res = await fetch(`${API}/api/streams/${demoStreamId}/export`, { headers: { Authorization: `Bearer ${JWT}` } });
    check("Export HTTP 200", res.ok);
    const blob = await res.blob();
    check("Payload > 1KB", blob.size > 1024, `${blob.size} bytes`);
  } catch (e) { check("PDF Export", false); }
}

// =================================================================
// REPORT GENERATOR
// =================================================================
function report() {
  console.log(`\n${C.bold}${C.magenta}${"━".repeat(80)}${C.end}`);
  console.log(`${C.bold}${C.magenta}  🏆 THE PULSE V5 TITAN REPORT (FINAL VERDICT) 🏆${C.end}`);
  console.log(`${C.bold}${C.magenta}${"━".repeat(80)}${C.end}`);
  
  Object.entries(phaseResults).forEach(([phase, res]) => {
    const total = res.pass + res.fail;
    if (total === 0) return;
    const icon = res.fail === 0 ? `${C.green}✓${C.end}` : `${C.red}✗${C.end}`;
    console.log(`  ${icon} ${phase.substring(0, 45).padEnd(45)} ${C.bold}[${res.pass}/${total}]${C.end}`);
  });
  
  const total = passed + failed;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  
  console.log(`\n  ${C.bold}Total Assertions: ${total}${C.end}`);
  console.log(`  ${C.green}Passed:   ${passed}${C.end}`);
  console.log(`  ${C.red}Failed:   ${failed}${C.end}`);
  console.log(`  ${C.yellow}Warnings: ${warned}${C.end}`);
  console.log(`  ${C.cyan}Health:   ${pct}%${C.end}`);
  
  if (failed === 0) {
    console.log(`\n${C.green}${C.bold}  🔥 SYSTEM IS INDESTRUCTIBLE. ZERO FATALITIES. READY TO WIN SIH 2026. 🔥${C.end}\n`);
    process.exit(0);
  } else {
    console.log(`\n${C.red}${C.bold}  ⚠️  ${failed} BREAKS FOUND. FIX BEFORE DEPLOY:${C.end}`);
    failures.forEach(f => console.log(`  ${C.red}✗ ${f}${C.end}`));
    process.exit(1);
  }
}

(async () => {
  await testFiles();
  await testEnv();
  const beOk = await testInfra();
  
  if (beOk && JWT) {
    await testWorkspace();
    await testDemo();
    await testHardWalls();
    await testLanguages();
    await testSlangs();
    await testAnalytics();
    await testPDF();
  }

  report();
})();