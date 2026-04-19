# Background Tasks Processing (MEDIUM)

**Impact:** MEDIUM - Enables scalable application architecture and improved user experience

**Problem:**
Long-running tasks in Django views block the response, leading to timeouts, poor user experience, and server overload. Tasks like email sending, file processing, or API calls shouldn't block the main request-response cycle.

**Solution:**
Use background task processing with Celery or Django's built-in tools to handle asynchronous operations reliably.

**Examples:**

❌ **Wrong: Synchronous task processing**
```python
# views.py - BLOCKING operations
def send_newsletter(request):
    if request.method == 'POST':
        # This blocks the response for minutes!
        subscribers = Subscriber.objects.all()

        for subscriber in subscribers:
            # Synchronous email sending - very slow
            send_mail(
                'Newsletter',
                'Content...',
                'from@example.com',
                [subscriber.email]
            )

        return JsonResponse({'status': 'sent'})

def process_large_file(request):
    if request.method == 'POST':
        uploaded_file = request.FILES['file']

        # Synchronous file processing - blocks response
        processed_data = process_file_data(uploaded_file)  # Takes 30+ seconds

        return JsonResponse({'result': processed_data})
```

✅ **Correct: Background task processing**
```python
# tasks.py - Celery tasks
from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_newsletter_email(self, subscriber_id, subject, content):
    """Send newsletter email to a subscriber"""
    try:
        from .models import Subscriber
        subscriber = Subscriber.objects.get(id=subscriber_id)

        send_mail(
            subject=subject,
            message=content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[subscriber.email],
            fail_silently=False,
        )

        # Mark as sent
        subscriber.last_sent = timezone.now()
        subscriber.save()

        logger.info(f"Newsletter sent to {subscriber.email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send newsletter to subscriber {subscriber_id}: {e}")
        # Retry with exponential backoff
        raise self.retry(countdown=60 * (2 ** self.request.retries), exc=e)

@shared_task
def process_uploaded_file(file_id, user_id):
    """Process uploaded file in background"""
    try:
        from .models import UploadedFile, User

        uploaded_file = UploadedFile.objects.get(id=file_id)
        user = User.objects.get(id=user_id)

        # Process the file
        result = process_file_data(uploaded_file.file.path)

        # Save results
        uploaded_file.processed_data = result
        uploaded_file.status = 'completed'
        uploaded_file.save()

        # Send notification
        send_processing_complete_email.delay(user.email, uploaded_file.name)

        logger.info(f"File {file_id} processed successfully")

    except Exception as e:
        logger.error(f"Failed to process file {file_id}: {e}")
        # Mark as failed
        uploaded_file.status = 'failed'
        uploaded_file.error_message = str(e)
        uploaded_file.save()

@shared_task
def cleanup_expired_sessions():
    """Clean up expired sessions periodically"""
    from django.contrib.sessions.models import Session
    from django.utils import timezone

    expired_count = Session.objects.filter(
        expire_date__lt=timezone.now()
    ).delete()[0]

    logger.info(f"Cleaned up {expired_count} expired sessions")
    return expired_count

@shared_task
def generate_monthly_report():
    """Generate monthly analytics report"""
    from django.db.models import Count, Sum
    from .models import Article, User

    # Calculate statistics
    stats = {
        'total_users': User.objects.count(),
        'total_articles': Article.objects.filter(published=True).count(),
        'new_users_this_month': User.objects.filter(
            date_joined__month=timezone.now().month
        ).count(),
        'popular_articles': Article.objects.filter(
            published=True
        ).annotate(
            view_count=Count('views')
        ).order_by('-view_count')[:10].values('title', 'view_count')
    }

    # Generate PDF report
    from reportlab.pdfgen import canvas
    from io import BytesIO

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer)

    pdf.drawString(100, 800, f"Monthly Report - {timezone.now().strftime('%B %Y')}")
    pdf.drawString(100, 780, f"Total Users: {stats['total_users']}")
    pdf.drawString(100, 760, f"Total Articles: {stats['total_articles']}")

    pdf.save()
    buffer.seek(0)

    # Save report to storage
    from django.core.files.storage import default_storage
    filename = f"reports/monthly_{timezone.now().strftime('%Y_%m')}.pdf"
    default_storage.save(filename, buffer)

    return filename

# views.py - Using background tasks
def send_newsletter(request):
    if request.method == 'POST':
        subject = request.POST.get('subject')
        content = request.POST.get('content')

        # Queue emails for background processing
        subscribers = Subscriber.objects.filter(active=True)

        for subscriber in subscribers:
            send_newsletter_email.delay(
                subscriber_id=subscriber.id,
                subject=subject,
                content=content
            )

        # Return immediately
        return JsonResponse({
            'status': 'queued',
            'message': f'Newsletter queued for {subscribers.count()} subscribers'
        })

def upload_file(request):
    if request.method == 'POST':
        form = FileUploadForm(request.POST, request.FILES)

        if form.is_valid():
            # Save file info
            uploaded_file = form.save(commit=False)
            uploaded_file.user = request.user
            uploaded_file.status = 'processing'
            uploaded_file.save()

            # Queue processing
            process_uploaded_file.delay(
                file_id=uploaded_file.id,
                user_id=request.user.id
            )

            return JsonResponse({
                'status': 'processing',
                'file_id': uploaded_file.id,
                'message': 'File uploaded and processing started'
            })

    return render(request, 'upload.html', {'form': FileUploadForm()})
```

