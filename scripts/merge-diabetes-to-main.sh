#!/usr/bin/env bash
set -euo pipefail

# Merge patients from a source SQLite DB (default: services/node-api/data/diabetes.db)
# into the main read-only viewer DB (default: data/patient_records.db).
# Usage: ./scripts/merge-diabetes-to-main.sh [--source PATH] [--target PATH] [--backup-dir DIR]

SOURCE=${1:-}
TARGET=${2:-}
BACKUP_DIR=${BACKUP_DIR:-./backups}

print_usage() {
  cat <<USAGE
Usage: $0 [--source PATH] [--target PATH] [--backup-dir DIR]

Defaults:
  --source      services/node-api/data/diabetes.db
  --target      data/patient_records.db
  --backup-dir  ./backups

Examples:
  $0
  $0 /path/to/diabetes.db /path/to/patient_records.db /var/backups
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --backup-dir) BACKUP_DIR="$2"; shift 2 ;;
    --help|-h) print_usage; exit 0 ;;
    -n|--dry-run) DRY_RUN=1; shift ;;
    *) echo "Unknown arg: $1"; print_usage; exit 1 ;;
  esac
done

SOURCE=${SOURCE:-services/node-api/data/diabetes.db}
TARGET=${TARGET:-data/patient_records.db}
DRY_RUN=${DRY_RUN:-0}

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is required but not found in PATH" >&2
  exit 2
fi

if [ ! -f "$SOURCE" ]; then
  echo "Source DB not found: $SOURCE" >&2
  exit 3
fi
if [ ! -f "$TARGET" ]; then
  echo "Target DB not found: $TARGET" >&2
  exit 4
fi

mkdir -p "$BACKUP_DIR"
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP="$BACKUP_DIR/patient_records.db.$TS.bak"

echo "Backing up target DB to: $BACKUP"
if [ "$DRY_RUN" -eq 0 ]; then
  cp -- "$TARGET" "$BACKUP"
fi

SQL=$(cat <<'SQL'
ATTACH ? AS src;
BEGIN;
-- Insert non-duplicate patients based on email (skips NULL emails)
INSERT INTO patients (first_name,last_name,date_of_birth,gender,email,phone,address,created_at,updated_at)
SELECT firstName, lastName, dateOfBirth, gender, email, phone, (COALESCE(address,'') || ', ' || COALESCE(city,'') || ', ' || COALESCE(state,'') || ' ' || COALESCE(zipCode,'')), createdAt, updatedAt
FROM src.patients
WHERE email IS NOT NULL
  AND email NOT IN (SELECT email FROM patients WHERE email IS NOT NULL);
SELECT changes() AS inserted_count;
COMMIT;
DETACH src;
SQL
)

if [ "$DRY_RUN" -eq 1 ]; then
  echo "DRY RUN: would run SQL to insert non-duplicate patients from $SOURCE into $TARGET"
  echo "---- SQL ----"
  echo "$SQL"
  exit 0
fi

echo "Merging patients from $SOURCE into $TARGET..."
# Run sqlite3, pass the SOURCE as parameter to the ATTACH placeholder
INSERTED=$(sqlite3 "$TARGET" -cmd ".timeout 2000" "$SQL" "$SOURCE" 2>/dev/null | tail -n1)

if [ -z "$INSERTED" ]; then
  echo "Merge completed. (no inserted_count reported)"
else
  echo "Inserted patients: $INSERTED"
fi

echo "Done. Backup of pre-merge DB is at: $BACKUP"

exit 0
