import random
from pathlib import Path

from django.core.management.base import BaseCommand
from joblib import dump
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from apps.complaints.ml_predictions import CATEGORY_BASE_HOURS
from apps.complaints.models import ComplaintTrainingSample


class Command(BaseCommand):
    help = 'Generate complaint training samples in MongoDB and train a text classifier for category prediction.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--samples',
            type=int,
            default=1800,
            help='How many synthetic complaint training samples to create (between 1500 and 2000).',
        )
        parser.add_argument(
            '--clear-existing',
            action='store_true',
            help='Delete existing training samples before generating new ones.',
        )
        parser.add_argument(
            '--model-path',
            default='',
            help='Optional path to save the trained model artifact.',
        )

    def handle(self, *args, **options):
        sample_count = max(1500, min(2000, options['samples']))
        clear_existing = options['clear_existing']

        if clear_existing:
            ComplaintTrainingSample.objects.delete()

        category_templates = {
            'road_damage': [
                ('Pothole near {location}', 'The road surface near {location} has a large pothole causing traffic issues and vehicle damage.'),
                ('Cracked lane at {location}', 'The lane at {location} has deep cracks and needs urgent resurfacing work.'),
                ('Broken speed breaker near {location}', 'The speed breaker near {location} is damaged and dangerous for commuters.'),
            ],
            'garbage': [
                ('Garbage pile in {location}', 'There is unmanaged waste and overflowing bins in {location} causing bad odour and unhygienic conditions.'),
                ('Dumping site near {location}', 'Residents are dumping trash near {location} and the area is becoming unsanitary.'),
                ('Dirty street in {location}', 'The street in {location} is covered with litter and garbage after the weekly market.'),
            ],
            'street_light': [
                ('Streetlight not working in {location}', 'The streetlight near {location} is out and the area becomes dark at night.'),
                ('Broken lamp post at {location}', 'The lamp pole near {location} is broken and needs immediate repair.'),
                ('Dark street near {location}', 'The road near {location} remains completely dark after sunset.'),
            ],
            'water_supply': [
                ('Water tap leak in {location}', 'Water is leaking continuously from a tap in {location} and wasting supply.'),
                ('Low water pressure in {location}', 'The water pressure in {location} is very low and households are struggling.'),
                ('Broken pipeline near {location}', 'The pipeline near {location} is leaking and causing waterlogging.'),
            ],
            'drainage': [
                ('Blocked drain in {location}', 'The drain in {location} is clogged and sewage water is overflowing onto the street.'),
                ('Flooded road near {location}', 'Water is stagnating near {location} after rain and the road is unusable.'),
                ('Sewer blockage at {location}', 'The sewer line at {location} is blocked and causing foul smell and overflow.'),
            ],
            'electricity': [
                ('Power outage in {location}', 'The locality around {location} has experienced repeated power cuts for several days.'),
                ('Faulty transformer near {location}', 'The transformer near {location} is making noise and needs immediate inspection.'),
                ('Broken electric line at {location}', 'An electrical line near {location} is hanging dangerously and needs repair.'),
            ],
            'traffic': [
                ('Traffic signal issue at {location}', 'The traffic signal near {location} is not working properly and causing congestion.'),
                ('Traffic jam near {location}', 'There is severe traffic congestion around {location} during the evening rush.'),
                ('Missing road sign at {location}', 'A road sign near {location} is missing and creating confusion for drivers.'),
            ],
            'illegal_parking': [
                ('Illegal parking near {location}', 'Vehicles are parked illegally near {location} and blocking the entrance.'),
                ('Encroachment by vehicles at {location}', 'Several vehicles are parked on the footpath near {location}, obstructing pedestrians.'),
                ('Vehicle blockage at {location}', 'Cars and bikes are parked on the road shoulder at {location}, causing traffic problems.'),
            ],
            'public_transport': [
                ('Bus stop shelter broken at {location}', 'The bus shelter at {location} is broken and passengers are exposed to the weather.'),
                ('Route issue for buses in {location}', 'Public transport buses do not stop properly near {location} during peak hours.'),
                ('Auto stand problem at {location}', 'The auto stand near {location} is disorganised and unsafe for commuters.'),
            ],
            'healthcare': [
                ('Medical waste issue near {location}', 'Medical waste is lying openly near {location} and is dangerous for residents.'),
                ('Clinic cleanliness problem in {location}', 'The clinic in {location} is not maintained properly and the waiting area is dirty.'),
                ('Ambulance delay at {location}', 'The ambulance service near {location} is delayed and needs better coordination.'),
            ],
            'education': [
                ('School sanitation issue at {location}', 'The school premises at {location} have poor sanitation and broken facilities.'),
                ('Classroom maintenance in {location}', 'The classroom building at {location} needs repairs and basic maintenance.'),
                ('School gate problem near {location}', 'The school gate near {location} is broken and unsafe for students.'),
            ],
            'government_office': [
                ('Long queue at government office in {location}', 'Residents are waiting too long at the office in {location} for basic services.'),
                ('Service delay at {location} office', 'The public service office in {location} is not responding on time to citizen requests.'),
                ('Counter issue at {location} department', 'The counter staff at the department office in {location} are not providing clear guidance.'),
            ],
            'environment': [
                ('Tree cutting near {location}', 'Trees are being cut near {location} without proper permission and need action.'),
                ('Noise pollution in {location}', 'The area near {location} is experiencing constant noise pollution from generators and loud events.'),
                ('Air pollution near {location}', 'Smoke and dust from the industrial area near {location} are affecting residents.'),
            ],
            'others': [
                ('General service issue in {location}', 'Residents in {location} need assistance with a civic issue that does not fit another category.'),
                ('Public complaint at {location}', 'A community complaint has been raised in {location} and needs follow-up.'),
                ('Request for support in {location}', 'Citizens in {location} have requested support regarding a recurring civic problem.'),
            ],
        }

        category_label_map = {
            'road_damage': 'Road Damage',
            'garbage': 'Garbage Collection',
            'street_light': 'Street Light',
            'water_supply': 'Water Supply',
            'drainage': 'Drainage',
            'electricity': 'Electricity',
            'traffic': 'Traffic',
            'illegal_parking': 'Illegal Parking',
            'public_transport': 'Public Transport',
            'healthcare': 'Healthcare',
            'education': 'Education',
            'government_office': 'Government Office',
            'environment': 'Environment',
            'others': 'Others',
        }

        locations = [
            'Sector 15', 'Ashok Vihar', 'Gandhi Nagar', 'Mohan Colony', 'Old City', 'Lake View', 'Main Market',
            'Park Road', 'Nagar Colony', 'Shivaji Nagar', 'Green Park', 'Riverside', 'Citizens Avenue', 'North Gate',
            'South Avenue', 'Central Bazaar', 'Civic Lane', 'Temple Road', 'Railway Colony', 'Hospital Street'
        ]

        rng = random.Random(42)
        samples = []
        for index in range(sample_count):
            category = list(category_templates.keys())[index % len(category_templates)]
            template = category_templates[category][index % len(category_templates[category])]
            location = locations[index % len(locations)]
            title = f"{template[0].format(location=location)} ({index + 1})"
            description = template[1].format(location=location)

            if 'urgent' in description.lower() or 'danger' in description.lower():
                priority = 'emergency'
                outcome = 'urgent_escalation'
            elif 'duplicate' in description.lower() or 'fake' in description.lower():
                priority = 'low'
                outcome = 'likely_rejected'
            elif priority := rng.choice(['low', 'medium', 'high', 'emergency']):
                if priority == 'emergency':
                    outcome = 'urgent_escalation'
                elif priority == 'high':
                    outcome = 'likely_accepted'
                else:
                    outcome = 'needs_review'

            samples.append({
                'title': title,
                'description': description,
                'category': category,
                'category_label': category_label_map[category],
                'priority': priority,
                'outcome': outcome,
                'confidence': round(rng.uniform(0.62, 0.96), 2),
                'resolution_hours': CATEGORY_BASE_HOURS.get(category, 48) + rng.choice([-6, -3, 0, 3, 6]),
            })

        for item in samples:
            existing = ComplaintTrainingSample.objects(title=item['title']).first()
            if existing is None:
                ComplaintTrainingSample(
                    title=item['title'],
                    description=item['description'],
                    category=item['category'],
                    category_label=item['category_label'],
                    priority=item['priority'],
                    outcome=item['outcome'],
                    confidence=item['confidence'],
                    resolution_hours=item['resolution_hours'],
                ).save()

        texts = [f"{sample['title']} {sample['description']}" for sample in samples]
        labels = [sample['category'] for sample in samples]

        model_pipeline = Pipeline([
            ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=2)),
            ('clf', LogisticRegression(max_iter=4000, solver='lbfgs')),
        ])
        model_pipeline.fit(texts, labels)

        model_path = Path(options['model_path']) if options['model_path'] else Path(__file__).resolve().parents[4] / 'ml_models' / 'complaint_category_model.joblib'
        model_path.parent.mkdir(parents=True, exist_ok=True)
        dump(model_pipeline, model_path)

        self.stdout.write(self.style.SUCCESS(f'Created {len(samples)} training samples and trained the complaint classifier at {model_path}'))
