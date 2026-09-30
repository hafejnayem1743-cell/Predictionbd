import json, sys
from app.services.prediction_engine import compute_signal

payload = json.loads(sys.stdin.read())
print(json.dumps(compute_signal(payload.get('current_period', ''), payload.get('records', []), payload.get('analysis_anchor_time')), separators=(',', ':')))
