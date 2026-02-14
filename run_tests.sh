#!/usr/bin/env bash
# Run Django tests using jizz.settings.local and ~/.virtualenvs/jizz
# Usage: ./run_tests.sh [--coverage] [other args...]
#   --coverage  run tests under coverage and print a report (and generate htmlcov/)
set -e
export DJANGO_SETTINGS_MODULE=jizz.settings.local
PYTHON=~/.virtualenvs/jizz/bin/python

if [[ "$1" == "--coverage" ]]; then
  shift
  "$PYTHON" -m coverage run --source=jizz,compare,media manage.py test --keepdb "$@"
  "$PYTHON" -m coverage report
  "$PYTHON" -m coverage html
  echo "HTML report: htmlcov/index.html"
else
  exec "$PYTHON" manage.py test --keepdb "$@"
fi
