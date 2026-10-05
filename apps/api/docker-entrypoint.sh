#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
node dist/db/migrate.js

echo "[entrypoint] Starting API server..."
exec node dist/server.js
