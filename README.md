# PREDICTION BD — WinGo Signal Analyzer
**Real-Time WinGo Analysis, Sub-Second Timer Synchronization & Educational Signal Engine**

---

## 1. Executive Summary & Verification Report

WinGo Signal Analyzer is an enterprise-grade cyber intelligence dashboard and statistical analysis engine for WinGo lotteries (30s, 1m, 3m, and 5m). 

### Upstream Gateway Configuration & Verification
The project is configured to use the HGNICE gateway below. The endpoint contract is implemented in the project, but live verification must be performed from a host that can resolve and reach the gateway; this environment cannot complete that POST verification.
- **Upstream Host:** `https://api.hgnicepayapi.com/api/webapi`
- **Authentication implementation:** 32-character uppercase MD5 signature over sorted JSON parameters with language token and UUIDv4 random nonce.
- **Configured game mode mappings:**
  - `wingo_30s` -> `typeId: 30` (Interval: 30 seconds / 0.5 min)
  - `wingo_1m` -> `typeId: 1` (Interval: 60 seconds / 1.0 min)
  - `wingo_3m` -> `typeId: 2` (Interval: 180 seconds / 3.0 min)
  - `wingo_5m` -> `typeId: 3` (Interval: 300 seconds / 5.0 min)
- **Classification rules used by the analyzer:**
  - **Size:** `Number(t.number) > 4 ? "Big" : "Small"`
    - Digits 0, 1, 2, 3, 4 = Small
    - Digits 5, 6, 7, 8, 9 = Big
  - **Color:**
    - `0`: Red + Violet (Dual token)
    - `5`: Green + Violet (Dual token)
    - `1, 3, 7, 9`: Pure Green
    - `2, 4, 6, 8`: Pure Red
- **Timing:** When the source returns `serviceNowTime`, the server uses it for clock-drift compensation. The implementation refuses to fabricate countdowns when required timestamps are missing or invalid.

---

## 2. Project Architecture

```
wingo-signal-analyzer/
|-- backend/                       # Complete Python FastAPI backend
|   |-- app/
|   |   |-- main.py                # FastAPI entry point, CORS, startup hooks
|   |   |-- api/
|   |   |   |-- routes.py          # /api/wingo/* endpoints
|   |   |   |-- admin.py           # /api/admin/* endpoints
|   |   |-- services/
|   |   |   |-- wingo_client.py    # Authenticated upstream client & MD5 signer
|   |   |   |-- sync_service.py    # Timer sync & in-memory cache
|   |   |   |-- analysis_engine.py # Statistical analysis, streaks, Shannon entropy
|   |   |-- models/
|   |   |   |-- schemas.py         # Pydantic data schemas
|   |   |   |-- db_models.py       # SQLAlchemy / SQLite models
|   |   |-- database/
|   |   |   |-- session.py         # SQLite connection & telemetry logger
|   |   |-- security/
|   |   |   |-- auth.py            # Password hashing & HMAC bearer tokens
|   |   |-- config/
|   |       |-- settings.py        # Environment variables & constants
|   |-- tests/
|   |   |-- test_analysis.py       # 4 unit tests (classification, entropy, data bounds)
|   |   |-- test_wingo_client.py   # Signature verification & mode mapping tests
|   |   |-- test_sync.py           # Timer calculations & bounds tests
|   |-- standalone_server.py       # Zero-dependency Python HTTP server fallback
|   |-- run_tests.py               # Standard library test runner (100% pass)
|   |-- requirements.txt           # Python dependencies
|
|-- src/                           # High-Performance Cyberintel Frontend
|   |-- components/
|   |   |-- Header.tsx             # Zero-pill telemetry header, ZIP exporter, admin trigger
|   |   |-- ModeSelector.tsx       # Segmented 30S / 1M / 3M / 5M switcher
|   |   |-- LiveRoundPanel.tsx     # Current period number & smooth timer
|   |   |-- SignalAnalysisPanel.tsx# Educational signal matrix & probability breakdown
|   |   |-- NumberGrid.tsx         # 0-9 number matrix with verified colors
|   |   |-- AnalyticsCharts.tsx    # Bar histograms & macro equilibrium bars
|   |   |-- ResultHistoryTable.tsx # Verified draw log with period search and filters
|   |   |-- DataSourcePanel.tsx    # Live telemetry and gateway latency
|   |   |-- AdminModal.tsx         # Secure admin console (admin / admin123)
|   |   |-- EducationalModal.tsx   # Mathematical disclosure & independence axioms
|   |   |-- Footer.tsx             # Legal, policy, and disclaimer links
|   |-- types/                     # TypeScript contracts
|   |-- App.tsx                    # Main state orchestrator & visibility sync
|
|-- server.ts                      # Full-stack Node/Express server with Vite proxy & ZIP exporter
|-- .env.example                   # Environment configuration template
|-- robots.txt / sitemap.xml       # Technical SEO files
|-- README.md                      # Comprehensive documentation
```

