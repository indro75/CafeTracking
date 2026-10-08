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
        'name': 'Blues Cafe',
        'description': 'Student favorite near the university campus. Great wifi and snacks.',
        'address': 'South Central Road, Khulna',
        'latitude': 22.810901535582616, 'longitude':  89.56816182415301,
        'rating': 4.3,
    },
    {
        'name': 'Dhaba',
        'description': 'Organic coffee and vegan treats in a garden setting.',
        'address': 'Ahsan Ahmed Road, Khulna',
        'latitude': 22.811131327443256,  'longitude': 89.56626029925287,
        'rating': 4.7,
    },
    {
        'name': 'Coffian',
        'description': 'Early-bird favorite. Opens at 6 AM with fresh-roasted beans.',
        'address': '7 Rasta, Khulna',
        'latitude': 22.81069551808247, 'longitude':  89.56141086141142,
        'rating': 4.5,
    },
    {
        'name': 'Green & Co',
        'description': 'Late-night coffee and live acoustic music on weekends.',
        'address': 'Nirala Road, Khulna',
        'latitude': 22.80263120668289,  'longitude': 89.55385113671664,
        'rating': 4.4,
    },
    {
        'name': 'Crimson Cup',
        'description': 'Budget-friendly cafeteria popular with college students.',
        'address': '13 KDA Ave, Khulna 9100',
        'latitude': 22.868421106435996,  'longitude': 89.55889221602995,
        'rating': 4.1,
    },
    {
        'name': '4Cheez',
        'description': 'Quick bites and specialty teas near the metro station.',
        'address': '27 KDA Approach Rd, Khulna',
        'latitude': 22.82327455604112,  'longitude': 89.55009139531772,
        'rating': 4.0,
    },
    {
        'name': 'Parkside Cafe',
        'description': 'Upscale cafe with specialty single-origin coffees.',
        'address': 'Shantidham More, Khulna',
        'latitude': 22.812519978313826,  'longitude': 89.56098795298871,
        'rating': 4.8,
    },
    {
        'name': 'Helium',
        'description': 'Waterfront dining with views of the Hooghly River.',
        'address': 'KDA Approach Road, Khulna',
        'latitude': 22.936177612091193, 'longitude': 89.52215554362083,
        'rating': 4.5,
    },
    {
        'name': 'Coffee Glory',
        'description': 'Neighborhood cafe with homemade cakes and filter coffee.',
        'address': 'Newmarket Road, Khulna',
        'latitude': 22.826232894891337,  'longitude': 89.55110078182474,
        'rating': 4.3,
    },
    {
        'name': 'Cafe 98',
        'description': 'Flower-themed cafe with floral teas and light lunches.',
        'address': '367 Sher-E-Bangla Rd, Khulna 9100',
        'latitude': 22.815183243755005,  'longitude': 89.55700939981323,
        'rating': 4.2,
    },
    {
        'name': 'PizzaBurg Khulna',
        'description': 'Scandinavian-inspired minimalist cafe with excellent espresso.',
        'address': '12 KDA Ave, Khulna 9100',
        'latitude': 22.819286927076888,  'longitude': 89.55335685563503,
        'rating': 4.6,
    },
    {
        'name': 'LA MAISON RICHARD BANGLADESH',
        'description': 'Indian fusion cafe with masala chai and savory snacks.',
        'address': '34 KDA Ave, Khulna 9100',
        'latitude': 22.816226347173934,  'longitude':89.55443271955832,
        'rating': 4.4,
    },
    {
        'name': 'Coffee Lounge',
        'description': 'Read, sip, relax. Thousands of books line the walls.',
        'address': '63 Lower Jashore, Road, Khulna 9100',
        'latitude': 22.815595565445655,  'longitude': 89.56510285327315,
        'rating': 4.7,
    },
    {
        'name': 'Cafenity',
        'description': 'Rooftop cafe with sunset views and specialty lattes.',
        'address': 'RHF2+237 Star(3) Plaza, KDA Approach Rd, Khulna',
        'latitude': 22.822917043646193, 'longitude': 89.55020074195514,
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