#!/bin/bash
SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
SUPER_ADMIN_ID="c0000000-0000-0000-0000-000000000000"
SUPER_ADMIN_EMAIL="admin@servolu.com"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-changeme123!}"

curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"${SUPER_ADMIN_ID}\", \"email\": \"${SUPER_ADMIN_EMAIL}\", \"password\": \"${SUPER_ADMIN_PASSWORD}\", \"email_confirm\": true}"

echo "Super admin user created: ${SUPER_ADMIN_EMAIL}"
