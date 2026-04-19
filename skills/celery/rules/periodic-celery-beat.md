---
title: Periodic Tasks Celery Beat
impact: MEDIUM-HIGH
impactDescription: Enables reliable scheduled task execution
tags: celery, periodic, tasks, beat, scheduling
---

## Periodic Tasks Celery Beat

**Problem:**
Applications need to execute tasks at regular intervals, but implementing reliable scheduling is complex and error-prone. Missing executions or duplicate runs can cause data inconsistencies and operational issues.

**Solution:**
Use Celery Beat to schedule periodic tasks with proper timezone handling, error recovery, and monitoring.

**Examples:**

✅ **Correct: Celery Beat configuration**
```python
from celery import Celery
from celery.schedules import crontab

app = Celery('myapp')

# Comprehensive beat schedule
app.conf.beat_schedule = {
    # Simple interval-based tasks
    'cleanup-expired-sessions': {
        'task': 'myapp.tasks.cleanup_sessions',
        'schedule': 3600.0,  # Every hour
        'args': (),
        'kwargs': {},
        'options': {'queue': 'periodic'},
    },

    # Cron-style scheduling
    'send-daily-reports': {
        'task': 'myapp.tasks.generate_daily_reports',
        'schedule': crontab(hour=6, minute=0),  # 6:00 AM daily
        'args': (),
        'options': {'queue': 'reports'},
    },

    # Complex cron schedules
    'process-weekly-analytics': {
        'task': 'myapp.tasks.weekly_analytics',
        'schedule': crontab(hour=2, minute=0, day_of_week='sun'),  # Sunday 2 AM
        'args': ('weekly',),
        'options': {'queue': 'analytics'},
    },

    # Business hours tasks
    'sync-customer-data': {
        'task': 'myapp.tasks.sync_customers',
        'schedule': crontab(hour='9-17', minute=0),  # Every hour 9 AM - 5 PM
        'args': (),
        'options': {'queue': 'sync'},
    },

    # Monthly tasks
    'generate-monthly-invoices': {
        'task': 'myapp.tasks.monthly_invoicing',
        'schedule': crontab(hour=1, minute=0, day_of_month=1),  # 1st of each month
        'args': (),
        'options': {'queue': 'billing'},
    },
}

# Beat configuration
app.conf.beat_max_loop_interval = 300  # 5 minutes
app.conf.beat_schedule_filename = '/var/run/celery/beat-schedule'
app.conf.beat_sync_every = 1
app.conf.beat_cron_starting_deadline = 300  # 5 minutes
```

✅ **Correct: Timezone-aware scheduling**
```python
import os
from celery.schedules import crontab

# Timezone configuration
app.conf.timezone = 'UTC'
app.conf.enable_utc = True

# Environment-specific timezone handling
if os.environ.get('DJANGO_SETTINGS_MODULE') == 'myapp.settings.production':
    app.conf.timezone = 'America/New_York'  # Production timezone
else:
    app.conf.timezone = 'UTC'  # Development default

# Timezone-aware periodic tasks
app.conf.beat_schedule = {
    'business-hours-report': {
        'task': 'myapp.tasks.business_hours_report',
        'schedule': crontab(hour=9, minute=0, day_of_week='mon-fri'),  # 9 AM weekdays
        'args': (),
        'options': {'timezone': 'America/New_York'},  # Explicit timezone
    },

    'global-maintenance': {
        'task': 'myapp.tasks.global_maintenance',
        'schedule': crontab(hour=2, minute=0),  # 2 AM in configured timezone
        'args': (),
        # Inherits app.conf.timezone
    },
}

# Custom schedule classes for complex timing
from celery.schedules import BaseSchedule
from datetime import datetime, time

class BusinessHoursSchedule(BaseSchedule):
    """Schedule that only runs during business hours"""

    def __init__(self, business_start='09:00', business_end='17:00', days='mon-fri'):
        self.business_start = time.fromisoformat(business_start)
        self.business_end = time.fromisoformat(business_end)
        self.days = self._parse_days(days)

    def is_due(self, last_run_at):
        now = datetime.now(self.app.timezone)
        current_time = now.time()
        current_day = now.weekday()

        # Check if current day is a business day
        if current_day not in self.days:
            return False, 3600  # Not due, check again in 1 hour

        # Check if current time is within business hours
        if self.business_start <= current_time <= self.business_end:
            return True, 0  # Due immediately
        else:
            return False, 3600  # Not due, check again in 1 hour

# Usage
app.conf.beat_schedule = {
    'business-hours-task': {
        'task': 'myapp.tasks.business_task',
        'schedule': BusinessHoursSchedule(),
        'args': (),
    },
}
```

✅ **Correct: Beat with database-backed scheduling**
```python
# For dynamic scheduling from database
@app.task
def load_dynamic_schedule():
    """Load periodic tasks from database"""
    from myapp.models import ScheduledTask

    dynamic_schedule = {}

    for scheduled_task in ScheduledTask.objects.filter(active=True):
        dynamic_schedule[scheduled_task.name] = {
            'task': scheduled_task.task_name,
            'schedule': self._parse_schedule(scheduled_task.schedule_config),
            'args': scheduled_task.args or (),
            'kwargs': scheduled_task.kwargs or {},
            'options': {'queue': scheduled_task.queue or 'celery'},
        }

    return dynamic_schedule

# Update beat schedule dynamically
@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Setup periodic tasks after configuration"""
    # Load static schedule
    sender.add_periodic_task(3600, load_dynamic_schedule.s())

    # Could also load from database here and add individual tasks
    # for task_config in load_dynamic_schedule():
    #     sender.add_periodic_task(task_config['schedule'], task_config['task'], **task_config)
```

❌ **Wrong: Manual scheduling with cron**
```bash
# Don't do this - hard to manage and monitor
# /etc/cron.d/myapp
# 0 * * * * myuser python /path/to/manage.py cleanup_sessions
# 0 6 * * * myuser python /path/to/manage.py daily_reports

# Problems:
# - No error handling or retries
# - Hard to monitor execution
# - Difficult to manage in distributed systems
# - No programmatic control
```

❌ **Wrong: In-application timers**
```python
# Don't do this - unreliable and resource-intensive
import threading
import time

def schedule_task():
    """Poor man's scheduler"""
    while True:
        time.sleep(3600)  # Sleep for an hour
        cleanup_sessions.delay()  # May execute multiple times if restarted

# Start scheduler thread
scheduler_thread = threading.Thread(target=schedule_task, daemon=True)
scheduler_thread.start()
```

**Common mistakes:**
- Not configuring timezone properly
- Using system cron instead of Celery Beat
- Missing error handling for periodic tasks
- Not monitoring beat scheduler health
- Hardcoding schedules instead of using configuration
- Ignoring daylight saving time transitions

**When to apply:**
- Data cleanup and maintenance tasks
- Report generation and email sending
- Cache invalidation and refresh
- Backup and archiving operations
- Metrics collection and aggregation
- Business logic automation

**Related rules:**
- `config-environment-separation`: Environment-specific scheduling
- `monitoring-health-checks`: Beat scheduler monitoring
- `error-retry-strategy`: Error handling in periodic tasks</content>
<parameter name="filePath">skills/celery-skill/rules/periodic-celery-beat.md