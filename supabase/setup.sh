#!/bin/bash
set -e

# Configuration — adjust for your local Supabase setup
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-54322}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"

PGPASSWORD="$DB_PASSWORD"
export PGPASSWORD

echo "==> Running migrations..."
for f in supabase/migrations/*.sql; do
  echo "  Running $f"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$f"
done

echo "==> Running seed data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f supabase/seed.sql

echo "==> Creating admin user via GoTrue API..."
RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ithealth.ai",
    "password": "admin123456",
    "email_confirm": true
  }')

USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo "  Admin user may already exist. Checking..."
  USER_ID=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT id FROM auth.users WHERE email = 'admin@ithealth.ai';" | tr -d ' ')
fi

if [ -n "$USER_ID" ]; then
  echo "  Admin user ID: $USER_ID"
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO public.profiles (id, company_id, role, display_name, email)
     VALUES ('$USER_ID', '00000000-0000-0000-0000-000000000001', 'admin', 'Admin', 'admin@ithealth.ai')
     ON CONFLICT (id) DO NOTHING;"
  echo "  Admin profile created."
else
  echo "  ERROR: Could not create or find admin user."
  exit 1
fi

echo "==> Setup complete!"
echo "  Login: admin@ithealth.ai / admin123456"
