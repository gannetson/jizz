"""
Django settings module.

This module imports the appropriate settings based on the environment.
By default, it uses local settings for development.
"""

import os

# Set default settings module if not already set
if 'DJANGO_SETTINGS_MODULE' not in os.environ:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'jizz.settings.testing')

# Import the appropriate settings module
settings_module = os.environ.get('DJANGO_SETTINGS_MODULE', 'jizz.settings.testing')

if settings_module == 'jizz.settings.local':
    from .local import *
elif settings_module == 'jizz.settings.production':
    from .testing import *
elif settings_module == 'jizz.settings.testing':
    from .production import *
else:
    # Default to local for development
    from .local import *


