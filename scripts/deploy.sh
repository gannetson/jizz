#!/usr/bin/env bash
set -euo pipefail

ssh birdr.pro <<'ENDSSH'
set -euo pipefail
cd /var/www/jizz/jizz
git pull
export DJANGO_SETTINGS_MODULE=jizz.settings.production
source ../env/bin/activate
./manage.py migrate
sudo supervisorctl restart all
ENDSSH

echo "Deploy finished."
