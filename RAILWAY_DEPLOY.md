Railway deployment checklist
===========================

This file explains the steps to make your app run on Railway, preserve the sqlite DB between deploys, and secure the admin route.

1) Build image automatically (already provided)
- I added a GitHub Actions workflow that builds and pushes a Docker image to GitHub Container Registry (GHCR) on each push to `main`.
- Image name produced: `ghcr.io/<owner>/<repo>:latest` (e.g. `ghcr.io/NManishkumar/Portfolio:latest`).

2) Configure Railway to use the image
- In Railway, create a new service and select "Deploy from a container image" (or import the repo and choose Docker image option).
- Use the image URL `ghcr.io/NManishkumar/Portfolio:latest` (replace with your repo path if different).

3) Set environment variables (required)
- In the Railway project settings for your service, set these environment variables:
  - `ADMIN_USER` — admin username
  - `ADMIN_PASS` — admin password
  - (Optional) `PORT` — Railway injects a port; your Dockerfile honors `PORT` but you can leave it unset.

4) Persistent storage for sqlite (important)
- By default Railway containers are ephemeral. To persist the sqlite DB between deploys, add a Persistent Volume (Railway plugin / disk) and mount it to `/app/data` in the service settings. This will keep `submissions.db` and `submissions.json` across restarts/deploys.
- If you can't use persistent storage, consider switching to a managed DB (Postgres) and I can update the server code to use Postgres instead.

5) Deploy and test
- Trigger a push to `main` (or let Railway build the image). Once deployed, open the service URL and visit `/admin/submissions`.
- You should be prompted for Basic Auth. Enter the `ADMIN_USER` and `ADMIN_PASS` values you set.

6) Optional: Use GHCR-built image in Railway
- If you prefer Railway to automatically deploy from your repo, you can still connect the repo; otherwise point Railway to the GHCR image (Railway will need permission to pull from GHCR — you may need to create a Personal Access Token and configure it in Railway as a registry secret).

7) Troubleshooting
- If sqlite native build fails during Railway build, verify build logs show `python3` and `build-essential` are available. The `Dockerfile` we added installs those.
- If admin page returns 401, confirm `ADMIN_USER`/`ADMIN_PASS` env vars are set correctly in Railway.

If you want, I can also:
- Add a Render/Heroku-specific config instead.
- Migrate the server to Postgres and add a free-tier-ready Docker Compose for local dev.
