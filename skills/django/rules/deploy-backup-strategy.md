---
title: Deployment Backup Strategy
impact: MEDIUM
impactDescription: Ensures data recoverability and business continuity
tags: django, deployment, backup, recovery
---

## Deployment Backup Strategy

**Problem:**
Without proper backup strategies, data loss from system failures, human errors, or security incidents can be catastrophic. Missing or inadequate backups can lead to permanent data loss and business downtime.

**Solution:**
Implement comprehensive backup strategies with automated backups, testing, encryption, and disaster recovery procedures.

**Examples:**

❌ **Wrong: No backup strategy**
```python
# No backups configured
# No disaster recovery plan
# Risk of complete data loss
```

✅ **Correct: Comprehensive backup strategy**
```python
# settings.py - Backup configuration
import os

BACKUP_CONFIG = {
    'database': {
        'schedule': 'daily',  # daily, weekly, monthly
        'retention_days': 30,
        'compression': 'gzip',
        'encryption': True,
        'destination': 's3',
    },
    'media_files': {
        'schedule': 'weekly',
        'retention_weeks': 12,
        'compression': True,
        'encryption': True,
    },
    'application_code': {
        'schedule': 'on_deploy',  # Backup on each deployment
        'retention_deploys': 10,
    },
    'configuration': {
        'schedule': 'weekly',
        'encrypt': True,
    }
}

# AWS S3 backup configuration
AWS_BACKUP_CONFIG = {
    'bucket': os.environ.get('BACKUP_BUCKET'),
    'region': os.environ.get('AWS_REGION', 'us-east-1'),
    'storage_class': 'STANDARD_IA',  # Infrequent access for cost savings
    'encryption': 'AES256',
}
```

**Database Backup Implementation:**
```python
# management/commands/backup_database.py
from django.core.management.base import BaseCommand
from django.conf import settings
import subprocess
import boto3
from datetime import datetime
import gzip
import os

class Command(BaseCommand):
    help = 'Create database backup and upload to S3'

    def add_arguments(self, parser):
        parser.add_argument(
            '--upload-only',
            action='store_true',
            help='Only upload existing backup file',
        )

    def handle(self, *args, **options):
        if not options['upload_only']:
            backup_file = self.create_backup()
            self.compress_backup(backup_file)
            backup_file += '.gz'

        self.upload_to_s3(backup_file)
        self.cleanup_old_backups()

    def create_backup(self):
        """Create PostgreSQL backup"""
        db_settings = settings.DATABASES['default']

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"/tmp/backup_{db_settings['NAME']}_{timestamp}.sql"

        cmd = [
            'pg_dump',
            '--host', db_settings['HOST'],
            '--username', db_settings['USER'],
            '--dbname', db_settings['NAME'],
            '--no-password',
            '--format=custom',  # For compressed format
            '--compress=9',     # Maximum compression
            '--file', backup_file,
        ]

        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode != 0:
            self.stderr.write(f"Backup failed: {result.stderr}")
            raise Exception("Database backup failed")

        self.stdout.write(f"Backup created: {backup_file}")
        return backup_file

    def compress_backup(self, backup_file):
        """Compress backup file"""
        compressed_file = backup_file + '.gz'

        with open(backup_file, 'rb') as f_in:
            with gzip.open(compressed_file, 'wb', compresslevel=9) as f_out:
                f_out.writelines(f_in)

        # Remove uncompressed file
        os.remove(backup_file)
        self.stdout.write(f"Backup compressed: {compressed_file}")

    def upload_to_s3(self, backup_file):
        """Upload backup to S3"""
        s3_client = boto3.client(
            's3',
            region_name=settings.AWS_BACKUP_CONFIG['region']
        )

        bucket = settings.AWS_BACKUP_CONFIG['bucket']
        key = f"database/{os.path.basename(backup_file)}"

        s3_client.upload_file(
            backup_file,
            bucket,
            key,
            ExtraArgs={
                'StorageClass': settings.AWS_BACKUP_CONFIG['storage_class'],
                'ServerSideEncryption': settings.AWS_BACKUP_CONFIG['encryption'],
            }
        )

        self.stdout.write(f"Backup uploaded to S3: s3://{bucket}/{key}")

    def cleanup_old_backups(self):
        """Remove backups older than retention period"""
        s3_client = boto3.client(
            's3',
            region_name=settings.AWS_BACKUP_CONFIG['region']
        )

        bucket = settings.AWS_BACKUP_CONFIG['bucket']
        retention_days = settings.BACKUP_CONFIG['database']['retention_days']

        # List all database backups
        response = s3_client.list_objects_v2(
            Bucket=bucket,
            Prefix='database/'
        )

        if 'Contents' in response:
            for obj in response['Contents']:
                # Check if backup is older than retention period
                if self._is_backup_expired(obj['LastModified'], retention_days):
                    s3_client.delete_object(Bucket=bucket, Key=obj['Key'])
                    self.stdout.write(f"Deleted old backup: {obj['Key']}")

    def _is_backup_expired(self, last_modified, retention_days):
        """Check if backup is older than retention period"""
        from datetime import datetime, timezone
        age = datetime.now(timezone.utc) - last_modified
        return age.days > retention_days
```

