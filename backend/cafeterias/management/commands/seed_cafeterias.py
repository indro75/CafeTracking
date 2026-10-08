from django.core.management.base import BaseCommand
from cafeterias.models import Cafeteria


SAMPLE = [
    {
        'name': 'Cofeeta',
        'description': 'A cozy spot in the heart of the city with artisan coffee and fresh pastries.',
        'address': 'KDA Approach Road',
        'latitude': 22.82264389034262, 'longitude': 89.55032602600284,
        'rating': 4.6,
    },
    {
        'name': 'Campus Brew',
        'description': 'Student favorite near the university campus. Great wifi and snacks.',
        'address': 'University Avenue, Kolkata',
        'latitude': 22.5620, 'longitude': 88.3630,
        'rating': 4.3,
    },
    {
        'name': 'The Green Bean',
        'description': 'Organic coffee and vegan treats in a garden setting.',
        'address': '45 Lake Gardens, Kolkata',
        'latitude': 22.5025, 'longitude': 88.3620,
        'rating': 4.7,
    },
    {
        'name': 'Sunrise Roasters',
        'description': 'Early-bird favorite. Opens at 6 AM with fresh-roasted beans.',
        'address': '88 Salt Lake Sector V, Kolkata',
        'latitude': 22.5800, 'longitude': 88.4150,
        'rating': 4.5,
    },
    {
        'name': 'Moonlight Espresso',
        'description': 'Late-night coffee and live acoustic music on weekends.',
        'address': '7B Hindustan Park, Kolkata',
        'latitude': 22.5220, 'longitude': 88.3540,
        'rating': 4.4,
    },
    {
        'name': 'Student Corner',
        'description': 'Budget-friendly cafeteria popular with college students.',
        'address': 'College Street, Kolkata',
        'latitude': 22.5805, 'longitude': 88.3640,
        'rating': 4.1,
    },
    {
        'name': 'Food Hub Express',
        'description': 'Quick bites and specialty teas near the metro station.',
        'address': 'Dharmatala, Kolkata',
        'latitude': 22.5510, 'longitude': 88.3570,
        'rating': 4.0,
    },
    {
        'name': 'Velvet Cup',
        'description': 'Upscale cafe with specialty single-origin coffees.',
        'address': '22A Camac Street, Kolkata',
        'latitude': 22.5465, 'longitude': 88.3575,
        'rating': 4.8,
    },
    {
        'name': 'Harbour View Cafe',
        'description': 'Waterfront dining with views of the Hooghly River.',
        'address': 'Strand Road, Kolkata',
        'latitude': 22.5760, 'longitude': 88.3470,
        'rating': 4.5,
    },
    {
        'name': 'The Daily Grind',
        'description': 'Neighborhood cafe with homemade cakes and filter coffee.',
        'address': 'Gariahat Road, Kolkata',
        'latitude': 22.5125, 'longitude': 88.3690,
        'rating': 4.3,
    },
    {
        'name': 'Bloom Cafe',
        'description': 'Flower-themed cafe with floral teas and light lunches.',
        'address': '14A Rashbehari Avenue, Kolkata',
        'latitude': 22.5180, 'longitude': 88.3600,
        'rating': 4.2,
    },
    {
        'name': 'Northern Latitudes',
        'description': 'Scandinavian-inspired minimalist cafe with excellent espresso.',
        'address': '5B Ballygunge Place, Kolkata',
        'latitude': 22.5280, 'longitude': 88.3635,
        'rating': 4.6,
    },
    {
        'name': 'Spice & Steam',
        'description': 'Indian fusion cafe with masala chai and savory snacks.',
        'address': '33 New Market, Kolkata',
        'latitude': 22.5560, 'longitude': 88.3610,
        'rating': 4.4,
    },
    {
        'name': 'Bookworm Cafe',
        'description': 'Read, sip, relax. Thousands of books line the walls.',
        'address': '6A College Row, Kolkata',
        'latitude': 22.5815, 'longitude': 88.3620,
        'rating': 4.7,
    },
    {
        'name': 'Golden Hour',
        'description': 'Rooftop cafe with sunset views and specialty lattes.',
        'address': '100A Southern Avenue, Kolkata',
        'latitude': 22.5090, 'longitude': 88.3570,
        'rating': 4.5,
    },
]


class Command(BaseCommand):
    help = 'Seed sample cafeterias'

    def handle(self, *args, **options):
        created = 0
        for item in SAMPLE:
            obj, was_created = Cafeteria.objects.update_or_create(
                name=item['name'],
                defaults={
                    'description': item['description'],
                    'address': item['address'],
                    'latitude': item['latitude'],
                    'longitude': item['longitude'],
                    'rating': item['rating'],
                }
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Seeded {created} new cafeterias ({len(SAMPLE)} total).'))