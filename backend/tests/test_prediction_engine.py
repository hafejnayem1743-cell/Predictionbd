import unittest
from backend.app.services.prediction_engine import compute_signal, walk_forward_validate, _ensemble

class TestPredictionEngine(unittest.TestCase):
    def setUp(self):
        self.records = []
        for i in range(180):
            n = (i * 7 + 3) % 10
            self.records.append({
                'issue_number': str(10000 - i),
                'number': n,
                'colors': ['green'] if n in (1,3,5,7,9) else ['red'],
                'size': 'BIG' if n >= 5 else 'Small',
            })

    def test_insufficient_data_never_fabricates_signal(self):
        result = compute_signal('P1', self.records[:10])
        self.assertEqual(result['status'], 'INSUFFICIENT DATA')
        self.assertIsNone(result['number'])

    def test_signal_is_deterministic(self):
        a = compute_signal('P2', self.records)
        b = compute_signal('P2', self.records)
        self.assertEqual(a['size'], b['size'])
        self.assertEqual(a['color'], b['color'])
        self.assertEqual(a['number'], b['number'])
        self.assertEqual(a['validation'], b['validation'])


    def test_signal_is_locked_to_current_period(self):
        result = compute_signal('20260930100010581', self.records)
        self.assertEqual(result['current_period'], '20260930100010581')
        self.assertEqual(result['targetPeriod'], '20260930100010581')

    def test_model_scores_full_number_space(self):
        number, scores, components = _ensemble(self.records)
        self.assertIn(number, range(10))
        self.assertEqual(set(scores.keys()), set(range(10)))
        self.assertGreaterEqual(len(components), 8)

    def test_walk_forward_does_not_use_future_rows(self):
        result = walk_forward_validate(self.records, max_cases=50)
        self.assertGreaterEqual(result['cases'], 1)
        self.assertIn('size_accuracy', result)
        self.assertIn('number_accuracy', result)

if __name__ == '__main__':
    unittest.main()
