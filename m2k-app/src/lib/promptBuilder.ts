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

Description:
${ticket.description || "No description"}

Acceptance Criteria:
${criteriaList}
`;
    })
    .join("\n---\n\n");

  // Build the prompt
  const prompt = `# ${epic.id}: ${epic.title}

## Epic Scope
${epic.scope}

## Tickets (${backlogTickets.length} backlog${inProgressTickets.length > 0 ? `, ${inProgressTickets.length} in progress` : ""})
${ticketDetails || "No backlog tickets"}

## Execution
1. Locate all related tickets; execute sequentially; update status
2. Per ticket:
   - Move → \`.m2k/inprogress\`
   - Implement
   - Move → \`.m2k/done\`
   - Update epic ticket status table
3. Branch: \`feature/${epic.id.toLowerCase()}/{description}\`
4. Commit: \`feat: description (${backlogTickets[0]?.id || "T-XXX"})\`
5. After each: checkout branch → commit → push
6. After completion: clear working context

Start: ${backlogTickets[0]?.id || "No tickets"}

@${projectPath}/.m2k/epics/${epic.id}-${epic.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-")}.md
@${projectPath}/CLAUDE.md
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

  return `# ${ticket.id}: ${ticket.title}

Epic: ${ticket.epic}

## Description
${ticket.description || "No description"}

## Acceptance Criteria
${criteriaList}

## Execution
1. Move → \`.m2k/inprogress\`
2. Implement
3. Run build/tests
4. Move → \`.m2k/done\`
5. Branch: \`feature/${ticket.id.toLowerCase()}/{description}\`
6. Commit: \`feat: ${ticket.title.toLowerCase()} (${ticket.id})\`
7. Checkout → commit → push

@${ticket.filePath}
@${projectPath}/CLAUDE.md
`;
}
