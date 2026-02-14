#!/usr/bin/env bash
# Run Django tests using jizz.settings.local and ~/.virtualenvs/jizz
set -e
export DJANGO_SETTINGS_MODULE=jizz.settings.local
exec ~/.virtualenvs/jizz/bin/python manage.py test --keepdb "$@"
