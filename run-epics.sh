#!/bin/bash

# Run Multiple Epics Script
# Usage: ./run-epics.sh EPIC-002 EPIC-003 EPIC-004
# Or:    ./run-epics.sh --all (runs all epics in order)

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
EPICS_DIR="$PROJECT_DIR/project-management/epics"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[EPIC-RUNNER]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

get_all_epics() {
    ls "$EPICS_DIR"/EPIC-*.md 2>/dev/null | \
    sed 's/.*\(EPIC-[0-9]*\).*/\1/' | \
    sort -t'-' -k2 -n
}

run_epic() {
    local epic="$1"
    local epic_file=$(ls "$EPICS_DIR"/${epic}*.md 2>/dev/null | head -1)

    if [[ ! -f "$epic_file" ]]; then
        error "Epic file not found: $epic"
        return 1
    fi

    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Starting: $epic"
    log "File: $epic_file"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Run Claude Code interactively
    claude "Work on $epic. Find all tickets, execute each 1 by 1, move completed to done/, create branch and commit per ticket. Clear context when done."

    local status=$?

    if [[ $status -eq 0 ]]; then
        log "✓ Completed: $epic"
    else
        error "✗ Failed: $epic (exit code: $status)"
    fi

    return $status
}

# Main
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 EPIC-002 EPIC-003 ..."
    echo "       $0 --all"
    echo ""
    echo "Available epics:"
    get_all_epics | while read epic; do echo "  - $epic"; done
    exit 1
fi

EPICS=()

if [[ "$1" == "--all" ]]; then
    while IFS= read -r epic; do
        EPICS+=("$epic")
    done < <(get_all_epics)
else
    EPICS=("$@")
fi

log "Epics to run: ${EPICS[*]}"
echo ""

FAILED=()
PASSED=()

for epic in "${EPICS[@]}"; do
    run_epic "$epic"
    if [[ $? -eq 0 ]]; then
        PASSED+=("$epic")
    else
        FAILED+=("$epic")
    fi
    echo ""
done

# Summary
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "SUMMARY"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "Completed: ${#PASSED[@]} | Failed: ${#FAILED[@]}"

if [[ ${#FAILED[@]} -gt 0 ]]; then
    error "Failed epics: ${FAILED[*]}"
    exit 1
fi

log "All epics completed successfully!"
