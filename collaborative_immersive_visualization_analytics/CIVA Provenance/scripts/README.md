# CIA Web Scripts Reference

Quick reference for all scripts in this directory.

## Core Lifecycle Scripts

### `start.sh`
Start all CIA Web services (Docker containers + Matrix federation).
```bash
./scripts/start.sh
```

### `stop.sh`
Stop all running services.
```bash
./scripts/stop.sh           # Stop services, keep data
./scripts/stop.sh --clean   # Stop and remove volumes (deletes all data!)
```

### `restart.sh`
Quick restart of services.
```bash
./scripts/restart.sh
```

### `reset-database.sh`
Wipe database and restart fresh using `init.sql`.
```bash
./scripts/reset-database.sh           # Interactive reset
./scripts/reset-database.sh --quick   # No prompts
./scripts/reset-database.sh --rebuild # Reset + rebuild Docker images
```

**Note:** After reset, clear browser IndexedDB to remove stale Y.js data:
```javascript
indexedDB.deleteDatabase('cia-datasets'); location.reload();
```

---

## Authentication Scripts

### `setup-local-auth.sh`
Configure Keycloak with test users for local development.
```bash
./scripts/setup-local-auth.sh
```

Creates these Keycloak users (passwords shown):
| User | Email | Password |
|------|-------|----------|
| cia-admin | admin@cia-web.local | Admin123! |
| alice | alice@cia-web.local | Password123! |
| bob | bob@cia-web.local | Password123! |
| viewer | viewer@cia-web.local | Password123! |

---

## Data Seeding Scripts

### `load-demo-files.sh`
Upload demo VTP files to the Sample Files project.
```bash
./scripts/load-demo-files.sh

# With authentication (production):
AUTH_TOKEN="your-jwt" ./scripts/load-demo-files.sh

# Custom API URL:
API_URL="https://your-server.com" ./scripts/load-demo-files.sh
```

### `seed-database.sh`
Seed database with base data (users, project, memberships). Usually not needed since `init.sql` handles this automatically.
```bash
./scripts/seed-database.sh
```

### `seed-mock-users.sh`
Add/manage mock users for collaboration testing.
```bash
./scripts/seed-mock-users.sh         # Seed users
./scripts/seed-mock-users.sh status  # Check current users
./scripts/seed-mock-users.sh reset   # Remove and re-seed
./scripts/seed-mock-users.sh help    # Show help
```

---

## Service Management Scripts

### `check-services.sh`
Check health status of all services.
```bash
./scripts/check-services.sh
```

### `rebuild-api.sh`
Rebuild only the API container (faster than full rebuild).
```bash
./scripts/rebuild-api.sh
```

### `start-livekit.sh` / `stop-livekit.sh`
Manage LiveKit video/voice services.
```bash
./scripts/start-livekit.sh
./scripts/stop-livekit.sh
```

---

## Build Scripts

### `buildManifestRegistry.ts`
TypeScript build tool for manifest registry. Run via ts-node or after compilation.

---

## User IDs Reference

When using dev bypass mode (`DEV_BYPASS_AUTH=true`), use these user IDs with the `x-user-id` header:

| User | ID | Purpose |
|------|----|---------|
| System | `00000000-0000-0000-0000-000000000001` | Automated processes only |
| CIA Admin | `00000000-0000-0000-0000-000000000002` | Default dev user (admin) |
| Alice | `00000000-0000-0000-0000-000000000003` | Test user (member) |
| Bob | `00000000-0000-0000-0000-000000000004` | Test user (member) |
| Viewer | `00000000-0000-0000-0000-000000000005` | Test user (read-only) |

Example API call with user header:
```bash
curl http://localhost:3001/api/workspaces \
  -H "x-user-id: 00000000-0000-0000-0000-000000000002"
```

---

## Common Workflows

### Fresh Start (New Development Setup)
```bash
./scripts/reset-database.sh --rebuild
./scripts/setup-local-auth.sh  # Optional: if using Keycloak
./scripts/load-demo-files.sh
```

### Daily Development
```bash
./scripts/start.sh      # Start services
# ... develop ...
./scripts/stop.sh       # Stop when done
```

### After Pulling New Code
```bash
./scripts/stop.sh
./scripts/reset-database.sh --rebuild
./scripts/start.sh
```

### Clear Everything and Start Fresh
```bash
./scripts/stop.sh --clean
./scripts/reset-database.sh --rebuild
```
