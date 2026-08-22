from django.db import migrations, models


def seed_pages(apps, schema_editor):
    MarketingPage = apps.get_model('jizz', 'MarketingPage')
    MarketingPage.objects.update_or_create(
        slug='about',
        defaults={
            'title': 'About Birdr',
            'meta_description': (
                'Birdr is a free bird identification training app. Learn birds yourself '
                'with photo quizzes, country challenges and personalised practice.'
            ),
            'body': (
                '<p>Birdr helps you learn to identify birds yourself. It is a quiz and '
                'practice app, not a camera that names the bird for you.</p>'
                '<p>You look at a photo, video or sound, pick the species, and see what '
                'to notice next time. Misses come back in My Tricky Birds. Country '
                'Challenges take you from distinctive beginners to expert lookalikes.</p>'
                '<p>Birdr is free on iPhone, Android and the web. It is a small project: '
                'feedback and photo review help more than anything else.</p>'
                '<p><a href="/play">Open the app</a> · <a href="mailto:info@birdr.pro">Contact</a></p>'
            ),
            'published': True,
            'show_in_nav': True,
            'nav_label': 'About',
            'nav_order': 10,
        },
    )
    MarketingPage.objects.update_or_create(
        slug='privacy',
        defaults={
            'title': 'Privacy',
            'meta_description': 'How Birdr uses accounts, quiz data and photos.',
            'body': (
                '<p>Birdr stores the account you create so you can keep scores, tricky '
                'birds and country progress. Quiz answers and optional profile details '
                'stay on our servers to run the app.</p>'
                '<p>Photos in quizzes come from contributors and public sources. We do '
                'not sell your personal data. Questions: '
                '<a href="mailto:info@birdr.pro">info@birdr.pro</a>.</p>'
            ),
            'published': True,
            'show_in_nav': True,
            'nav_label': 'Privacy',
            'nav_order': 20,
        },
    )


def unseed_pages(apps, schema_editor):
    MarketingPage = apps.get_model('jizz', 'MarketingPage')
    MarketingPage.objects.filter(slug__in=['about', 'privacy']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0128_species_slug'),
    ]

    operations = [
        migrations.CreateModel(
            name='MarketingPage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('slug', models.SlugField(max_length=200, unique=True)),
                ('meta_description', models.CharField(blank=True, max_length=320)),
                ('body', models.TextField(blank=True, help_text='HTML body shown on the public marketing site.')),
                ('published', models.BooleanField(default=True)),
                ('show_in_nav', models.BooleanField(default=False)),
                ('nav_label', models.CharField(blank=True, max_length=80)),
                ('nav_order', models.PositiveSmallIntegerField(default=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['nav_order', 'title'],
            },
        ),
        migrations.RunPython(seed_pages, unseed_pages),
    ]
