from django.apps import AppConfig

class JizzConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'jizz'

    def ready(self):
        import jizz.signals  # noqa 