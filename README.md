# ComposeBuilder

ComposeBuilder is a Next.js app for building Docker Compose files from templates.

## Features

- Projects with multiple compose versions
- Live docker-compose.yml and .env previews + inline edit modals
- Service templates editor (defaults for image, env, ports, volumes, networks, restart, healthcheck, and more)
- Depends on configuration with conditions (templates + service instances)
- Dependency map viewer/editor (interactive graph with hierarchical/free layouts, focus mode, and editable dependency conditions)
- Bulk import templates from existing docker-compose.yml
- Spring Boot application.properties templates with inline editing and mounted volumes
- Settings for default networks (driver support)
- Automatic version refresh for service templates (daily + manual refresh when registry is configured)
- Scripts manager (inline scripts and export selection)
- Utilities manager (file upload + export selection)
- Export compose bundles as ZIP with selectable sections
- Download Docker images via Docker socket (per compose, select images, store tar archives)
- Snapshots (stored export ZIPs per compose version)
- Nginx config section (inline edits + export files)
- Prometheus config (per-service toggle + global inline config)
- Validation for missing/unused env vars across compose, .env, and application.properties
- Swagger/OpenAPI docs at `/docs`

## Requirements

- Node.js 20+
- npm 9+

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

The app will be available at http://localhost:3000

### Download images configuration

To enable "Download Images", mount the Docker socket and provide registry credentials:

```yaml
services:
  composebuilder:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      DOCKER_SOCKET: /var/run/docker.sock
      REGISTRY_HOST: "artifactory.example.com:6043"
      REGISTRY_USERNAME: "your-username"
      REGISTRY_PASSWORD: "your-password"
```

Downloaded image tar files are stored in `data/downloads` and can be included in exports.

## API docs

Swagger UI is available at http://localhost:3000/docs

## Data persistence

Runtime data is stored in the `data/` folder (SQLite DB, templates, exports).
This directory is ignored by git so the repo stays clean.

## Linux permissions fix

If you see `SQLITE_CANTOPEN` or `/app/data` is owned by root on Linux, run:

```bash
./fix-nextjs-sqlite-perms.sh ./data
```

This script ensures the bind-mounted `./data` folder is writable by the container's user.

## Notes

- No user accounts; everything is global.
- Template edits are stored in `data/catalog.json`.
- Scripts are stored in SQLite and can be exported later.
