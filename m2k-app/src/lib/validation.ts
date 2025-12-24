export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEpic(content: string): ValidationResult {
  const errors: string[] = [];

  // Check for epic ID format
  const epicIdMatch = content.match(/^# EPIC-(\d{3}): /m);
  if (!epicIdMatch) {
    errors.push("Epic must have ID in format: # EPIC-XXX: Title");
  }

  // Check for scope section
  if (!content.includes("## Scope")) {
    errors.push("Epic must have a Scope section");
  }

  // Check for tickets table
  if (!content.includes("## Tickets")) {
    errors.push("Epic must have a Tickets section");
  }

  return { valid: errors.length === 0, errors };
}

export function validateTicket(content: string): ValidationResult {
  const errors: string[] = [];

  // Check for ticket ID format
  const ticketIdMatch = content.match(/^# T-(\d{3}):/m);
  if (!ticketIdMatch) {
    errors.push("Ticket must have ID in format: # T-XXX:");
  }

  // Check for epic reference
  const epicRefMatch = content.match(/\*\*Epic:\*\* EPIC-\d{3}/);
  if (!epicRefMatch) {
    errors.push("Ticket must have Epic reference in format: **Epic:** EPIC-XXX");
  }

  // Check for description section
  if (!content.includes("## Description")) {
    errors.push("Ticket must have a Description section");
  }

  // Check for acceptance criteria section
  if (!content.includes("## Acceptance Criteria")) {
    errors.push("Ticket must have an Acceptance Criteria section");
  }

  return { valid: errors.length === 0, errors };
}