**Media Files Backup:**
```python
# management/commands/backup_media.py
from django.core.management.base import BaseCommand
from django.conf import settings
import boto3
import tarfile
import os
from datetime import datetime

class Command(BaseCommand):
    help = 'Backup media files to S3'

    def handle(self, *args, **options):
        media_root = settings.MEDIA_ROOT
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"media_backup_{timestamp}.tar.gz"
        archive_path = f"/tmp/{archive_name}"

        # Create compressed archive
        with tarfile.open(archive_path, "w:gz") as tar:
            tar.add(media_root, arcname=os.path.basename(media_root))

        self.stdout.write(f"Media archive created: {archive_path}")

        # Upload to S3
        self.upload_to_s3(archive_path, archive_name)

        # Cleanup
        os.remove(archive_path)
        self.stdout.write("Media backup completed")

    def upload_to_s3(self, file_path, file_name):
        """Upload file to S3"""
        s3_client = boto3.client('s3')
        bucket = settings.AWS_BACKUP_CONFIG['bucket']

        s3_client.upload_file(
            file_path,
            bucket,
            f"media/{file_name}",
            ExtraArgs={'StorageClass': 'STANDARD_IA'}
        )

        self.stdout.write(f"Media backup uploaded: s3://{bucket}/media/{file_name}")
```

**Application Code Backup:**
```python
# management/commands/backup_code.py
from django.core.management.base import BaseCommand
import subprocess
import boto3
from datetime import datetime
import os

class Command(BaseCommand):
    help = 'Backup application code to S3'

    def handle(self, *args, **options):
        # Create git archive
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"code_backup_{timestamp}.tar.gz"
        archive_path = f"/tmp/{archive_name}"

        # Create git archive
        subprocess.run([
            'git', 'archive',
            '--format=tar.gz',
            '-o', archive_path,
            'HEAD'
        ], check=True)

        self.stdout.write(f"Code archive created: {archive_path}")

        # Upload to S3
        self.upload_to_s3(archive_path, archive_name)

        # Cleanup old backups
        self.cleanup_old_backups()

        os.remove(archive_path)

    def upload_to_s3(self, file_path, file_name):
        """Upload to S3"""
        s3_client = boto3.client('s3')
        bucket = settings.AWS_BACKUP_CONFIG['bucket']

        s3_client.upload_file(
            file_path,
            bucket,
            f"code/{file_name}"
        )

    def cleanup_old_backups(self):
        """Keep only last N deployments"""
        s3_client = boto3.client('s3')
        bucket = settings.AWS_BACKUP_CONFIG['bucket']
        keep_count = settings.BACKUP_CONFIG['application_code']['retention_deploys']

        response = s3_client.list_objects_v2(
            Bucket=bucket,
            Prefix='code/'
        )

        if 'Contents' in response:
            # Sort by last modified (newest first)
            backups = sorted(
                response['Contents'],
                key=lambda x: x['LastModified'],
                reverse=True
            )

            # Delete old backups
            for backup in backups[keep_count:]:
                s3_client.delete_object(Bucket=bucket, Key=backup['Key'])
                self.stdout.write(f"Deleted old code backup: {backup['Key']}")
```

