"""Unit tests for WinGo client signature generation and mode mappings."""
import unittest
from backend.app.services.wingo_client import generate_signature_payload, MODE_TYPE_MAP

class TestWinGoClient(unittest.TestCase):
    def test_signature_payload_generation(self):
        payload = generate_signature_payload({"typeId": 1})
        self.assertIn("language", payload)
        self.assertEqual(payload["language"], 0)
        self.assertIn("random", payload)
        self.assertEqual(len(payload["random"]), 32)
        self.assertIn("signature", payload)
        self.assertEqual(len(payload["signature"]), 32)
        self.assertTrue(payload["signature"].isupper())
        self.assertIn("timestamp", payload)

    def test_mode_type_mapping(self):
        self.assertEqual(MODE_TYPE_MAP["wingo_30s"]["type_id"], 30)
        self.assertEqual(MODE_TYPE_MAP["wingo_30s"]["interval_sec"], 30)
        self.assertEqual(MODE_TYPE_MAP["wingo_1m"]["type_id"], 1)
        self.assertEqual(MODE_TYPE_MAP["wingo_1m"]["interval_sec"], 60)
        self.assertEqual(MODE_TYPE_MAP["wingo_3m"]["type_id"], 2)
        self.assertEqual(MODE_TYPE_MAP["wingo_3m"]["interval_sec"], 180)
        self.assertEqual(MODE_TYPE_MAP["wingo_5m"]["type_id"], 3)
        self.assertEqual(MODE_TYPE_MAP["wingo_5m"]["interval_sec"], 300)

if __name__ == "__main__":
    unittest.main()
