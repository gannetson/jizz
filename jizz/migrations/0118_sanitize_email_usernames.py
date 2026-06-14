from django.db import migrations


def _strip_email_local_part(value):
    if not value:
        return ''
    value = value.strip()
    if '@' in value:
        value = value.split('@', 1)[0]
    return value.strip()


def _sanitize_username(value, fallback='user'):
    cleaned = _strip_email_local_part(value)
    if not cleaned:
        cleaned = fallback
    return cleaned[:150]


def _sanitize_player_name(value, fallback='Player'):
    cleaned = _strip_email_local_part(value)
    if not cleaned:
        cleaned = fallback
    return cleaned[:255]


def sanitize_email_usernames(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Player = apps.get_model('jizz', 'Player')

    taken = set(User.objects.values_list('username', flat=True))

    for user in User.objects.filter(username__contains='@').iterator():
        base = _sanitize_username(user.username)
        username = base[:150]
        counter = 1
        while username in taken and username != user.username:
            suffix = f'_{counter}'
            username = (base[: 150 - len(suffix)] + suffix).strip()
            counter += 1
        if username != user.username:
            taken.discard(user.username)
            taken.add(username)
            user.username = username
            user.save(update_fields=['username'])

    for player in Player.objects.filter(name__contains='@').iterator():
        cleaned = _sanitize_player_name(player.name)
        if cleaned != player.name:
            player.name = cleaned
            player.save(update_fields=['name'])


def reverse_sanitize_email_usernames(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('jizz', '0117_ipgeocache'),
    ]

    operations = [
        migrations.RunPython(sanitize_email_usernames, reverse_sanitize_email_usernames),
    ]
