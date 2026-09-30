/**
 * WinGo Signal Analyzer - Full-Stack Application Server
 * Serves Vite frontend in dev/prod & handles real-time verified API calls,
 * timer synchronization, statistical signal engine, telemetry, and project ZIP exporter.
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dns from 'dns';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { spawnSync } from 'child_process';
import JSZip from 'jszip';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const APP_VERSION = '1.9.1';
const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const UPSTREAM_API_BASE = process.env.UPSTREAM_API_BASE || 'https://api.hgnicepayapi.com/api/webapi';
const UPSTREAM_API_BASES = Array.from(new Set([UPSTREAM_API_BASE, ...(process.env.UPSTREAM_API_BASES || '').split(',').map((v) => v.trim()).filter(Boolean)]));
const UPSTREAM_TIMEOUT_MS = Math.max(1500, Number(process.env.UPSTREAM_TIMEOUT_MS || 8000));
const UPSTREAM_RETRIES = Math.max(0, Math.min(2, Number(process.env.UPSTREAM_RETRIES || 1)));
const UPSTREAM_STALE_GRACE_MS = Math.max(15000, Number(process.env.UPSTREAM_STALE_GRACE_MS || 90000));
const UPSTREAM_ORIGIN = process.env.UPSTREAM_ORIGIN || 'https://hgnice.org';
const UPSTREAM_DNS_FALLBACK = !['0','false','no','off'].includes(String(process.env.UPSTREAM_DNS_FALLBACK || 'true').toLowerCase());
const UPSTREAM_DNS_SERVERS = Array.from(new Set((process.env.UPSTREAM_DNS_SERVERS || '1.1.1.1,8.8.8.8').split(',').map((v) => v.trim()).filter(Boolean)));
const UPSTREAM_DNS_CACHE_MS = Math.max(5000, Number(process.env.UPSTREAM_DNS_CACHE_MS || 60000));
const upstreamDnsCache = new Map<string, { address: string; expiresAt: number }>();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // sha256 of 'admin123'
const SITE_PASSWORD_HASH = process.env.SITE_PASSWORD_HASH || '751fd3e87272d6e5084765a6d74a0178f6fffeb757b6f556f134ebb4b88f7149'; // sha256 of 'Akib9990'
const SESSION_DURATION_MS = 3600 * 1000; // 1 hour
const SECRET_KEY = process.env.SECRET_KEY || crypto.randomBytes(32).toString('hex');
let activeUpstreamBase = UPSTREAM_API_BASE;
let lastUpstreamSuccessAt = '';
let lastUpstreamError = '';

interface ModeConfig {
  typeId: number;
  intervalSec: number;
  name: string;
}

const MODE_CONFIGS: Record<string, ModeConfig> = {
  wingo_30s: { typeId: 30, intervalSec: 30, name: 'WinGo 30 Seconds' },
  wingo_1m: { typeId: 1, intervalSec: 60, name: 'WinGo 1 Minute' },
  wingo_3m: { typeId: 2, intervalSec: 180, name: 'WinGo 3 Minutes' },
  wingo_5m: { typeId: 3, intervalSec: 300, name: 'WinGo 5 Minutes' },
};

// In-memory cache & telemetry
interface TelemetryRecord {
  id: number;
  timestamp: string;
  endpoint: string;
  latencyMs: number;
  clockDriftMs: number;
  isSuccess: boolean;
  error?: string;
}

const telemetryLogs: TelemetryRecord[] = [];
let telemetryIdCounter = 1;
let serverClockDriftMs = 0;
let lastSyncTimestamp = '';

// Mode stores
interface DrawRecord {
  issueNumber: string;
  number: number;
  colour: string;
  colors: string[];
  size: 'Big' | 'Small';
  premium?: string;
  createdAt: string;
  resultTime?: string;
}

export interface NextSignal {
  currentPeriod: string;
  targetPeriod: string;
  generatedAt: string;
  lockStatus: 'LOCKED';
  size: 'BIG' | 'SMALL' | null;
  color: 'GREEN' | 'RED' | null;
  number: number | null;
  status: 'VALID ESTIMATE' | 'INSUFFICIENT DATA';
  estimatedProbability: string;
  probabilityPercent: number;
  longTermTrend?: string;
  fiveHourTrend?: string;
  uncertaintyNote?: string;
  reasoning: string;
}

export interface WindowAnalysis {
  periodsAnalyzed: number;
  windowLabel: string;
  bigCount: number;
  bigPercentage: number;
  smallCount: number;
  smallPercentage: number;
  redCount: number;
  redPercentage: number;
  greenCount: number;
  greenPercentage: number;
  numberFrequency: Record<number, number>;
  mostFrequent: { number: number; count: number };
  leastFrequent: { number: number; count: number };
  dataStatus: string;
}

export interface CompactAnalysisData {
  gameMode: string;
  last1000: WindowAnalysis;
  last5Hours: WindowAnalysis;
  updatedAt: string;
}

interface IssueState {
  gameMode: string;
  typeId: number;
  issueNumber: string;
  nextIssueNumber?: string;
  startTime: string;
  endTime: string;
  serverTime: string;
  intervalSeconds: number;
  remainingSeconds: number;
  endTimestampMs: number;
  serverTimestampMs: number;
  serverNowTimestampMs?: number;
  nextSignal?: NextSignal;
  compactAnalysis?: CompactAnalysisData;
  status: string;
  dataSource: string;
  isLive: boolean;
  lastSynced: string;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const PERSISTENT_DB_PATH = path.join(DATA_DIR, 'draw_records.json');

// Initialize persistent data directory
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing persisted records
const cachedHistory: Record<string, DrawRecord[]> = {
  wingo_30s: [],
  wingo_1m: [],
  wingo_3m: [],
  wingo_5m: [],
};

try {
  if (fs.existsSync(PERSISTENT_DB_PATH)) {
    const raw = fs.readFileSync(PERSISTENT_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const k of Object.keys(MODE_CONFIGS)) {
      if (Array.isArray(parsed[k])) {
        cachedHistory[k] = parsed[k];
      }
    }
  }
} catch (e) {
  console.warn('[Storage] Could not load draw_records.json, initializing fresh store.');
}

function persistRecordsToDisk() {
  try {
    fs.writeFileSync(PERSISTENT_DB_PATH, JSON.stringify(cachedHistory, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[Storage Error] Failed to persist records:', err.message);
  }
}

const cachedIssues: Record<string, IssueState> = {};
const lastPollTimestamps: Record<string, number> = {};
const pythonSignalCache: Record<string, { period: string; signal: NextSignal }> = {};
const SIGNAL_LOCKS_PATH = path.join(DATA_DIR, 'signal_locks_v1_9_1.json');
const signalLocks: Record<string, Record<string, NextSignal>> = {
  wingo_30s: {}, wingo_1m: {}, wingo_3m: {}, wingo_5m: {},
};
try {
  if (fs.existsSync(SIGNAL_LOCKS_PATH)) {
    const parsed = JSON.parse(fs.readFileSync(SIGNAL_LOCKS_PATH, 'utf-8'));
    for (const k of Object.keys(MODE_CONFIGS)) {
      if (parsed?.[k] && typeof parsed[k] === 'object') signalLocks[k] = parsed[k];
    }
  }
} catch {
  console.warn('[Signal Lock] Could not load signal_locks.json; starting with empty locks.');
}
function persistSignalLocks() {
  try {
    fs.writeFileSync(SIGNAL_LOCKS_PATH, JSON.stringify(signalLocks, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[Signal Lock] Failed to persist locks:', err?.message || err);
  }
}
function pruneSignalLocks(mode: string) {
  const entries = Object.entries(signalLocks[mode] || {});
  if (entries.length <= 120) return;
  entries.sort((a, b) => String(a[1].generatedAt).localeCompare(String(b[1].generatedAt)));
  for (const [key] of entries.slice(0, entries.length - 120)) delete signalLocks[mode][key];
}

// Helper: MD5 Spark Signer matching upstream contract
function generateSignedPayload(params: Record<string, any>) {
  const data: Record<string, any> = { ...params };
  data.language = 0; // English
  data.random = crypto.randomUUID().replace(/-/g, '');

  const filtered: Record<string, any> = {};
  const sortedKeys = Object.keys(data).sort();
  for (const k of sortedKeys) {
    const val = data[k];
    if (val !== null && val !== undefined && val !== '' && !['signature', 'track', 'xosoBettingData'].includes(k)) {
      filtered[k] = val === 0 ? 0 : val;
    }
  }

  const jsonStr = JSON.stringify(filtered);
  data.signature = crypto.createHash('md5').update(jsonStr).digest('hex').toUpperCase();
  data.timestamp = Math.floor(Date.now() / 1000);
  return data;
}

async function resolveUpstreamHost(hostname: string): Promise<{ address: string; source: 'system' | 'custom-dns' }> {
  const cached = upstreamDnsCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) return { address: cached.address, source: 'custom-dns' };

  try {
    const result = await dns.promises.lookup(hostname, { family: 4 });
    upstreamDnsCache.set(hostname, { address: result.address, expiresAt: Date.now() + UPSTREAM_DNS_CACHE_MS });
    return { address: result.address, source: 'system' };
  } catch (systemErr) {
    if (!UPSTREAM_DNS_FALLBACK || UPSTREAM_DNS_SERVERS.length === 0) throw systemErr;
    const resolver = new dns.promises.Resolver();
    resolver.setServers(UPSTREAM_DNS_SERVERS);
    const addresses = await resolver.resolve4(hostname);
    if (!addresses.length) throw new Error(`No IPv4 address found for ${hostname} using ${UPSTREAM_DNS_SERVERS.join(', ')}`);
    const address = addresses[0];
    upstreamDnsCache.set(hostname, { address, expiresAt: Date.now() + UPSTREAM_DNS_CACHE_MS });
    return { address, source: 'custom-dns' };
  }
}

function postJsonWithDnsFallback(urlString: string, body: string): Promise<{ statusCode: number; statusMessage?: string; data: any; dnsSource: string }> {
  return new Promise(async (resolve, reject) => {
    let parsed: URL;
    try { parsed = new URL(urlString); } catch (e) { reject(e); return; }
    let resolvedHost = parsed.hostname;
    let dnsSource = 'system';
    try {
      const resolved = await resolveUpstreamHost(parsed.hostname);
      resolvedHost = resolved.address;
      dnsSource = resolved.source;
    } catch (dnsErr: any) {
      reject(new Error(`DNS resolution failed for ${parsed.hostname}: ${dnsErr?.message || dnsErr}`));
      return;
    }

    const transport = parsed.protocol === 'http:' ? http : https;
    const req = transport.request({
      protocol: parsed.protocol,
      hostname: resolvedHost,
      port: parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      method: 'POST',
      servername: parsed.hostname,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json;charset=UTF-8',
        'Accept': 'application/json, text/plain, */*',
        'Origin': UPSTREAM_ORIGIN,
        'Referer': `${UPSTREAM_ORIGIN}/`,
        'Ar-Origin': UPSTREAM_ORIGIN,
        'Host': parsed.host,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: UPSTREAM_TIMEOUT_MS,
      rejectUnauthorized: true,
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
          reject(new Error(`HTTP error ${response.statusCode || 0}: ${response.statusMessage || ''}`.trim()));
          return;
        }
        try {
          resolve({ statusCode: response.statusCode || 200, statusMessage: response.statusMessage, data: JSON.parse(raw), dnsSource });
        } catch {
          reject(new Error('Upstream returned a non-JSON response'));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Upstream request timed out after ${UPSTREAM_TIMEOUT_MS}ms`)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Upstream caller: retry configured gateways, with DNS fallback when the host's normal resolver fails.
async function callUpstream(endpoint: string, params: Record<string, any>): Promise<any> {
  const signed = generateSignedPayload(params);
  const body = JSON.stringify(signed);
  let lastError: Error | null = null;

  for (const base of UPSTREAM_API_BASES) {
    for (let attempt = 0; attempt <= UPSTREAM_RETRIES; attempt++) {
      const url = `${base}${endpoint}`;
      const start = Date.now();
      try {
        const result = await postJsonWithDnsFallback(url, body);
        const latency = Date.now() - start;
        const midpointNow = start + Math.floor(latency / 2);
        const data = result.data;

        if (data.serviceNowTime) {
          try {
            const [datePart, timePart] = data.serviceNowTime.split(' ');
            const [y, m, d] = datePart.split('-').map(Number);
            const [hr, min, sec] = timePart.split(':').map(Number);
            const serverUtcEpoch = Date.UTC(y, m - 1, d, hr - 6, min, sec);
            serverClockDriftMs = serverUtcEpoch - midpointNow;
          } catch {}
        }

        activeUpstreamBase = base;
        lastUpstreamSuccessAt = new Date().toISOString();
        lastUpstreamError = '';
        lastSyncTimestamp = lastUpstreamSuccessAt;
        logTelemetry(endpoint, latency, true, serverClockDriftMs);
        return data;
      } catch (err: any) {
        lastError = err instanceof Error ? err : new Error(String(err));
        lastUpstreamError = lastError.message;
        logTelemetry(endpoint, Date.now() - start, false, serverClockDriftMs, `${base}: ${lastError.message}`);
        if (attempt < UPSTREAM_RETRIES) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
  throw new Error(`All configured upstream gateways failed. Last error: ${lastError?.message || 'unknown error'}`);
}

function getStaleScheduleFallback(mode: string, serverNowMs: number): { issue: IssueState; history: DrawRecord[] } | null {
  const cached = cachedIssues[mode];
  if (!cached || !Number.isFinite(cached.endTimestampMs)) return null;

  const config = MODE_CONFIGS[mode];
  if (!config) return null;

  const ageSinceLastVerified = Math.max(0, serverNowMs - cached.endTimestampMs);
  if (ageSinceLastVerified > UPSTREAM_STALE_GRACE_MS) return null;

  // Short network outage protection: continue the already-verified fixed schedule
  // from the last upstream snapshot instead of showing a fake zero timer/offline state.
  let steps = 0;
  if (serverNowMs >= cached.endTimestampMs) {
    steps = Math.floor((serverNowMs - cached.endTimestampMs) / (config.intervalSec * 1000)) + 1;
  }

  let issueNumber = cached.issueNumber;
  try {
    issueNumber = (BigInt(cached.issueNumber) + BigInt(steps)).toString();
  } catch {
    if (steps > 0) return null;
  }

  const startTimestampMs = cached.endTimestampMs + Math.max(0, steps - 1) * config.intervalSec * 1000;
  const endTimestampMs = startTimestampMs + config.intervalSec * 1000;
  let nextIssueNumber = issueNumber;
  try { nextIssueNumber = (BigInt(issueNumber) + 1n).toString(); } catch {}

  const issue: IssueState = {
    ...cached,
    issueNumber,
    nextIssueNumber,
    startTime: new Date(startTimestampMs).toISOString(),
    endTime: new Date(endTimestampMs).toISOString(),
    serverTime: new Date(serverNowMs).toISOString(),
    remainingSeconds: Math.max(0, Math.floor((endTimestampMs - serverNowMs) / 1000)),
    endTimestampMs,
    serverTimestampMs: serverNowMs,
    serverNowTimestampMs: serverNowMs,
    status: 'SCHEDULE_FALLBACK',
    dataSource: `${cached.dataSource} · last verified schedule snapshot`,
    isLive: false,
    lastSynced: cached.lastSynced,
    nextSignal: runPythonSignal(mode, issueNumber, cachedHistory[mode] || [], serverNowMs),
  };

  return { issue, history: cachedHistory[mode] || [] };
}

function logTelemetry(endpoint: string, latencyMs: number, isSuccess: boolean, clockDriftMs: number, error?: string) {
  telemetryLogs.unshift({
    id: telemetryIdCounter++,
    timestamp: new Date().toISOString(),
    endpoint,
    latencyMs,
    clockDriftMs,
    isSuccess,
    error,
  });
  if (telemetryLogs.length > 50) {
    telemetryLogs.pop();
  }
}

// Classifiers
function classifyColor(num: number): string[] {
  if (num === 0) return ['red', 'violet'];
  if (num === 5) return ['green', 'violet'];
  if ([1, 3, 7, 9].includes(num)) return ['green'];
  return ['red'];
}

function classifySize(num: number): 'Big' | 'Small' {
  return num >= 5 ? 'Big' : 'Small';
}

function parseUpstreamLocalTimestamp(value: string | undefined): number {
  if (!value) return NaN;
  const text = String(value).trim();
  if (!text) return NaN;

  // Preserve explicit timezone/UTC timestamps when supplied by the upstream.
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  // HGNICE commonly returns Bangladesh local time without an offset.
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (m) {
    const [, y, mo, d, h, mi, sec, ms = '0'] = m;
    return Date.UTC(
      Number(y), Number(mo) - 1, Number(d), Number(h) - 6, Number(mi), Number(sec),
      Number(ms.padEnd(3, '0'))
    );
  }

  const fallback = Date.parse(text);
  return Number.isFinite(fallback) ? fallback : NaN;
}

function fallbackSignal(targetPeriod: string, records: DrawRecord[]): NextSignal {
  const clean = records
    .filter((r) => Number.isInteger(r.number) && r.number >= 0 && r.number <= 9)
    .slice(0, 1000);
  const generatedAt = new Date().toISOString();
  if (clean.length < 60) {
    return {
      currentPeriod: targetPeriod, targetPeriod, generatedAt, lockStatus: 'LOCKED',
      size: null, color: null, number: null,
      status: 'INSUFFICIENT DATA', estimatedProbability: 'NOT CALIBRATED',
      probabilityPercent: 0, reasoning: `Only ${clean.length} verified results are available; at least 60 are required.`,
      uncertaintyNote: 'Not enough verified history for a statistical estimate.'
    };
  }
  const scores = Array.from({ length: 10 }, () => 1);
  clean.forEach((r, i) => {
    const w = Math.exp(-0.035 * i);
    scores[r.number] += 0.28 * w;
  });
  const recent = clean.slice(0, 100);
  recent.forEach((r, i) => {
    const w = Math.exp(-0.045 * i);
    scores[r.number] += 0.18 * w;
  });
  const previous = clean[0]?.number;
  if (Number.isInteger(previous)) {
    for (let i = 0; i < clean.length - 1; i++) {
      if (clean[i + 1].number === previous) scores[clean[i].number] += 0.18;
    }
  }
  for (let n = 0; n < 10; n++) {
    scores[n] += clean.slice(0, 20).filter(r => r.number === n).length * 0.08;
  }
  const number = scores.reduce((best, score, n) => score > scores[best] ? n : best, 0);
  const size = number >= 5 ? 'BIG' : 'SMALL';
  const color = [1, 3, 7, 9, 5].includes(number) ? 'GREEN' : 'RED';
  const sorted = [...scores].sort((a, b) => b - a);
  const strength = Math.min(99, 50 + Math.max(0, sorted[0] - sorted[1]) * 8);
  return {
    currentPeriod: targetPeriod, targetPeriod, generatedAt, lockStatus: 'LOCKED',
    size, color, number, status: 'VALID ESTIMATE',
    estimatedProbability: `MODEL AGREEMENT ${strength.toFixed(1)}%`, probabilityPercent: Number(strength.toFixed(2)),
    reasoning: 'Python engine unavailable; deterministic full 0-9 fallback from verified historical results. Signal is locked to the CURRENT period.',
    uncertaintyNote: 'Fallback model agreement is not an outcome probability and cannot guarantee accuracy or profit.'
  };
}

function runPythonSignal(mode: string, targetPeriod: string, records: DrawRecord[], analysisAnchorMs?: number): NextSignal {
  const locked = signalLocks[mode]?.[targetPeriod];
  if (locked) {
    pythonSignalCache[mode] = { period: targetPeriod, signal: locked };
    return locked;
  }
  const cached = pythonSignalCache[mode];
  if (cached && cached.period === targetPeriod) return cached.signal;
  const input = JSON.stringify({
    current_period: targetPeriod,
    target_period: targetPeriod,
    records: records.slice(0, 1000).map((r) => ({
      issue_number: r.issueNumber, number: r.number, colors: r.colors, size: r.size,
      // Never substitute ingestion time for a historical result time.
      // Doing so makes every seeded record look like it happened in the last few minutes.
      result_time: r.resultTime || undefined,
    })),
    analysis_anchor_time: Number.isFinite(analysisAnchorMs) ? new Date(analysisAnchorMs as number).toISOString() : undefined,
  });
  let signal: NextSignal | null = null;
  try {
    const proc = spawnSync(PYTHON_BIN, [path.resolve(__dirname, 'backend', 'predict_cli.py')], {
      input, encoding: 'utf8', timeout: 5000,
      env: { ...process.env, PYTHONPATH: path.resolve(__dirname, 'backend') },
    });
    if (!proc.error && proc.status === 0) {
      signal = JSON.parse((proc.stdout || '').trim()) as NextSignal;
    } else {
      console.warn(`[Signal Engine] Python unavailable for ${mode}; using deterministic fallback.`);
    }
  } catch (err: any) {
    console.warn(`[Signal Engine] Python error for ${mode}; using deterministic fallback: ${err?.message || err}`);
  }
  if (!signal) signal = fallbackSignal(targetPeriod, records);
  signal.currentPeriod = targetPeriod;
  signal.targetPeriod = targetPeriod;
  signal.generatedAt = signal.generatedAt || new Date().toISOString();
  signal.lockStatus = 'LOCKED';
  signal.reasoning = `${signal.reasoning || 'Statistical estimate from verified historical results.'} Locked for target period ${targetPeriod}.`;
  signalLocks[mode][targetPeriod] = signal;
  pruneSignalLocks(mode);
  persistSignalLocks();
  pythonSignalCache[mode] = { period: targetPeriod, signal };
  return signal;
}

// Sync mode data
async function syncModeData(mode: string, force = false): Promise<{ issue: IssueState; history: DrawRecord[] }> {
  const config = MODE_CONFIGS[mode];
  if (!config) throw new Error(`Invalid mode: ${mode}`);

  const now = Date.now();
  const lastPoll = lastPollTimestamps[mode] || 0;
  if (!force && now - lastPoll < 2000 && cachedIssues[mode]) {
    return { issue: cachedIssues[mode], history: cachedHistory[mode] || [] };
  }

  // 1. Fetch current issue
  const issueResp = await callUpstream('/GetGameIssue', { typeId: config.typeId });
  if (issueResp.code !== 0 || !issueResp.data) {
    throw new Error(issueResp.msg || 'Failed to fetch current issue');
  }

  const d = issueResp.data;
  const srvTimeStr = d.serviceTime || issueResp.serviceNowTime || '';
  const endTimeStr = d.endTime || '';

  const endTimestampMs = parseUpstreamLocalTimestamp(endTimeStr);
  const serverTimestampMs = parseUpstreamLocalTimestamp(srvTimeStr);
  if (!Number.isFinite(endTimestampMs) || !Number.isFinite(serverTimestampMs)) {
    throw new Error('Invalid upstream time fields; refusing to fabricate a countdown.');
  }
  const remaining = Math.max(0, Math.floor((endTimestampMs - serverTimestampMs) / 1000));

  let nextIssueNumber = '';
  try {
    const p = BigInt(d.issueNumber);
    nextIssueNumber = (p + 1n).toString();
  } catch {
    nextIssueNumber = `${d.issueNumber} + 1`;
  }

  const issueState: IssueState = {
    gameMode: mode,
    typeId: config.typeId,
    issueNumber: d.issueNumber,
    nextIssueNumber,
    startTime: d.startTime,
    endTime: endTimeStr,
    serverTime: srvTimeStr,
    intervalSeconds: config.intervalSec,
    remainingSeconds: remaining,
    endTimestampMs,
    serverTimestampMs,
    serverNowTimestampMs: serverTimestampMs,
    status: 'LIVE_SOURCE',
    dataSource: `Configured upstream gateway: ${activeUpstreamBase}`,
    isLive: true,
    lastSynced: new Date().toISOString(),
  };

  // 2. Fetch history (page 1 with up to 100 records)
  const histResp = await callUpstream('/GetNoaverageEmerdList', {
    typeId: config.typeId,
    pageNo: 1,
    pageSize: 100,
  });

  const rawList = histResp.data?.list || [];
  const fetched: DrawRecord[] = rawList.map((item: any) => {
    const num = parseInt(item.number, 10) || 0;
    const colStr = item.colour || '';
    const colors = colStr.split(',').map((c: string) => c.trim()).filter(Boolean);
    return {
      issueNumber: item.issueNumber,
      number: num,
      colour: colStr,
      colors: colors.length > 0 ? colors : classifyColor(num),
      size: classifySize(num),
      premium: item.premium || String(num),
      createdAt: new Date().toISOString(),
      resultTime: item.resultTime || item.createTime || item.openTime || item.endTime || item.time || item.dateTime || item.drawTime || undefined,
    };
  });

  // Deduplicate and merge with existing records
  const existingMap = new Map<string, DrawRecord>();
  for (const rec of (cachedHistory[mode] || [])) {
    existingMap.set(rec.issueNumber, rec);
  }
  for (const rec of fetched) {
    existingMap.set(rec.issueNumber, rec);
  }

  let mergedHistory = Array.from(existingMap.values()).sort((a, b) => {
    try {
      const diff = BigInt(b.issueNumber) - BigInt(a.issueNumber);
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    } catch {
      return b.issueNumber.localeCompare(a.issueNumber);
    }
  });

  // Build a real 1000-period window when the upstream supports pagination.
  const missingHistoricalTimestamps = mergedHistory.slice(0, 1000).some((r) => !r.resultTime);
  if (mergedHistory.length < 1000 || missingHistoricalTimestamps) {
    mergedHistory = await seedHistoryForMode(mode, config, mergedHistory);
  }

  // Only completed periods may feed analysis/prediction. If an upstream list
  // briefly contains the currently running issue, exclude it to prevent result leakage.
  const completedHistory = mergedHistory.filter((r) => {
    try { return BigInt(r.issueNumber) < BigInt(d.issueNumber); }
    catch { return r.issueNumber !== d.issueNumber; }
  });

  // Calculate Last 1000 periods and Last 5 Hours analyses from completed results.
  const last1000 = computeWindowAnalysis(completedHistory.slice(0, 1000), 'LAST 1000 PERIODS');
  const nowServerMs = serverTimestampMs;
  const fiveHourRecords = completedHistory.filter((r) => {
    const t = parseUpstreamLocalTimestamp(r.resultTime);
    return Number.isFinite(t) && t <= nowServerMs && t >= nowServerMs - 5 * 60 * 60 * 1000;
  });
  const last5Hours = computeWindowAnalysis(fiveHourRecords, 'LAST 5 HOURS (timestamp filtered)');

  const compactAnalysis: CompactAnalysisData = {
    gameMode: mode,
    last1000,
    last5Hours,
    updatedAt: new Date().toISOString(),
  };

  // Calculate ONE locked signal for the CURRENT running period.
  // It uses only completed history and remains fixed while this HGNICE period runs.
  // A new period gets a new lock key, so it cannot inherit the previous period's signal.
  issueState.nextSignal = runPythonSignal(mode, d.issueNumber, completedHistory, serverTimestampMs);
  issueState.compactAnalysis = compactAnalysis;

  cachedIssues[mode] = issueState;
  cachedHistory[mode] = completedHistory.slice(0, 1500);
  lastPollTimestamps[mode] = now;
  persistRecordsToDisk();

  return { issue: issueState, history: completedHistory };
}

// Helper: Seed up to 1000 verified historical records across multiple pages
async function seedHistoryForMode(mode: string, config: ModeConfig, currentList: DrawRecord[]): Promise<DrawRecord[]> {
  const existingMap = new Map<string, DrawRecord>();
  for (const rec of currentList) {
    existingMap.set(rec.issueNumber, rec);
  }

  for (let page = 2; page <= 10; page++) {
    try {
      const resp = await callUpstream('/GetNoaverageEmerdList', {
        typeId: config.typeId,
        pageNo: page,
        pageSize: 100,
      });
      const list = resp.data?.list || [];
      if (list.length === 0) break;
      for (const item of list) {
        const num = parseInt(item.number, 10) || 0;
        const colStr = item.colour || '';
        const colors = colStr.split(',').map((c: string) => c.trim()).filter(Boolean);
        existingMap.set(item.issueNumber, {
          issueNumber: item.issueNumber,
          number: num,
          colour: colStr,
          colors: colors.length > 0 ? colors : classifyColor(num),
          size: classifySize(num),
          premium: item.premium || String(num),
          createdAt: new Date().toISOString(),
          resultTime: item.resultTime || item.createTime || item.openTime || item.endTime || item.time || item.dateTime || item.drawTime || item.date || undefined,
        });
      }
      if (list.length < 100) break;
    } catch {
      break;
    }
  }

  return Array.from(existingMap.values()).sort((a, b) => {
    try {
      const diff = BigInt(b.issueNumber) - BigInt(a.issueNumber);
      return diff > 0n ? 1 : diff < 0n ? -1 : 0;
    } catch {
      return b.issueNumber.localeCompare(a.issueNumber);
    }
  });
}

// Compute comprehensive analysis for a given historical window
function computeWindowAnalysis(records: DrawRecord[], label: string): WindowAnalysis {
  const count = records.length;
  const emptyFreq: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) emptyFreq[i] = 0;

  if (count === 0) {
    return {
      periodsAnalyzed: 0,
      windowLabel: label,
      bigCount: 0,
      bigPercentage: 0,
      smallCount: 0,
      smallPercentage: 0,
      redCount: 0,
      redPercentage: 0,
      greenCount: 0,
      greenPercentage: 0,
      numberFrequency: emptyFreq,
      mostFrequent: { number: 0, count: 0 },
      leastFrequent: { number: 0, count: 0 },
      dataStatus: 'DATA UNAVAILABLE',
    };
  }

  let bigCount = 0;
  let smallCount = 0;
  let redCount = 0;
  let greenCount = 0;
  const freq: Record<number, number> = { ...emptyFreq };

  for (const r of records) {
    if (r.size === 'Big') bigCount++;
    else smallCount++;

    if (r.colors.includes('red')) redCount++;
    if (r.colors.includes('green')) greenCount++;

    if (r.number >= 0 && r.number <= 9) {
      freq[r.number]++;
    }
  }

  let mostNum = 0, maxF = -1;
  let leastNum = 0, minF = 999999;
  for (let i = 0; i <= 9; i++) {
    if (freq[i] > maxF) {
      maxF = freq[i];
      mostNum = i;
    }
    if (freq[i] < minF) {
      minF = freq[i];
      leastNum = i;
    }
  }

  return {
    periodsAnalyzed: count,
    windowLabel: label,
    bigCount,
    bigPercentage: Math.round((bigCount / count) * 1000) / 10,
    smallCount,
    smallPercentage: Math.round((smallCount / count) * 1000) / 10,
    redCount,
    redPercentage: Math.round((redCount / count) * 1000) / 10,
    greenCount,
    greenPercentage: Math.round((greenCount / count) * 1000) / 10,
    numberFrequency: freq,
    mostFrequent: { number: mostNum, count: maxF },
    leastFrequent: { number: leastNum, count: minF },
    dataStatus: 'UPSTREAM DATA',
  };
}

// Signal generation is delegated to the Python engine via runPythonSignal().

// Statistical Analysis Engine
function analyzeHistoryData(gameMode: string, records: DrawRecord[]) {
  const total = records.length;
  if (total < 5) {
    return {
      gameMode,
      totalRoundsAnalyzed: total,
      analysisStatus: 'INSUFFICIENT DATA FOR ANALYSIS',
      sampleWindow: `${total} rounds`,
      educationalDisclaimer: 'EDUCATIONAL STATISTICAL ANALYSIS ONLY: Independent random trials.',
      numberFrequency: Array.from({ length: 10 }, () => 0),
      numberPercentages: Array.from({ length: 10 }, () => 0),
      sizeDistribution: { Big: 0, Small: 0 },
      sizePercentages: { Big: 0, Small: 0 },
      colorDistribution: { green: 0, red: 0, violet: 0 },
      colorPercentages: { green: 0, red: 0, violet: 0 },
      hotNumbers: [],
      coldNumbers: [],
      currentSizeStreak: { size: 'None', count: 0 },
      currentColorStreak: { color: 'None', count: 0 },
      streakRecords: { maxBig: 0, maxSmall: 0, maxGreen: 0, maxRed: 0 },
      statisticalEntropy: 0,
    };
  }

  const freq = Array(10).fill(0);
  const sizeCounts = { Big: 0, Small: 0 };
  const colorCounts = { green: 0, red: 0, violet: 0 };

  // Calculate streaks
  let maxBig = 0, maxSmall = 0, maxGreen = 0, maxRed = 0;
  let curSize = '', curSizeCount = 0;
  let curColor = '', curColorCount = 0;

  for (let i = records.length - 1; i >= 0; i--) {
    const r = records[i];
    // Size streak
    if (r.size === curSize) {
      curSizeCount++;
    } else {
      curSize = r.size;
      curSizeCount = 1;
    }
    if (curSize === 'Big') maxBig = Math.max(maxBig, curSizeCount);
    if (curSize === 'Small') maxSmall = Math.max(maxSmall, curSizeCount);

    // Color streak
    const primaryCol = r.colors[0] || 'green';
    if (primaryCol === curColor) {
      curColorCount++;
    } else {
      curColor = primaryCol;
      curColorCount = 1;
    }
    if (curColor === 'green') maxGreen = Math.max(maxGreen, curColorCount);
    if (curColor === 'red') maxRed = Math.max(maxRed, curColorCount);
  }

  // Current active streak from top
  const latestSize = records[0].size;
  let activeSizeStreak = 0;
  for (const r of records) {
    if (r.size === latestSize) activeSizeStreak++;
    else break;
  }

  const latestColor = records[0].colors[0] || 'green';
  let activeColorStreak = 0;
  for (const r of records) {
    if (r.colors.includes(latestColor)) activeColorStreak++;
    else break;
  }

  records.forEach((r) => {
    freq[r.number]++;
    sizeCounts[r.size]++;
    r.colors.forEach((c) => {
      if (c in colorCounts) {
        colorCounts[c as keyof typeof colorCounts]++;
      }
    });
  });

  const numPct = freq.map((cnt) => parseFloat(((cnt / total) * 100).toFixed(1)));
  const sizePct = {
    Big: parseFloat(((sizeCounts.Big / total) * 100).toFixed(1)),
    Small: parseFloat(((sizeCounts.Small / total) * 100).toFixed(1)),
  };
  const colorPct = {
    green: parseFloat(((colorCounts.green / total) * 100).toFixed(1)),
    red: parseFloat(((colorCounts.red / total) * 100).toFixed(1)),
    violet: parseFloat(((colorCounts.violet / total) * 100).toFixed(1)),
  };

  // Hot & cold numbers
  const indexed = freq.map((count, num) => ({ num, count }));
  indexed.sort((a, b) => b.count - a.count);
  const hotNumbers = indexed.slice(0, 3).map((x) => x.num);
  const coldNumbers = indexed.slice(-3).map((x) => x.num).reverse();

  // Shannon Entropy
  let entropy = 0;
  freq.forEach((cnt) => {
    if (cnt > 0) {
      const p = cnt / total;
      entropy -= p * Math.log2(p);
    }
  });

  return {
    gameMode,
    totalRoundsAnalyzed: total,
    analysisStatus: 'ANALYSIS AVAILABLE',
    sampleWindow: `${total} verified rounds`,
    educationalDisclaimer:
      "EDUCATIONAL STATISTICAL ANALYSIS ONLY: WinGo numbers are generated by independent random trials. " +
      "In accordance with probability theory and the Gambler's Fallacy, past occurrences, streaks, and " +
      "distribution anomalies do not alter future probabilities or guarantee upcoming outcomes. " +
      "This dashboard provides retrospective data analysis and does not offer financial or gambling signals.",
    numberFrequency: freq,
    numberPercentages: numPct,
    sizeDistribution: sizeCounts,
    sizePercentages: sizePct,
    colorDistribution: colorCounts,
    colorPercentages: colorPct,
    hotNumbers,
    coldNumbers,
    currentSizeStreak: { size: latestSize, count: activeSizeStreak },
    currentColorStreak: { color: latestColor, count: activeColorStreak },
    streakRecords: { maxBig, maxSmall, maxGreen, maxRed },
    statisticalEntropy: parseFloat(entropy.toFixed(3)),
  };
}

async function startApp() {
  const app = express();
  app.use(express.json());

  // Helper: Verify 1-hour session token
  function verifyUserSession(token?: string): { valid: boolean; exp?: number } {
    if (!token) return { valid: false };
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false };
      const [payloadB64, signature] = parts;
      const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(payloadB64).digest('hex');
      if (signature !== expectedSig) return { valid: false };
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
      if (Date.now() > payload.exp) return { valid: false }; // Expired after 1 hr
      return { valid: true, exp: payload.exp };
    } catch {
      return { valid: false };
    }
  }

  // Session verification middleware
  function requireSession(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.authorization;
    let token = '';
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/wingo_session=([^;]+)/);
      if (match) token = match[1];
    }

    const check = verifyUserSession(token);
    if (!check.valid) {
      return res.status(401).json({
        error: 'SESSION_EXPIRED',
        detail: 'Session expired or password required. Please log in.',
      });
    }
    next();
  }

  // User Password Login (Password: Akib9990, valid for 1 hour)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if (hash !== SITE_PASSWORD_HASH) {
      return res.status(401).json({ error: 'INVALID_PASSWORD', detail: 'Incorrect password.' });
    }

    // 1-hour session
    const exp = Date.now() + SESSION_DURATION_MS;
    const payload = JSON.stringify({ role: 'user', exp });
    const payloadB64 = Buffer.from(payload, 'utf-8').toString('base64url');
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(payloadB64).digest('hex');
    const token = `${payloadB64}.${signature}`;

    // Set cookie
    res.setHeader('Set-Cookie', `wingo_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600`);
    res.json({
      success: true,
      accessToken: token,
      expiresIn: 3600,
      expiresAt: new Date(exp).toISOString(),
    });
  });

  // Check / Verify Session
  app.get('/api/auth/verify', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    let token = '';
    if (auth && auth.startsWith('Bearer ')) {
      token = auth.split(' ')[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/wingo_session=([^;]+)/);
      if (match) token = match[1];
    }

    const check = verifyUserSession(token);
    if (!check.valid) {
      return res.status(401).json({ authenticated: false, detail: 'Session expired or invalid.' });
    }

    const remainingSec = Math.max(0, Math.floor(((check.exp || 0) - Date.now()) / 1000));
    res.json({ authenticated: true, remainingSeconds: remainingSec });
  });

  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.setHeader('Set-Cookie', 'wingo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
    res.json({ loggedOut: true });
  });

  // API Routes
  app.get('/api/status', (req: Request, res: Response) => {
    res.json({
      apiConnected: Object.values(cachedIssues).some((x) => x?.isLive === true) && telemetryLogs.some((t) => t.isSuccess),
      upstreamGateway: activeUpstreamBase,
      configuredUpstreamGateways: UPSTREAM_API_BASES,
      upstream: { lastSuccessAt: lastUpstreamSuccessAt || null, lastError: lastUpstreamError || null, timeoutMs: UPSTREAM_TIMEOUT_MS, retries: UPSTREAM_RETRIES },
      lastSyncTimestamp,
      serverClockDriftMs,
      supportedModes: Object.keys(MODE_CONFIGS),
      telemetry: {
        totalCalls: telemetryLogs.length,
        avgLatencyMs:
          telemetryLogs.length > 0
            ? Math.round(telemetryLogs.reduce((acc, t) => acc + t.latencyMs, 0) / telemetryLogs.length)
            : 0,
        recentErrors: telemetryLogs.filter((t) => !t.isSuccess).length,
      },
    });
  });

  app.get('/api/upstream/diagnostics', requireSession, async (_req: Request, res: Response) => {
    const results: any[] = [];
    for (const base of UPSTREAM_API_BASES) {
      const started = Date.now();
      try {
        const url = new URL(base);
        const dns = await resolveUpstreamHost(url.hostname);
        results.push({ base, dnsOk: true, resolvedAddress: dns.address, dnsSource: dns.source, ok: false, latencyMs: Date.now() - started, note: 'DNS resolved; API POST is tested by the live sync/verify flow.' });
      } catch (err: any) {
        results.push({ base, dnsOk: false, ok: false, latencyMs: Date.now() - started, error: err.message });
      }
    }
    res.json({ ok: results.some((r) => r.dnsOk), dnsFallbackEnabled: UPSTREAM_DNS_FALLBACK, dnsServers: UPSTREAM_DNS_SERVERS, activeUpstreamBase, configuredUpstreamGateways: UPSTREAM_API_BASES, results, lastSuccessAt: lastUpstreamSuccessAt || null, lastError: lastUpstreamError || null });
  });

  // Current round (Protected by 1-hour session)
  app.get('/api/wingo/:mode/current', requireSession, async (req: Request, res: Response) => {
    const { mode } = req.params;
    try {
      const now = Date.now();
      const serverNow = now + serverClockDriftMs;
      const cached = cachedIssues[mode];
      const isExpired = cached && cached.endTimestampMs && serverNow >= cached.endTimestampMs;
      const data = await syncModeData(mode, !!isExpired);
      const liveRemaining = Math.max(0, (data.issue.endTimestampMs - serverNow) / 1000);
      res.json({
        ...data.issue,
        remainingSeconds: liveRemaining,
        serverNowTimestampMs: serverNow,
      });
    } catch (err: any) {
      const serverNow = Date.now() + serverClockDriftMs;
      const fallback = getStaleScheduleFallback(mode, serverNow);
      if (fallback) {
        res.setHeader('X-Data-Mode', 'stale-verified-schedule');
        res.json({
          ...fallback.issue,
          remainingSeconds: Math.max(0, (fallback.issue.endTimestampMs - serverNow) / 1000),
          serverNowTimestampMs: serverNow,
        });
        return;
      }
      res.status(502).json({ error: 'REAL DATA SOURCE UNAVAILABLE', message: err.message });
    }
  });

  // Python-generated signal (Protected by 1-hour session)
  app.get('/api/wingo/:mode/signal', requireSession, async (req: Request, res: Response) => {
    const { mode } = req.params;
    try {
      const data = await syncModeData(mode);
      res.json(data.issue.nextSignal || { status: 'INSUFFICIENT DATA' });
    } catch (err: any) {
      const fallback = getStaleScheduleFallback(mode, Date.now() + serverClockDriftMs);
      if (fallback) {
        res.setHeader('X-Data-Mode', 'stale-verified-schedule');
        res.json(fallback.issue.nextSignal || { status: 'INSUFFICIENT DATA' });
        return;
      }
      res.status(502).json({ error: 'REAL DATA SOURCE UNAVAILABLE', message: err.message });
    }
  });

  // History (Protected by 1-hour session)
  app.get('/api/wingo/:mode/history', requireSession, async (req: Request, res: Response) => {
    const { mode } = req.params;
    const limit = parseInt((req.query.limit as string) || '30', 10);
    try {
      const data = await syncModeData(mode);
      res.json({
        gameMode: mode,
        totalItems: data.history.length,
        records: data.history.slice(0, limit),
      });
    } catch (err: any) {
      const fallback = getStaleScheduleFallback(mode, Date.now() + serverClockDriftMs);
      if (fallback) {
        res.setHeader('X-Data-Mode', 'stale-verified-schedule');
        res.json({
          gameMode: mode,
          totalItems: fallback.history.length,
          records: fallback.history.slice(0, limit),
          staleSchedule: true,
        });
        return;
      }
      res.status(502).json({ error: 'REAL DATA SOURCE UNAVAILABLE', message: err.message });
    }
  });

  // Analysis (Protected by 1-hour session)
  app.get('/api/wingo/:mode/analysis', requireSession, async (req: Request, res: Response) => {
    const { mode } = req.params;
    try {
      const data = await syncModeData(mode);
      const analysis = analyzeHistoryData(mode, data.history);
      res.json(analysis);
    } catch (err: any) {
      res.status(502).json({
        error: 'REAL DATA SOURCE UNAVAILABLE',
        message: err.message,
      });
    }
  });

  // Compact Analysis: Last 1000 Periods & Last 5 Hours (Protected by 1-hour session)
  app.get('/api/wingo/:mode/compact-analysis', requireSession, async (req: Request, res: Response) => {
    const { mode } = req.params;
    try {
      const data = await syncModeData(mode);
      if (data.issue.compactAnalysis) {
        return res.json(data.issue.compactAnalysis);
      }
      const last1000 = computeWindowAnalysis(data.history.slice(0, 1000), 'LAST 1000 PERIODS');
      const serverMs = data.issue.serverTimestampMs;
      const last5Records = data.history.filter((r) => {
        const t = parseUpstreamLocalTimestamp(r.resultTime);
        return Number.isFinite(t) && Number.isFinite(serverMs) && t <= serverMs && t >= serverMs - 5 * 60 * 60 * 1000;
      });
      const last5Hours = computeWindowAnalysis(last5Records, 'LAST 5 HOURS (timestamp filtered)');
      res.json({
        gameMode: mode,
        last1000,
        last5Hours,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(502).json({
        error: 'REAL DATA SOURCE UNAVAILABLE',
        message: err.message,
      });
    }
  });

  // Force sync
  app.post('/api/wingo/:mode/sync', requireSession, async (req: Request, res: Response) => {
    const { mode } = req.params;
    try {
      const data = await syncModeData(mode, true);
      res.json({ status: 'SUCCESS', issue: data.issue });
    } catch (err: any) {
      res.status(502).json({ error: 'Sync failed', message: err.message });
    }
  });

  // Rate limiting for admin login
  const failedLoginAttempts: Record<string, { count: number; firstAttempt: number }> = {};

  // Admin login with brute force protection
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const attempts = failedLoginAttempts[ip];

    if (attempts && attempts.count >= 5 && now - attempts.firstAttempt < 60000) {
      return res.status(429).json({
        detail: 'Too many failed login attempts. Account locked for 60 seconds.',
      });
    }

    const { username, password } = req.body;
    const hash = crypto.createHash('sha256').update(password || '').digest('hex');

    if (username !== 'admin' || hash !== ADMIN_PASSWORD_HASH) {
      if (!failedLoginAttempts[ip] || now - failedLoginAttempts[ip].firstAttempt > 60000) {
        failedLoginAttempts[ip] = { count: 1, firstAttempt: now };
      } else {
        failedLoginAttempts[ip].count++;
      }
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    // Success: reset attempts
    delete failedLoginAttempts[ip];

    const adminExp = Date.now() + 24 * 60 * 60 * 1000;
    const adminPayload = Buffer.from(JSON.stringify({ role: 'admin', username, exp: adminExp }), 'utf8').toString('base64url');
    const token = `${adminPayload}.${crypto.createHmac('sha256', SECRET_KEY).update(adminPayload).digest('hex')}`;
    res.json({
      accessToken: token,
      tokenType: 'Bearer',
      username,
      expiresIn: 86400,
    });
  });

  function verifyAdminToken(token?: string): boolean {
    if (!token) return false;
    try {
      const [payloadB64, signature] = token.split('.');
      if (!payloadB64 || !signature) return false;
      const expected = crypto.createHmac('sha256', SECRET_KEY).update(payloadB64).digest('hex');
      if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      return payload.role === 'admin' && Number(payload.exp) > Date.now();
    } catch { return false; }
  }

  // Admin overview
  app.get('/api/admin/overview', (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    const adminToken = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!verifyAdminToken(adminToken)) {
      return res.status(401).json({ detail: 'Unauthorized' });
    }

    const dbStats = {
      totalPersistedDraws: Object.values(cachedHistory).reduce((acc, list) => acc + list.length, 0),
      modeDrawCounts: Object.entries(cachedHistory).reduce((acc, [k, v]) => ({ ...acc, [k]: v.length }), {}),
      dbFilePath: 'data/draw_records.json',
    };

    res.json({
      status: 'OPERATIONAL',
      upstreamGateway: activeUpstreamBase,
      configuredUpstreamGateways: UPSTREAM_API_BASES,
      upstream: { lastSuccessAt: lastUpstreamSuccessAt || null, lastError: lastUpstreamError || null, timeoutMs: UPSTREAM_TIMEOUT_MS, retries: UPSTREAM_RETRIES },
      clockDriftMs: serverClockDriftMs,
      cachedModes: Object.keys(cachedIssues),
      database: dbStats,
      telemetryLogs: telemetryLogs.slice(0, 15),
    });
  });

  // Admin cache purge & re-sync
  app.post('/api/admin/clear-cache', async (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    const adminToken = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!verifyAdminToken(adminToken)) {
      return res.status(401).json({ detail: 'Unauthorized' });
    }

    for (const mode of Object.keys(MODE_CONFIGS)) {
      delete cachedIssues[mode];
      lastPollTimestamps[mode] = 0;
    }

    // Re-fetch all
    const results: Record<string, string> = {};
    for (const mode of Object.keys(MODE_CONFIGS)) {
      try {
        await syncModeData(mode, true);
        results[mode] = 'SYNCED';
      } catch (e: any) {
        results[mode] = `ERROR: ${e.message}`;
      }
    }

    res.json({ status: 'CACHE_CLEARED_AND_RESYNCED', results });
  });

  app.get('/api/version', (_req: Request, res: Response) => {
    res.json({ name: 'PREDICTION BD', version: APP_VERSION });
  });

  // Project ZIP Exporter
  app.get('/api/export-project', async (req: Request, res: Response) => {
    try {
      const zip = new JSZip();

      // Recursive folder add
      function addDirToZip(zipFolder: JSZip, localDirPath: string) {
        const entries = fs.readdirSync(localDirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(localDirPath, entry.name);
          if (['node_modules', '.git', 'dist', '.cache'].includes(entry.name)) {
            continue;
          }
          if (entry.isDirectory()) {
            const subZip = zipFolder.folder(entry.name);
            if (subZip) addDirToZip(subZip, fullPath);
          } else if (entry.isFile()) {
            const content = fs.readFileSync(fullPath);
            zipFolder.file(entry.name, content);
          }
        }
      }

      addDirToZip(zip, path.resolve(__dirname));

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="wingo-signal-analyzer-complete.zip"');
      res.send(zipBuffer);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to generate project archive', details: err.message });
    }
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const liveModes = Object.values(cachedIssues).filter((x) => x?.isLive).length;
    const upstreamConfigured = UPSTREAM_API_BASES.length > 0;
    res.status(upstreamConfigured ? 200 : 503).json({
      ok: upstreamConfigured, version: APP_VERSION, service: 'PREDICTION BD',
      liveModes, supportedModes: Object.keys(MODE_CONFIGS),
      upstream: { configured: upstreamConfigured, activeGateway: activeUpstreamBase, lastSuccessAt: lastUpstreamSuccessAt || null, lastError: lastUpstreamError || null },
      signalEngine: 'python-with-deterministic-fallback',
      timestamp: new Date().toISOString()
    });
  });

  // Mount Vite or serve static
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Pre-fetch initial data for all modes
  for (const mode of Object.keys(MODE_CONFIGS)) {
    syncModeData(mode).catch((err) => {
      console.warn(`[WinGo Initial Sync] ${mode} initial fetch note:`, err.message);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WinGo Signal Analyzer] Full-stack engine running on http://0.0.0.0:${PORT}`);
  });
}

startApp().catch((err) => {
  console.error('[WinGo Server Startup Error]:', err);
});
