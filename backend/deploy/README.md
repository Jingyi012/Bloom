# Bloom backend deployment

The API stores image bytes on the filesystem and stores only media metadata and
the relative file path in PostgreSQL. Set `BLOOM_UPLOADS_PATH` in the server's
private `deploy/.env` file to the host folder that should contain uploads.

The compose file mounts that folder at `/data/uploads` and sets
`ImageStorage:RootPath` to `/data/uploads`. It also persists ASP.NET Data
Protection keys in the `bloom_keys` Docker volume; those keys must survive
container replacement because uploaded files are protected at rest.

Deployment steps on a server:

1. Copy `.env.example` to `.env` and set the Google OAuth client IDs, a strong
   `Bloom__SessionSigningKey`, `IMAGE_OWNER`, `POSTGRES_PASSWORD`,
   `POSTGRES_DATA_PATH`, and the other deployment/application values.
2. Ensure the Docker service account can read and write the upload and database
   folders.
3. The GitHub Actions deployment uploads `docker-compose.yml`, pulls the GHCR
   image, and starts the database and API containers.

## GitHub Actions setup

Create a GitHub Environment named `uat` (and `prod` if production deployments
are needed). Configure these environment variables:

- `DEPLOY_PATH` (required): absolute deployment directory on the VPS, for
  example `/opt/bloom`.
- `IMAGE_OWNER` (optional): GitHub user or organization that owns the GHCR
  package. It defaults to the repository owner.

Configure these environment secrets:

- `VPS_HOST` (required): VPS hostname or IP address.
- `VPS_USER` (required): SSH user with permission to run Docker Compose.
- `VPS_SSH_KEY` (required): private key matching an authorized key on the VPS.
- `VPS_PORT` (optional): SSH port. It defaults to `22`, so it does not need to
  be created for a standard SSH installation.

The VPS must have Docker Engine, the Docker Compose plugin, and permission for
the deployment user to run Docker. Create `${DEPLOY_PATH}/.env` on the VPS
before the first deployment by copying `.env.example` and setting the private
values. The workflow deliberately does not overwrite this private file. The
API reads the `Google__*` and `Bloom__*` entries using the same double-underscore
environment-key convention used by ASP.NET Core configuration.

If the GHCR package is private, the VPS must also authenticate Docker to GHCR
before the first deployment (or the package must be made public):

```bash
echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Database migrations are disabled by default in production. For an intentional
migration release, set `Bloom__ApplyMigrationsOnStartup=true` in `.env` before
deploying, then set it back to `false` after the migration has completed.

The example `.env` host ports for Bloom are:

- API: `28100` -> container port `8080`
- PostgreSQL: `28101` -> container port `5432`

These are separate from MemoPal's API port `18080`. PostgreSQL is bound to
`0.0.0.0` by the example configuration so an external database client can
connect. Restrict port `28101` with the server firewall, or set
`DB_BIND_HOST=127.0.0.1` and use an SSH tunnel instead.

Compose deployment values are read from `.env`; update that file for each
environment instead of changing `docker-compose.yml`.

## Physical storage locations

Uploaded image files use the host folder configured by `BLOOM_UPLOADS_PATH`:

```text
BLOOM_UPLOADS_PATH=/srv/bloom/uploads
host:      /srv/bloom/uploads
container: /data/uploads
```

PostgreSQL data uses the host folder configured by `POSTGRES_DATA_PATH`:

```text
POSTGRES_DATA_PATH=/opt/bloom-uat/postgresql/data
host:      /opt/bloom-uat/postgresql/data
container: /var/lib/postgresql/data
```

Data Protection keys are stored in the Docker-managed `bloom_keys` volume. To
see its actual physical location on the server:

```bash
docker compose config --volumes
docker volume inspect <volume-name-from-the-command-above>
```

The `Mountpoint` field is the actual path on the server. Back up the configured
uploads folder, PostgreSQL folder, and Data Protection key volume.

When changing an existing deployment from the old `bloom_db` Docker volume to
the bind-mounted folder, migrate the existing database first with `pg_dump` and
`pg_restore`; the new folder will otherwise initialize as an empty database.