---

## 3. Installation & Running

### Option A: Run Full-Stack with Node (Vite + Express Server)
```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (starts full stack server on http://localhost:3000)
npm run dev

# 3. Build for production
npm run build
npm start
```

### Option B: Run Python Backend
```bash
# 1. Navigate to backend directory
cd backend

# 2. Install requirements
pip install -r requirements.txt

# 3. Run automated tests
python3 run_tests.py

# 4. Start FastAPI server with Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Alternatively, run without any external packages using the standalone server:
python3 standalone_server.py
```

---

## 4. Admin Portal Credentials
- **Username:** `admin`
- **Password:** `admin123`
- Features: Live request inspection, clock drift telemetry, gateway diagnostics.

---

## 5. Exporting Codebase
Click the **"Export ZIP"** button directly in the navigation header or request `/api/export-project` to download a complete, self-contained ZIP archive of the entire repository.

---

## 6. Mathematical & Ethical Notice
This system strictly follows discrete probability principles:
- **Independent Trials:** Every draw is generated independently. Past results do not alter future probabilities.
- **Zero Mock / Fake Data:** If the upstream gateway is unreachable, the system displays `"REAL DATA SOURCE UNAVAILABLE"` rather than generating synthetic results.


## v1.9 signal and synchronization changes

- The signal is now explicitly bound to the **CURRENT HGNICE period**.
- No separate Next Period signal is generated or displayed.
- A signal is locked by `(game mode, current period)` and is recalculated only when the HGNICE period changes.
- Only completed results earlier than the current period are allowed into the model, preventing current/future result leakage.
- The signal engine uses a multi-window 0-9 ensemble: 1000P frequency, recent weighted frequency, 5-hour data, 1st/2nd-order transitions, and 2/3-step sequence matching.
- Walk-forward validation is reported separately from model agreement; model agreement is **not** a guaranteed outcome probability.
- v1.8 signal locks are intentionally isolated by using a new `signal_locks_v1_9.json` store.

## v1.8 one-click deployment

GitHub upload is now the only project-side setup step. The repository includes a Dockerfile and `render.yaml`; when connected to a Docker-capable host such as Render, the service builds Node + Python automatically, starts on the assigned `PORT`, and exposes `/api/health` for deployment health checks. No `.env` editing is required for the default HGNICE configuration.

For other hosts, use:

```bash
npm install
npm run build
npm start
```

If Python is unavailable, v1.8 automatically falls back to a deterministic statistical estimator instead of crashing the site. The live upstream remains marked unavailable until a real upstream response is received.

### DNS recovery in v1.8
If the hosting provider has broken/default DNS resolution, configure:

```env
UPSTREAM_DNS_FALLBACK=true
UPSTREAM_DNS_SERVERS=1.1.1.1,8.8.8.8
UPSTREAM_DNS_CACHE_MS=60000
```

The Node live client first uses normal DNS, then these recursive DNS servers when normal resolution fails. TLS verification still uses the original upstream hostname. v1.8 enables this by default.

Check the deployment-side diagnostics endpoint after login:

`GET /api/upstream/diagnostics`

Do not label the HGNICE source as verified until an actual API response has been observed; DNS resolution alone is not API verification. The analyzer never fabricates a live period, countdown, or historical result.

## v1.8 verification

- Python unit tests: **13/13 PASS**
- `server.ts` syntax check: **PASS**
- ZIP integrity check: **PASS**
- Full `npm install` / Vite production build: not completed in this sandbox because package download timed out; the repository includes the normal production build configuration and Docker build path.
- Live HGNICE API response: **not verified from this sandbox**; the app refuses to invent live results when the upstream is unreachable.


## v1.9.1 hotfix

- Preserves historical `resultTime` fields while seeding pages 2–10.
- Stops using record ingestion time (`createdAt`) as a fake historical timestamp.
- Anchors the 5-hour analysis to the verified HGNICE server time.
- Recalculates the current-period signal from the completed history for each new period.
- Isolates v1.9.1 signal locks from earlier builds.
- Transient upstream schedule fallback is no longer falsely labelled LIVE.
- Upstream retries default to 1 to reduce transient sync failures.
