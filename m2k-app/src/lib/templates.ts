export const EPIC_TEMPLATE = `# EPIC-{ID}: {Title}

## Scope
{Describe the scope of this epic - what problem does it solve?}

## Tickets

| ID | Description | Status |
|----|-------------|--------|
| T-XXX | {Ticket description} | backlog |
`;

export const TICKET_TEMPLATE = `# T-{ID}:

**Epic:** EPIC-{EPIC_ID}

## Description
- {Describe what needs to be done}

## Acceptance Criteria
- {Criterion 1}
- {Criterion 2}

## Technical Notes
- {Implementation details or approach}

## Dependencies
- {Related tickets or blockers}

## Testing
- {How to verify this works}
`;

export function createEpicFromTemplate(id: number, title: string): string {
  return EPIC_TEMPLATE
    .replace("{ID}", id.toString().padStart(3, "0"))
    .replace("{Title}", title)
    .replace("{Describe the scope of this epic - what problem does it solve?}", "");
}

export function createTicketFromTemplate(id: number, epicId: string): string {
  return TICKET_TEMPLATE
    .replace("{ID}", id.toString().padStart(3, "0"))
    .replace("{EPIC_ID}", epicId.replace("EPIC-", ""))
    .replace("- {Describe what needs to be done}", "-")
    .replace("- {Criterion 1}\n- {Criterion 2}", "-")
    .replace("- {Implementation details or approach}", "-")
    .replace("- {Related tickets or blockers}", "-")
    .replace("- {How to verify this works}", "-");
}
