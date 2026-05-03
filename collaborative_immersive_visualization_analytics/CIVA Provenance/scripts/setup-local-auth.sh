#!/bin/bash
# setup-local-auth.sh - Configure Keycloak realm/client/users and seed DB mappings

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq
require_cmd docker

sanitize() {
  printf '%s' "$1" | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

KC_URL="$(sanitize "${KEYCLOAK_URL:-http://localhost:8080}")"
KC_REALM="$(sanitize "${KEYCLOAK_REALM:-cia-web}")"
KC_CLIENT_ID="$(sanitize "${KEYCLOAK_CLIENT_ID:-cia-web-app}")"
KC_ADMIN_USER="$(sanitize "${KEYCLOAK_ADMIN_USER:-admin}")"
KC_ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"

# Normalize URL to avoid malformed curl input (strip trailing slash)
KC_URL="${KC_URL%/}"

DB_CONTAINER="${DB_CONTAINER:-cia-postgres}"
DB_USER="${POSTGRES_USER:-ciauser}"
DB_NAME="${POSTGRES_DB:-cia_analytics}"

CIA_ORG_ID="${CIA_ORG_ID:-00000000-0000-0000-0000-000000000000}"
CIA_PROJECT_ID="${CIA_PROJECT_ID:-00000000-0000-0000-0000-000000000001}"

log() {
  printf "• %s\n" "$*" >&2
}

kc_token() {
  curl -sS -X POST "${KC_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "grant_type=password" \
    -d "client_id=admin-cli" \
    -d "username=${KC_ADMIN_USER}" \
    -d "password=${KC_ADMIN_PASS}" \
    | jq -r '.access_token'
}

KC_TOKEN="$(kc_token)"
if [ -z "${KC_TOKEN}" ] || [ "${KC_TOKEN}" = "null" ]; then
  echo "Failed to obtain Keycloak admin token. Check KEYCLOAK_ADMIN_* credentials." >&2
  exit 1
fi

kc_request() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  if [ -n "${data}" ]; then
    curl -sS -X "${method}" \
      -H "Authorization: Bearer ${KC_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "${data}" \
      "${KC_URL}${path}"
  else
    curl -sS -X "${method}" \
      -H "Authorization: Bearer ${KC_TOKEN}" \
      "${KC_URL}${path}"
  fi
}

kc_get() {
  local path="$1"
  shift
  curl -sS -G \
    -H "Authorization: Bearer ${KC_TOKEN}" \
    "${KC_URL}${path}" \
    "$@"
}

kc_status() {
  curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer ${KC_TOKEN}" \
    "${KC_URL}$1"
}

ensure_realm() {
  local status
  status="$(kc_status "/admin/realms/${KC_REALM}")"
  if [ "${status}" = "404" ]; then
    log "Creating realm ${KC_REALM}"
    kc_request POST "/admin/realms" "{\"realm\":\"${KC_REALM}\",\"enabled\":true}" >/dev/null
  else
    log "Realm ${KC_REALM} already exists"
  fi
}

ensure_client() {
  local client_json client_uuid
  client_json="$(kc_get "/admin/realms/${KC_REALM}/clients" --data-urlencode "clientId=${KC_CLIENT_ID}")"
  client_uuid="$(echo "${client_json}" | jq -r '.[0].id // empty')"

  if [ -z "${client_uuid}" ]; then
    log "Creating client ${KC_CLIENT_ID}"
    kc_request POST "/admin/realms/${KC_REALM}/clients" "$(cat <<JSON
{
  "clientId": "${KC_CLIENT_ID}",
  "name": "CIA Web Frontend",
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "redirectUris": [
    "http://localhost:8081/*",
    "https://localhost:8081/*"
  ],
  "webOrigins": [
    "http://localhost:8081",
    "https://localhost:8081"
  ]
}
JSON
)" >/dev/null
  else
    log "Client ${KC_CLIENT_ID} already exists"
  fi
}

ensure_role() {
  local role="$1"
  local status
  status="$(kc_status "/admin/realms/${KC_REALM}/roles/${role}")"
  if [ "${status}" = "404" ]; then
    log "Creating role ${role}"
    kc_request POST "/admin/realms/${KC_REALM}/roles" "{\"name\":\"${role}\"}" >/dev/null
  else
    log "Role ${role} already exists"
  fi
}

create_or_get_user() {
  local username="$1"
  local email="$2"
  local display_name="$3"

  local user_json user_id
  user_json="$(kc_get "/admin/realms/${KC_REALM}/users" --data-urlencode "username=${username}")"
  user_id="$(echo "${user_json}" | jq -r '.[0].id // empty')"

  if [ -z "${user_id}" ]; then
    log "Creating user ${username}"
    kc_request POST "/admin/realms/${KC_REALM}/users" "$(cat <<JSON
{
  "username": "${username}",
  "email": "${email}",
  "firstName": "${display_name}",
  "enabled": true,
  "emailVerified": true
}
JSON
)" >/dev/null

    user_json="$(kc_get "/admin/realms/${KC_REALM}/users" --data-urlencode "username=${username}")"
    user_id="$(echo "${user_json}" | jq -r '.[0].id // empty')"
  else
    log "User ${username} already exists"
  fi

  echo "${user_id}"
}

