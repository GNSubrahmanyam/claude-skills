---
title: Custom Management Commands
impact: MEDIUM
impactDescription: Enables custom CLI operations and maintenance tasks
tags: django, management-commands, cli, maintenance
---

## Custom Management Commands

**Problem:**
Django applications often need custom management commands for data processing, maintenance tasks, imports/exports, and scheduled operations. Developers frequently struggle with command structure, argument parsing, error handling, output formatting, and testing. Poorly implemented commands can cause data corruption, unclear error messages, and difficult maintenance.

**Solution:**
Create commands in `app/management/commands/` directory:

```python
# myapp/management/commands/import_data.py
from django.core.management.base import BaseCommand, CommandError
from myapp.models import MyModel
import csv

class Command(BaseCommand):
    help = 'Import data from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to CSV file')
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be imported without actually importing',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='Number of records to process at once',
        )

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        dry_run = options['dry_run']
        batch_size = options['batch_size']

        try:
            with open(csv_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                objects = []

                for i, row in enumerate(reader, 1):
                    # Validate and create object
                    obj = self.create_object_from_row(row)
                    objects.append(obj)

                    # Process in batches
                    if i % batch_size == 0:
                        self.process_batch(objects, dry_run)
                        objects = []

                        if not dry_run:
                            self.stdout.write(
                                self.style.SUCCESS(f'Processed {i} records')
                            )

                # Process remaining objects
                if objects:
                    self.process_batch(objects, dry_run)

                if dry_run:
                    self.stdout.write(
                        self.style.WARNING('Dry run completed - no data imported')
                    )
                else:
                    self.stdout.write(
                        self.style.SUCCESS('Import completed successfully')
                    )

        except FileNotFoundError:
            raise CommandError(f'File "{csv_file}" not found')
        except Exception as e:
            raise CommandError(f'Import failed: {str(e)}')

    def create_object_from_row(self, row):
        """Create model instance from CSV row"""
        # Validation logic here
        return MyModel(**row)

    def process_batch(self, objects, dry_run):
        """Process a batch of objects"""
        if not dry_run:
            MyModel.objects.bulk_create(objects)
```

Use proper output methods and styling:

```python
class Command(BaseCommand):
    def handle(self, *args, **options):
        # Use self.stdout for normal output
        self.stdout.write('Processing data...')

        # Use styling for better output
        self.stdout.write(
            self.style.SUCCESS('Task completed successfully!')
        )
        self.stdout.write(
            self.style.WARNING('Warning: This operation cannot be undone')
        )
        self.stdout.write(
            self.style.ERROR('Error: Invalid data provided')
        )

        # Control line endings
        self.stdout.write('Progress: 50%', ending='\r')
        self.stdout.write('Complete!')
```

Handle transactions and database operations properly:

```python
from django.db import transaction

class Command(BaseCommand):
    @transaction.atomic
    def handle(self, *args, **options):
        # All operations in this method are atomic
        # If any fails, all changes are rolled back

        for item in items_to_process:
            item.status = 'processed'
            item.save()

            # Simulate potential failure
            if random.choice([True, False]):
                raise CommandError('Random failure occurred')

        # If we reach here, all operations succeeded
```

Use `call_command` to run other commands programmatically:

```python
from django.core.management import call_command

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Run another management command
        call_command('migrate', verbosity=0)

        # Run with specific options
        call_command('loaddata', 'my_fixture', verbosity=2)
```

## Common Mistakes

- Not using proper exception handling and CommandError
- Using print() instead of self.stdout.write()
- Not handling transactions properly for data modifications
- Missing argument validation and help text
- Not testing commands or using dry-run options
- Creating commands that are too complex or do too much
- Not using batch processing for large datasets
- Forgetting to handle file encoding properly
- Using commands for operations that should be in views/models
- Not providing progress feedback for long-running commands

## When to Apply

- Data import/export operations
- Database maintenance and cleanup tasks
- Scheduled cron jobs and background tasks
- One-time data migrations or fixes
- Administrative operations
- API data synchronization
- Report generation and email sending
- Cache warming or invalidation tasks