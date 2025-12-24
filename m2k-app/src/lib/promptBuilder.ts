import type { Epic, Ticket } from "../types";

interface EpicPromptOptions {
  epic: Epic;
  tickets: Ticket[];
  projectPath: string;
}

/**
 * Build a comprehensive prompt for Claude Code to work on an epic
 * Following CLAUDE.md conventions and best practices
 */
export function buildEpicPrompt({ epic, tickets, projectPath }: EpicPromptOptions): string {
  const backlogTickets = tickets.filter((t) => t.status === "backlog");
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");

  // Build ticket details section
  const ticketDetails = backlogTickets
    .map((ticket) => {
      const criteriaList = ticket.criteria.length > 0
        ? ticket.criteria.map((c) => `  - ${c}`).join("\n")
        : "  - No criteria specified";

      return `### ${ticket.id}: ${ticket.title}
File: ${ticket.filePath}
Status: ${ticket.status}

Description:
${ticket.description || "No description provided"}

Acceptance Criteria:
${criteriaList}
`;
    })
    .join("\n---\n\n");

  // Build the prompt
  const prompt = `# Work on ${epic.id}: ${epic.title}

## Context
You are assigned to work on this epic. Follow the project's CLAUDE.md conventions.

## Epic Scope
${epic.scope}

## Project Path
${projectPath}

## Tickets to Complete (${backlogTickets.length} remaining)
${inProgressTickets.length > 0 ? `Note: ${inProgressTickets.length} ticket(s) already in progress.\n` : ""}
${ticketDetails || "No backlog tickets found."}

## Instructions

1. **Work Sequentially**: Complete one ticket at a time, starting with the first backlog ticket.

2. **Ticket Workflow**:
   - Move ticket file to \`inprogress/\` folder before starting
   - Implement the ticket requirements
   - Move ticket file to \`done/\` folder when complete
   - Update the epic file's ticket status table

3. **Git Workflow**:
   - Create feature branch: \`feature/${epic.id.toLowerCase()}/{description}\`
   - Commit with format: \`feat: description (T-XXX)\` or \`fix: description (T-XXX)\`
   - Include ticket reference in all commits

4. **Quality**:
   - Follow existing code patterns
   - Run build/tests after each ticket
   - Be concise in commit messages

5. **After Each Ticket**:
   - Commit your changes
   - Report completion status

Start with the first backlog ticket: ${backlogTickets[0]?.id || "No tickets available"}

@${projectPath}/epics/${epic.id}-${epic.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-")}.md
`;

  return prompt;
}

/**
 * Build a prompt for a single ticket
 */
export function buildTicketPrompt(ticket: Ticket, projectPath: string): string {
  const criteriaList = ticket.criteria.length > 0
    ? ticket.criteria.map((c) => `- ${c}`).join("\n")
    : "- No criteria specified";

  return `# Work on ${ticket.id}: ${ticket.title}

## Epic: ${ticket.epic}

## Description
${ticket.description || "No description provided"}

## Acceptance Criteria
${criteriaList}

## Instructions
1. Move this ticket to \`inprogress/\` folder
2. Implement the requirements
3. Run build/tests to verify
4. Move ticket to \`done/\` folder
5. Commit with: \`feat: ${ticket.title.toLowerCase()} (${ticket.id})\`

## Ticket File
${ticket.filePath}

@${projectPath}/CLAUDE.md
`;
}
