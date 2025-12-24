/**
 * Parse Claude CLI output to detect ticket completions and other signals
 */

export interface ParsedOutput {
  type:
    | "ticket_started"
    | "ticket_completed"
    | "commit"
    | "file_moved"
    | "error"
    | "info";
  ticketId?: string;
  message: string;
  raw: string;
}

const TICKET_PATTERNS = {
  // Detect "Moving T-XXX to inprogress"
  ticketStarted: /moving\s+(T-\d+)\s+to\s+inprogress/i,
  // Detect "Moving T-XXX to done" or "T-XXX completed"
  ticketCompleted: /(?:moving\s+(T-\d+)\s+to\s+done|(T-\d+)\s+(?:completed|done))/i,
  // Detect git commit messages
  commit: /(?:git commit|committed|feat:|fix:|docs:)\s*(.*)/i,
  // Detect file moves
  fileMoved: /(?:mv|moved?|rename)\s+(.+)\s+(?:to|->)\s+(.+)/i,
  // Detect errors
  error: /(?:error|failed|failure|exception)[:.\s]/i,
};

/**
 * Parse a single line of Claude CLI output
 */
export function parseOutputLine(line: string): ParsedOutput | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Check for ticket started
  const startedMatch = trimmed.match(TICKET_PATTERNS.ticketStarted);
  if (startedMatch) {
    return {
      type: "ticket_started",
      ticketId: startedMatch[1],
      message: `Started ${startedMatch[1]}`,
      raw: line,
    };
  }

  // Check for ticket completed
  const completedMatch = trimmed.match(TICKET_PATTERNS.ticketCompleted);
  if (completedMatch) {
    const ticketId = completedMatch[1] || completedMatch[2];
    return {
      type: "ticket_completed",
      ticketId,
      message: `Completed ${ticketId}`,
      raw: line,
    };
  }

  // Check for commit
  const commitMatch = trimmed.match(TICKET_PATTERNS.commit);
  if (commitMatch) {
    return {
      type: "commit",
      message: commitMatch[1] || commitMatch[0],
      raw: line,
    };
  }

  // Check for file move
  const moveMatch = trimmed.match(TICKET_PATTERNS.fileMoved);
  if (moveMatch) {
    return {
      type: "file_moved",
      message: `Moved ${moveMatch[1]} to ${moveMatch[2]}`,
      raw: line,
    };
  }

  // Check for errors
  if (TICKET_PATTERNS.error.test(trimmed)) {
    return {
      type: "error",
      message: trimmed,
      raw: line,
    };
  }

  // Default info type
  return {
    type: "info",
    message: trimmed,
    raw: line,
  };
}

/**
 * Extract ticket ID from a line if present
 */
export function extractTicketId(line: string): string | null {
  const match = line.match(/T-\d+/);
  return match ? match[0] : null;
}

/**
 * Parse multiple lines and get a summary
 */
export function parseOutputLines(lines: string[]): {
  completedTickets: string[];
  startedTickets: string[];
  commits: string[];
  errors: string[];
} {
  const result = {
    completedTickets: [] as string[],
    startedTickets: [] as string[],
    commits: [] as string[],
    errors: [] as string[],
  };

  for (const line of lines) {
    const parsed = parseOutputLine(line);
    if (!parsed) continue;

    switch (parsed.type) {
      case "ticket_completed":
        if (parsed.ticketId && !result.completedTickets.includes(parsed.ticketId)) {
          result.completedTickets.push(parsed.ticketId);
        }
        break;
      case "ticket_started":
        if (parsed.ticketId && !result.startedTickets.includes(parsed.ticketId)) {
          result.startedTickets.push(parsed.ticketId);
        }
        break;
      case "commit":
        result.commits.push(parsed.message);
        break;
      case "error":
        result.errors.push(parsed.message);
        break;
    }
  }

  return result;
}

/**
 * Generate an execution summary
 */
export function generateExecutionSummary(
  completedTickets: string[],
  totalTickets: number,
  errors: string[],
  elapsedSeconds: number
): string {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  let summary = `Execution Summary:\n`;
  summary += `- Completed: ${completedTickets.length}/${totalTickets} tickets\n`;
  summary += `- Duration: ${timeStr}\n`;

  if (completedTickets.length > 0) {
    summary += `- Tickets: ${completedTickets.join(", ")}\n`;
  }

  if (errors.length > 0) {
    summary += `\nErrors encountered:\n`;
    errors.slice(0, 5).forEach((err) => {
      summary += `- ${err}\n`;
    });
    if (errors.length > 5) {
      summary += `... and ${errors.length - 5} more\n`;
    }
  }

  return summary;
}
