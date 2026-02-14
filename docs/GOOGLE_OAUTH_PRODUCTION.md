# Google Login in Production

For Google OAuth to work in production you need: correct **nginx** proxy headers, **Django** settings (see `jizz/settings/production.py`), and **Google Cloud Console** redirect URIs.

## 0. Route API traffic to Django (fix 405 on POST /token/)

If the frontend and API use the same host (e.g. `birdr.pro`), nginx must send **API paths to Django** and only serve the SPA for other paths. Otherwise POST requests (e.g. `POST /token/` for login) hit the static file server and return **405 Not Allowed**.

Define a location that matches Django paths **before** your SPA catch-all:

```nginx
# Django (API, auth, admin, static prefix, media)
location ~ ^/(token|auth|api|admin|country|stat|media)/ {
    proxy_pass http://127.0.0.1:8050;   # or your Django backend
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# SPA (React app) – only for non-API paths
location / {
    root /var/www/jizz/app/build;   # or your build output
    try_files $uri $uri/ /index.html;
}
```

Paths that must reach Django: `/token/`, `/token/refresh/`, `/auth/`, `/api/`, `/admin/`, `/country/`, `/stat/` (Django `STATIC_URL`), `/media/`.

**If `/auth/login/google-oauth2/` still returns the React app (index.html):** nginx may be using `location /` for that request. Use **prefix locations with `^~`** so these paths are taken first and never fall through to the SPA. Put these **before** your `location /` block:

```nginx
# Django – must appear BEFORE location /
location ^~ /auth/ {
    proxy_pass http://jizz;   # or http://127.0.0.1:8050
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location ^~ /token/ {
    proxy_pass http://jizz;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location ^~ /api/ {
    proxy_pass http://jizz;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location ^~ /admin/ {
    proxy_pass http://jizz;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location ^~ /country/ {
    proxy_pass http://jizz;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Then keep your existing `location /` (SPA) and other blocks. Reload nginx: `sudo nginx -t && sudo systemctl reload nginx`.

## 1. Nginx

When proxying to Django (Gunicorn/Daphne), nginx must pass scheme and host so Django builds the right callback URL (HTTPS and correct host).

In the `location` block that proxies to your Django app, add:

```nginx
location / {
    proxy_pass http://127.0.0.1:8050;   # or your Django server
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # If Django is served under a different host (e.g. api.example.com):
    # proxy_set_header X-Forwarded-Host $host;
}
```

- **`X-Forwarded-Proto $scheme`** — So Django sees the request as HTTPS and builds `https://...` URLs (required for the redirect_uri sent to Google).
- **`Host $host`** — So Django uses the same host the user sees (e.g. `jizz.be` or `birdr.pro`) when building the callback URL.

If your API is on a different host (e.g. `api.jizz.be`) and you want the callback URL to use that host, keep passing `Host` as the API host or use `X-Forwarded-Host` and `USE_X_FORWARDED_HOST = True` in Django (already set in production).

## 2. Django (production settings)

Already configured in `jizz/settings/production.py`:

- **`SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')`** — Trusts nginx’s `X-Forwarded-Proto` so `request.is_secure()` is True and generated URLs use `https`.
- **`USE_X_FORWARDED_HOST = True`** — Uses `X-Forwarded-Host` (if set) for building absolute URLs.
- **`SOCIAL_AUTH_LOGIN_REDIRECT_URL`** — Frontend URL where users land after login (e.g. `https://jizz.be/login/google`).
- **`SOCIAL_AUTH_REDIRECT_IS_HTTPS = True`** — Tells social-auth to use HTTPS for redirect URIs.

Ensure `SOCIAL_AUTH_GOOGLE_OAUTH2_KEY` and `SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET` are set (e.g. via env) in production.

## 3. Google Cloud Console

The **Authorized redirect URI** that Google uses is your **backend** callback URL, not the frontend `/login/google` page.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project → **APIs & Services** → **Credentials** → your OAuth 2.0 Client ID.
2. Under **Authorized redirect URIs** add the exact backend URL Django uses for the OAuth callback. That is:
   - `https://<your-api-host>/auth/complete/google-oauth2/`
   Examples:
   - `https://jizz.be/auth/complete/google-oauth2/`
   - `https://birdr.pro/auth/complete/google-oauth2/`
   Use the same scheme and host that nginx and Django use (the one in `ALLOWED_HOSTS` and that users hit when they start login).
3. Under **Authorized JavaScript origins** add your frontend origin(s), e.g.:
   - `https://jizz.be`
   - `https://birdr.pro`
4. Save.

If the redirect URI in the console does not match exactly (including trailing slash and `https`), Google will show “redirect_uri_mismatch” and login will fail.

## 4. Frontend (env)

In production the app uses `REACT_APP_API_URL` so the “Continue with Google” link hits the backend. Set it to your backend root, e.g.:

- `REACT_APP_API_URL=https://jizz.be`  
  or  
- `REACT_APP_API_URL=https://birdr.pro`

(No trailing slash. The frontend will call `${REACT_APP_API_URL}/auth/login/google-oauth2/?redirect_uri=...`.)

## Quick checklist

- [ ] Nginx: API paths (`/token/`, `/auth/`, `/api/`, etc.) go to Django; only then SPA `try_files` for `/`. (Fixes 405 on POST /token/.)
- [ ] Nginx: `proxy_set_header X-Forwarded-Proto $scheme;` and `proxy_set_header Host $host;` on the Django proxy.
- [ ] Django production: `SECURE_PROXY_SSL_HEADER`, `USE_X_FORWARDED_HOST`, `SOCIAL_AUTH_LOGIN_REDIRECT_URL`, `SOCIAL_AUTH_REDIRECT_IS_HTTPS` (and Google key/secret).
- [ ] Google Cloud: Authorized redirect URI = `https://<api-host>/auth/complete/google-oauth2/`; Authorized JavaScript origins = your frontend origin(s).
- [ ] Frontend: `REACT_APP_API_URL` set to backend root in production.