set_user_password() {
  local user_id="$1"
  local password="$2"
  kc_request PUT "/admin/realms/${KC_REALM}/users/${user_id}/reset-password" "$(cat <<JSON
{
  "type": "password",
  "value": "${password}",
  "temporary": false
}
JSON
)" >/dev/null
}

assign_realm_roles() {
  local user_id="$1"
  shift

  local roles_json="[]"
  for role in "$@"; do
    local role_repr
    role_repr="$(kc_request GET "/admin/realms/${KC_REALM}/roles/${role}")"
    roles_json="$(echo "${roles_json}" | jq ". + [${role_repr}]")"
  done

  kc_request POST "/admin/realms/${KC_REALM}/users/${user_id}/role-mappings/realm" "${roles_json}" >/dev/null
}

sql_escape() {
  echo "$1" | sed "s/'/''/g"
}

ensure_realm
ensure_client
ensure_role "user"
ensure_role "admin"

# Users with FIXED database UUIDs (must match mockUsers.js)
# Note: System user (000001) is not created in Keycloak - it's for automated processes only
# Format: username|email|display_name|role|password|db_uuid
USERS=(
  "cia-admin|admin@cia-web.local|CIA Admin|admin|Admin123!|00000000-0000-0000-0000-000000000002"
  "alice|alice@cia-web.local|Alice Analyst|user|Password123!|00000000-0000-0000-0000-000000000003"
  "bob|bob@cia-web.local|Bob Builder|user|Password123!|00000000-0000-0000-0000-000000000004"
  "viewer|viewer@cia-web.local|View Only|user|Password123!|00000000-0000-0000-0000-000000000005"
)

USER_RECORDS=()

for entry in "${USERS[@]}"; do
  IFS="|" read -r username email display_name role password db_uuid <<< "${entry}"

  # Create user in Keycloak (returns Keycloak's UUID)
  kc_user_id="$(create_or_get_user "${username}" "${email}" "${display_name}")"
  if [ -z "${kc_user_id}" ]; then
    echo "Failed to create or fetch user ${username}" >&2
    exit 1
  fi

  set_user_password "${kc_user_id}" "${password}"

  if [ "${role}" = "admin" ]; then
    assign_realm_roles "${kc_user_id}" "user" "admin"
  else
    assign_realm_roles "${kc_user_id}" "user"
  fi

  # Store: username|email|display_name|role|keycloak_id|database_uuid
  USER_RECORDS+=("${username}|${email}|${display_name}|${role}|${kc_user_id}|${db_uuid}")
done

log "Seeding database mappings (users + memberships)"

# Use the fixed admin UUID for project creation
# Note: System (000001) is for automated processes, Admin (000002) is for human admin
ADMIN_DB_UUID="00000000-0000-0000-0000-000000000002"

sql="BEGIN;"
sql+="\nINSERT INTO organizations (id, name, slug, storage_quota_bytes)"
sql+="\nVALUES ('${CIA_ORG_ID}', 'System', 'system', 1099511627776)"
sql+="\nON CONFLICT (id) DO NOTHING;"
sql+="\nINSERT INTO projects (id, organization_id, name, slug, description, visibility, created_by)"
sql+="\nVALUES ('${CIA_PROJECT_ID}', '${CIA_ORG_ID}', 'Demo Project', 'sample-files', 'Default demo project for development and testing', 'public', '${ADMIN_DB_UUID}')"
sql+="\nON CONFLICT (id) DO NOTHING;"

for record in "${USER_RECORDS[@]}"; do
  # Parse: username|email|display_name|role|keycloak_id|database_uuid
  IFS="|" read -r username email display_name role kc_user_id db_uuid <<< "${record}"

  email_escaped="$(sql_escape "${email}")"
  name_escaped="$(sql_escape "${display_name}")"

  # Use fixed DB UUID, store Keycloak ID in external_id
  sql+="\nINSERT INTO users (id, external_id, email, display_name)"
  sql+="\nVALUES ('${db_uuid}', '${kc_user_id}', '${email_escaped}', '${name_escaped}')"
  sql+="\nON CONFLICT (id) DO UPDATE SET external_id = EXCLUDED.external_id, email = EXCLUDED.email, display_name = EXCLUDED.display_name;"

  sql+="\nINSERT INTO organization_members (organization_id, user_id, role)"
  sql+="\nVALUES ('${CIA_ORG_ID}', '${db_uuid}', '${role}')"
  sql+="\nON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;"

  project_role="member"
  if [ "${role}" = "admin" ]; then
    project_role="admin"
  fi

  sql+="\nINSERT INTO project_members (project_id, user_id, role)"
  sql+="\nVALUES ('${CIA_PROJECT_ID}', '${db_uuid}', '${project_role}')"
  sql+="\nON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;"
done

sql+="\nCOMMIT;"

printf "%b\n" "${sql}" | docker exec -i "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" >/dev/null

log "Done. Test users created in Keycloak and mapped in Postgres."
log "Default project: ${CIA_PROJECT_ID}"
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Mock Users for Testing                      ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo ""
printf "        %-18s | %-20s | %s\n" "Name" "Email" "Password"
echo "--------------------+----------------------+---------------"
for entry in "${USERS[@]}"; do
  IFS="|" read -r username email display_name _role password _db_uuid <<< "${entry}"
  printf " %-18s | %-20s | %s\n" "${display_name}" "${email}" "${password}"
done
echo ""
