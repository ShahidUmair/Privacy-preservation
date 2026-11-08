import os
import sqlite3
import time
from datetime import datetime, timedelta


CAPTURE_INTERVAL_SECONDS = 60


class ActivityStore:
    def __init__(self, database_path):
        self.database_path = database_path
        os.makedirs(os.path.dirname(database_path), exist_ok=True)
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                'CREATE TABLE IF NOT EXISTS activity ('
                'id INTEGER PRIMARY KEY, captured_at REAL NOT NULL, label TEXT NOT NULL)'
            )

    def record(self, label):
        with sqlite3.connect(self.database_path) as connection:
            connection.execute(
                'INSERT INTO activity (captured_at, label) VALUES (?, ?)',
                (time.time(), label)
            )

    def _count_between(self, start, end):
        with sqlite3.connect(self.database_path) as connection:
            result = connection.execute(
                'SELECT COUNT(*) FROM activity WHERE captured_at >= ? AND captured_at < ?',
                (start.timestamp(), end.timestamp())
            ).fetchone()
        return result[0]

    def dashboard(self, now=None):
        now = now or datetime.now().astimezone()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today - timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        tomorrow = today + timedelta(days=1)
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

        periods = {
            'daily': (today, tomorrow),
            'weekly': (week_start, tomorrow),
            'monthly': (month_start, next_month)
        }
        period_seconds = {
            name: self._count_between(start, min(end, now + timedelta(microseconds=1)))
            * CAPTURE_INTERVAL_SECONDS
            for name, (start, end) in periods.items()
        }

        with sqlite3.connect(self.database_path) as connection:
            rows = connection.execute(
                'SELECT label, COUNT(*) FROM activity '
                'WHERE captured_at >= ? AND captured_at < ? GROUP BY label',
                (today.timestamp(), min(tomorrow, now + timedelta(microseconds=1)).timestamp())
            ).fetchall()

        return {
            'period_seconds': period_seconds,
            'daily_activity_minutes': {label: count for label, count in rows}
        }