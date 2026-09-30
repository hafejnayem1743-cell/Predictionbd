#!/usr/bin/env python3
"""Deployment-time HGNICE gateway verification.

Run this from the deployed server, not from a browser. It verifies DNS/TLS,
GetGameIssue and GetNoaverageEmerdList for every configured mode and reports
period/timestamp/result fields without fabricating data.
"""
from __future__ import annotations
import hashlib, json, os, socket, ssl, sys, time, uuid
from urllib.request import Request, urlopen

BASES = list(dict.fromkeys([os.getenv("UPSTREAM_API_BASE", "https://api.hgnicepayapi.com/api/webapi").rstrip("/"), *[v.strip().rstrip("/") for v in os.getenv("UPSTREAM_API_BASES", "").split(",") if v.strip()]]))
ORIGIN = os.getenv("UPSTREAM_ORIGIN", "https://hgnice.org").rstrip("/")
MODES = {"wingo_30s":30, "wingo_1m":1, "wingo_3m":2, "wingo_5m":3}
TIMEOUT = float(os.getenv("REQUEST_TIMEOUT", "10"))

def signed(params):
    data = dict(params)
    data["language"] = 0
    data["random"] = uuid.uuid4().hex
    filtered = {k:(0 if data[k] == 0 else data[k]) for k in sorted(data) if data[k] not in (None, "") and k not in {"signature","track","xosoBettingData"}}
    raw = json.dumps(filtered, separators=(",", ":"))
    data["signature"] = hashlib.md5(raw.encode()).hexdigest().upper()
    data["timestamp"] = int(time.time())
    return data

def post(base, path, params):
    body = json.dumps(signed(params), separators=(",", ":")).encode()
    req = Request(base + path, data=body, headers={
        "User-Agent":"Mozilla/5.0",
        "Content-Type":"application/json;charset=UTF-8",
        "Accept":"application/json, text/plain, */*",
        "Origin":ORIGIN,
        "Referer":ORIGIN+"/",
        "Ar-Origin":ORIGIN,
    })
    with urlopen(req, timeout=TIMEOUT) as r:
        return json.loads(r.read().decode())

def main():
    print(f"SOURCES={BASES}")
    print(f"ORIGIN={ORIGIN}")
    passing_bases = 0
    for base in BASES:
        host = base.split("//",1)[-1].split("/",1)[0].split(":",1)[0]
        try:
            print(f"DNS {host}=", socket.gethostbyname_ex(host))
        except Exception as e:
            print(f"DNS_ERROR {host}=", e)
            continue
        base_ok = True
        for mode, type_id in MODES.items():
            try:
                issue = post(base, "/GetGameIssue", {"typeId": type_id})
                print(f"{base} {mode} ISSUE code={issue.get('code')} issue={issue.get('data',{}).get('issueNumber')} start={issue.get('data',{}).get('startTime')} end={issue.get('data',{}).get('endTime')} service={issue.get('data',{}).get('serviceTime') or issue.get('serviceNowTime')}")
                hist = post(base, "/GetNoaverageEmerdList", {"typeId": type_id, "pageNo": 1, "pageSize": 100})
                rows = hist.get("data",{}).get("list",[]) or []
                print(f"{base} {mode} HISTORY code={hist.get('code')} rows={len(rows)} latest={rows[0].get('issueNumber') if rows else None} latest_number={rows[0].get('number') if rows else None}")
                if issue.get("code") != 0 or hist.get("code") != 0 or not rows:
                    base_ok = False
            except Exception as e:
                base_ok = False
                print(f"{base} {mode} ERROR={type(e).__name__}: {e}")
        if base_ok:
            passing_bases += 1
            break
    print("RESULT=PASS" if passing_bases else "RESULT=FAIL no configured gateway completed all mode checks")
    return 0 if passing_bases else 3

if __name__ == "__main__":
    raise SystemExit(main())
