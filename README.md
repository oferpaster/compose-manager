# ComposeBuilder

ComposeBuilder is a Next.js app for building Docker Compose files from templates.

## Features

- Projects with multiple compose versions
- Live docker-compose.yml and .env previews + inline edit modals
- Service templates editor (defaults for image, env, ports, volumes, networks, restart, healthcheck, and more)
- Bulk import templates from existing docker-compose.yml
- Spring Boot application.properties templates with inline editing and mounted volumes
- Settings for default networks (driver support)
- Scripts manager (inline scripts and export selection)
- Utilities manager (file upload + export selection)
- Export compose bundles as ZIP with selectable sections
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

## API docs

Swagger UI is available at http://localhost:3000/docs

## Data persistence

Runtime data is stored in the `data/` folder (SQLite DB, templates, exports).
This directory is ignored by git so the repo stays clean.

## Notes

- No user accounts; everything is global.
- Template edits are stored in `data/catalog.json`.
- Scripts are stored in SQLite and can be exported later.
