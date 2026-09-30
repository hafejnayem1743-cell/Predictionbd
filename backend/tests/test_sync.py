"""Unit tests for timer synchronization logic."""
import unittest
from datetime import datetime, timedelta

class TestTimerSync(unittest.TestCase):
    def test_countdown_calculation(self):
        now = datetime(2026, 9, 30, 7, 30, 0)
        end_time = datetime(2026, 9, 30, 7, 30, 45)
        remaining = (end_time - now).total_seconds()
        self.assertEqual(remaining, 45.0)

    def test_negative_countdown_prevention(self):
        now = datetime(2026, 9, 30, 7, 30, 50)
        end_time = datetime(2026, 9, 30, 7, 30, 45)
        remaining = max(0.0, (end_time - now).total_seconds())
        self.assertEqual(remaining, 0.0)

if __name__ == "__main__":
    unittest.main()