**Celery Configuration:**
```python
# settings.py - Celery configuration
import os

# Celery settings
CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# Timezone
CELERY_TIMEZONE = 'UTC'

# Task routing
CELERY_TASK_ROUTES = {
    'myapp.tasks.send_newsletter_email': {'queue': 'email'},
    'myapp.tasks.process_uploaded_file': {'queue': 'processing'},
    'myapp.tasks.cleanup_expired_sessions': {'queue': 'maintenance'},
}

# Task execution settings
CELERY_TASK_SOFT_TIME_LIMIT = 300  # 5 minutes
CELERY_TASK_TIME_LIMIT = 600       # 10 minutes

# Worker settings
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# Beat schedule for periodic tasks
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-sessions': {
        'task': 'myapp.tasks.cleanup_expired_sessions',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'generate-monthly-report': {
        'task': 'myapp.tasks.generate_monthly_report',
        'schedule': crontab(day_of_month=1, hour=6, minute=0),  # 1st of each month
    },
}
```

**Task Monitoring and Error Handling:**
```python
# tasks.py - Advanced task features
from celery import shared_task
from celery.utils.log import get_task_logger
from django.core.mail import send_mail
from django.conf import settings

logger = get_task_logger(__name__)

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3})
def send_email_with_retry(self, to_email, subject, message):
    """Send email with automatic retry on failure"""
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email]
        )
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        raise  # Re-raise for retry

@shared_task
def bulk_process_items(item_ids, batch_size=100):
    """Process items in batches to avoid memory issues"""
    from .models import Item

    total_processed = 0
    total_failed = 0

    # Process in batches
    for i in range(0, len(item_ids), batch_size):
        batch_ids = item_ids[i:i + batch_size]

        try:
            items = Item.objects.filter(id__in=batch_ids)

            for item in items:
                try:
                    process_item(item)
                    total_processed += 1
                except Exception as e:
                    logger.error(f"Failed to process item {item.id}: {e}")
                    total_failed += 1

            # Update progress
            self.update_state(
                state='PROGRESS',
                meta={
                    'processed': total_processed,
                    'failed': total_failed,
                    'current': min(i + batch_size, len(item_ids)),
                    'total': len(item_ids)
                }
            )

        except Exception as e:
            logger.error(f"Failed to process batch {i//batch_size}: {e}")
            total_failed += len(batch_ids)

    return {
        'processed': total_processed,
        'failed': total_failed,
        'total': len(item_ids)
    }

# Django signals for task monitoring
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender='myapp.UploadedFile')
def queue_file_processing(sender, instance, created, **kwargs):
    """Automatically queue file processing when uploaded"""
    if created and instance.status == 'uploaded':
        from .tasks import process_uploaded_file
        process_uploaded_file.delay(
            file_id=instance.id,
            user_id=instance.user.id
        )
```

**Common mistakes:**
- Processing long-running tasks in views
- Not handling task failures properly
- Missing proper logging and monitoring
- Not configuring proper retry policies
- Using synchronous operations for I/O bound tasks
- Not testing background task functionality

**When to apply:**
- Sending emails or notifications
- Processing uploaded files
- Running expensive computations
- Making external API calls
- Performing maintenance tasks
- Generating reports or analytics