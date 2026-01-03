# ComposeBuilder

ComposeBuilder is a Next.js app for building Docker Compose files from templates.

## Features

- Projects → multiple compose versions per project
- Live docker-compose.yml and .env previews
- Predefined services with versions, ports, volumes, env, networks
- Spring Boot application.properties templates with inline editing
- Service templates editor
- Utility scripts manager (for future export bundles)
- Export compose bundles as ZIP

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

## Data persistence

Runtime data is stored in the `data/` folder (SQLite DB, templates, exports).
This directory is ignored by git so the repo stays clean.

## Notes

- No user accounts; everything is global.
- Template edits are stored in `data/catalog.json`.
- Scripts are stored in SQLite and can be exported later.
