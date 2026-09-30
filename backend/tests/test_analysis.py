"""Unit tests for WinGo Analysis Engine."""
import unittest
from backend.app.services.analysis_engine import classify_size, classify_color, AnalysisEngine

class TestAnalysisEngine(unittest.TestCase):
    def test_size_classification(self):
        # 0-4 must be Small
        for n in range(5):
            self.assertEqual(classify_size(n), "Small", f"Number {n} should be Small")
        # 5-9 must be Big
        for n in range(5, 10):
            self.assertEqual(classify_size(n), "Big", f"Number {n} should be Big")

    def test_color_classification(self):
        # 0 is Red + Violet
        self.assertEqual(classify_color(0), ["red", "violet"])
        # 5 is Green + Violet
        self.assertEqual(classify_color(5), ["green", "violet"])
        # 1, 3, 7, 9 are Green
        for n in [1, 3, 7, 9]:
            self.assertEqual(classify_color(n), ["green"])
        # 2, 4, 6, 8 are Red
        for n in [2, 4, 6, 8]:
            self.assertEqual(classify_color(n), ["red"])

    def test_insufficient_data(self):
        result = AnalysisEngine.analyze_history("wingo_1m", [])
        self.assertEqual(result["analysis_status"], "INSUFFICIENT DATA FOR ANALYSIS")
        self.assertEqual(result["total_rounds_analyzed"], 0)

    def test_statistical_aggregation(self):
        sample_records = [
            {"number": 7, "size": "Big", "colors": ["green"]},
            {"number": 3, "size": "Small", "colors": ["green"]},
            {"number": 4, "size": "Small", "colors": ["red"]},
            {"number": 8, "size": "Big", "colors": ["red"]},
            {"number": 5, "size": "Big", "colors": ["green", "violet"]},
            {"number": 0, "size": "Small", "colors": ["red", "violet"]},
        ]
        result = AnalysisEngine.analyze_history("wingo_1m", sample_records)
        self.assertEqual(result["analysis_status"], "ANALYSIS AVAILABLE")
        self.assertEqual(result["total_rounds_analyzed"], 6)
        self.assertEqual(result["size_distribution"]["Big"], 3)
        self.assertEqual(result["size_distribution"]["Small"], 3)
        self.assertIn("EDUCATIONAL", result["educational_disclaimer"])
        self.assertGreater(result["statistical_entropy"], 2.0)

    def test_streak_calculation(self):
        # 3 Bigs in a row at the top (records newest to oldest)
        streak_records = [
            {"number": 9, "size": "Big", "colors": ["green"]},
            {"number": 8, "size": "Big", "colors": ["red"]},
            {"number": 7, "size": "Big", "colors": ["green"]},
            {"number": 2, "size": "Small", "colors": ["red"]},
            {"number": 1, "size": "Small", "colors": ["green"]},
        ]
        result = AnalysisEngine.analyze_history("wingo_1m", streak_records)
        self.assertEqual(result["current_size_streak"]["size"], "Big")
        self.assertEqual(result["current_size_streak"]["count"], 3)
        self.assertEqual(result["streak_records"]["max_big"], 3)

    def test_compute_window_analysis(self):
        from backend.app.services.analysis_engine import compute_window_analysis
        sample = [
            {"number": 9, "size": "Big", "colors": ["green"]},
            {"number": 8, "size": "Big", "colors": ["red"]},
            {"number": 2, "size": "Small", "colors": ["red"]},
            {"number": 1, "size": "Small", "colors": ["green"]},
        ]
        res = compute_window_analysis(sample, "LAST 1000 PERIODS")
        self.assertEqual(res["periodsAnalyzed"], 4)
        self.assertEqual(res["bigPercentage"], 50.0)
        self.assertEqual(res["smallPercentage"], 50.0)
        self.assertEqual(res["redPercentage"], 50.0)
        self.assertEqual(res["greenPercentage"], 50.0)
        self.assertEqual(res["dataStatus"], "VERIFIED")

if __name__ == "__main__":
    unittest.main()
