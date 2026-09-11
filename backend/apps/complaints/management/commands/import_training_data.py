import csv
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.complaints.models import ComplaintTrainingSample


class Command(BaseCommand):
    help = 'Import synthetic complaint training data from a CSV file into the database.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            default='ml_training_data.csv',
            help='Path to the CSV file containing training data.',
        )

    def handle(self, *args, **options):
        file_path = Path(options['file'])
        if not file_path.exists():
            self.stdout.write(self.style.ERROR(f'CSV file not found: {file_path}'))
            return

        created = 0
        with file_path.open(newline='', encoding='utf-8') as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                ComplaintTrainingSample.objects.get_or_create(
                    title=row['title'],
                    defaults={
                        'description': row['description'],
                        'category': row['category'],
                        'category_label': row['category_label'],
                        'priority': row['priority'],
                        'outcome': row['outcome'],
                        'confidence': float(row['confidence']),
                        'resolution_hours': int(row['resolution_hours']),
                    },
                )
                created += 1

        self.stdout.write(self.style.SUCCESS(f'Imported {created} training rows from {file_path}'))
