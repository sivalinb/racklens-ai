import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import Mock, patch
from urllib.error import HTTPError, URLError

from racklens.collector import _poll_forever, RedfishTelemetryCollector, SimulatorTelemetryCollector
from racklens.telemetry import ClickHouseHTTPStore, TelemetryUnavailable


class CollectorResilienceTests(unittest.TestCase):
    def test_memory_error_is_bounded_sanitized_and_not_retried(self):
        body = io.BytesIO(b"Code: 241. secret details " + b"x" * 10000)
        error = HTTPError("http://private-db/", 500, "error", {}, body)
        with patch("racklens.telemetry.urlopen", side_effect=error) as call:
            with self.assertRaises(TelemetryUnavailable) as result:
                ClickHouseHTTPStore("http://private-db", password="secret")._request("INSERT test")
        self.assertEqual(result.exception.reason, "memory_limit")
        self.assertNotIn("secret", str(result.exception))
        self.assertEqual(body.tell(), 1000)
        self.assertEqual(call.call_count, 1)

    def test_auth_and_query_errors_remain_fatal(self):
        for code, body in [(401, b"Unauthorized"), (400, b"Bad syntax"), (500, b"Code: 60. Unknown table")]:
            with self.subTest(code=code), patch("racklens.telemetry.urlopen", side_effect=HTTPError("http://db", code, "error", {}, io.BytesIO(body))):
                with self.assertRaises(RuntimeError) as result:
                    ClickHouseHTTPStore("http://db")._request("query")
                self.assertNotIsInstance(result.exception, TelemetryUnavailable)

    def test_transport_and_overload_fail_without_replay(self):
        errors = [URLError("secret endpoint"), TimeoutError("secret"), ConnectionError("secret")]
        errors += [HTTPError("http://db", code, "error", {}, io.BytesIO(b"secret")) for code in (429, 502, 503, 504)]
        for error in errors:
            with self.subTest(error=type(error).__name__), patch("racklens.telemetry.urlopen", side_effect=error) as call:
                with self.assertRaises(TelemetryUnavailable) as result:
                    ClickHouseHTTPStore("http://db")._request("INSERT")
                self.assertNotIn("secret", str(result.exception))
                self.assertEqual(call.call_count, 1)

    def test_backoff_is_bounded_and_resets_after_recovery(self):
        outcomes = [TelemetryUnavailable("memory_limit")] * 7 + [None, TelemetryUnavailable("overloaded"), KeyboardInterrupt()]
        poll = Mock(side_effect=outcomes)
        output = io.StringIO()
        with patch("racklens.collector.time.sleep") as sleep, redirect_stdout(output):
            with self.assertRaises(KeyboardInterrupt):
                _poll_forever(poll, 30)
        self.assertEqual([c.args[0] for c in sleep.call_args_list], [30, 60, 120, 240, 300, 300, 300, 30, 30])
        events = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(events[0]["delivery"], "unknown_not_replayed")
        self.assertEqual(events[-2], {"event": "collector_poll_recovered", "previous_failures": 7})
        self.assertEqual(events[-1]["consecutive_failures"], 1)
        self.assertEqual(poll.call_count, len(outcomes))

    def test_normal_intervals_and_programming_errors_are_preserved(self):
        for interval in (-1, 1200):
            with patch("racklens.collector.time.sleep") as sleep:
                with self.assertRaises(KeyboardInterrupt):
                    _poll_forever(Mock(side_effect=[None, KeyboardInterrupt()]), interval)
                sleep.assert_called_once_with(max(5, interval))
        with patch("racklens.collector.time.sleep") as sleep:
            with self.assertRaises(ValueError):
                _poll_forever(Mock(side_effect=ValueError("bug")), 30)
            sleep.assert_not_called()

    def test_simulator_advances_after_unknown_delivery_instead_of_replaying(self):
        collector = SimulatorTelemetryCollector(Mock())
        with patch.object(collector, "collect_once", side_effect=[TelemetryUnavailable("memory_limit"), None, KeyboardInterrupt()]) as collect, patch("racklens.collector.time.sleep"), redirect_stdout(io.StringIO()):
            with self.assertRaises(KeyboardInterrupt):
                collector.run(30, "healthy")
        self.assertEqual([c.args for c in collect.call_args_list], [("healthy", 0), ("healthy", 1), ("healthy", 2)])

    def test_redfish_uses_the_same_store_failure_boundary(self):
        collector = RedfishTelemetryCollector(Mock(), Mock())
        with patch.object(collector, "collect_once", side_effect=[TelemetryUnavailable("overloaded"), KeyboardInterrupt()]) as collect, patch("racklens.collector.time.sleep") as sleep, redirect_stdout(io.StringIO()):
            with self.assertRaises(KeyboardInterrupt):
                collector.run(30)
        self.assertEqual(collect.call_count, 2)
        sleep.assert_called_once_with(30)


if __name__ == "__main__":
    unittest.main()