**Backup Verification and Testing:**
```python
# management/commands/verify_backups.py
from django.core.management.base import BaseCommand
import boto3
import subprocess
from django.conf import settings

class Command(BaseCommand):
    help = 'Verify backup integrity and test restoration'

    def handle(self, *args, **options):
        self.verify_database_backup()
        self.verify_media_backup()
        self.test_restoration()

    def verify_database_backup(self):
        """Verify latest database backup"""
        s3_client = boto3.client('s3')
        bucket = settings.AWS_BACKUP_CONFIG['bucket']

        # Get latest database backup
        response = s3_client.list_objects_v2(
            Bucket=bucket,
            Prefix='database/'
        )

        if 'Contents' in response:
            latest_backup = max(response['Contents'], key=lambda x: x['LastModified'])
            self.stdout.write(f"Latest backup: {latest_backup['Key']}")

            # Download and verify
            local_path = f"/tmp/{latest_backup['Key'].split('/')[-1]}"
            s3_client.download_file(bucket, latest_backup['Key'], local_path)

            # Test backup integrity
            result = subprocess.run(['pg_restore', '--list', local_path],
                                  capture_output=True, text=True)

            if result.returncode == 0:
                self.stdout.write("Database backup integrity verified")
            else:
                self.stderr.write("Database backup integrity check failed")

            os.remove(local_path)

    def verify_media_backup(self):
        """Verify media files backup"""
        # Download latest media backup and check file count
        pass

    def test_restoration(self):
        """Test backup restoration procedure"""
        # This would create a test database and restore backup
        self.stdout.write("Testing restoration procedure...")
        # Implementation would depend on your restoration process
```

**Automated Backup Scheduling:**
```bash
# /etc/cron.d/django-backups
# Daily database backup at 2 AM
0 2 * * * www-data /path/to/project/manage.py backup_database

# Weekly media backup on Sundays at 3 AM
0 3 * * 0 www-data /path/to/project/manage.py backup_media

# Code backup after deployment
# Add to deployment script
#!/bin/bash
# Deploy script
# ... deployment commands ...
python manage.py backup_code
```

**Disaster Recovery Plan:**
```python
# disaster_recovery.py
from django.core.management.base import BaseCommand
import boto3
import subprocess
from django.conf import settings

class Command(BaseCommand):
    help = 'Execute disaster recovery procedure'

    def handle(self, *args, **options):
        self.stdout.write("Starting disaster recovery...")

        # 1. Stop application
        self._stop_application()

        # 2. Restore database
        self._restore_database()

        # 3. Restore media files
        self._restore_media_files()

        # 4. Restore application code
        self._restore_code()

        # 5. Start application
        self._start_application()

        self.stdout.write("Disaster recovery completed")

    def _stop_application(self):
        """Stop the application"""
        subprocess.run(['sudo', 'systemctl', 'stop', 'gunicorn'])
        subprocess.run(['sudo', 'systemctl', 'stop', 'nginx'])

    def _restore_database(self):
        """Restore database from latest backup"""
        s3_client = boto3.client('s3')
        bucket = settings.AWS_BACKUP_CONFIG['bucket']

        # Get latest backup
        response = s3_client.list_objects_v2(Bucket=bucket, Prefix='database/')
        latest_backup = max(response['Contents'], key=lambda x: x['LastModified'])

        # Download backup
        backup_file = f"/tmp/{latest_backup['Key'].split('/')[-1]}"
        s3_client.download_file(bucket, latest_backup['Key'], backup_file)

        # Restore database
        db_settings = settings.DATABASES['default']
        env = os.environ.copy()
        env['PGPASSWORD'] = db_settings['PASSWORD']

        subprocess.run([
            'pg_restore',
            '--host', db_settings['HOST'],
            '--username', db_settings['USER'],
            '--dbname', db_settings['NAME'],
            '--clean',  # Clean existing data
            backup_file
        ], env=env, check=True)

        os.remove(backup_file)

    def _restore_media_files(self):
        """Restore media files"""
        # Download and extract latest media backup
        pass

    def _restore_code(self):
        """Restore application code"""
        # Deploy latest code version
        pass

    def _start_application(self):
        """Start the application"""
        subprocess.run(['sudo', 'systemctl', 'start', 'nginx'])
        subprocess.run(['sudo', 'systemctl', 'start', 'gunicorn'])
```

**Common mistakes:**
- No automated backup procedures
- Not testing backup restoration
- Missing encryption for sensitive backups
- Not monitoring backup success/failure
- Inadequate retention policies
- No disaster recovery testing

**When to apply:**
- Setting up production infrastructure
- Implementing business continuity planning
- During security compliance
- Preparing for disaster recovery
- After data-related incidents