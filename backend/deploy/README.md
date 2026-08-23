# Bloom backend deployment

The API stores image bytes on the filesystem and stores only media metadata and
the relative file path in PostgreSQL. Set `BLOOM_UPLOADS_PATH` in the server's
private `deploy/.env` file to the host folder that should contain uploads.

The compose file mounts that folder at `/data/uploads` and sets
`ImageStorage:RootPath` to `/data/uploads`. It also persists ASP.NET Data
Protection keys in the `bloom_keys` Docker volume; those keys must survive
container replacement because uploaded files are protected at rest.

Deployment steps on a server:

1. Copy `.env.example` to `.env` and set `IMAGE_OWNER`, `POSTGRES_PASSWORD`,
   and an absolute `BLOOM_UPLOADS_PATH`.
2. Ensure the Docker service account can read and write that upload folder.
3. The GitHub Actions deployment uploads `docker-compose.yml`, pulls the GHCR
   image, and starts the database and API containers.

Database migrations are disabled by default in production. For an intentional
migration release, set `BLOOM_APPLY_MIGRATIONS_ON_STARTUP=true` before deploying,
then set it back to `false` after the migration has completed.
