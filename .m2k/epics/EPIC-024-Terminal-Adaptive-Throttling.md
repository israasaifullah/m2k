# EPIC-024: Terminal Adaptive Throttling

## Scope
Implement adaptive throttling for terminal output to eliminate lag during heavy streams while maintaining responsiveness for simple commands. Solution 1 from T-125 analysis: dynamic delay based on output volume (16ms for light loads, 100ms for heavy streams).

## Background
Current terminal implementation uses fixed 50ms backend batching + 16ms frontend throttle. This causes:
- ❌ Lag/crashes with heavy output (build logs, recursive ls)
- ❌ Unnecessary delay on simple commands (ls, echo, pwd)

**Solution:** Adaptive throttling that adjusts delay based on bytes/sec throughput.

## Tickets

| ID | Description | Status |
|----|-------------|--------|
| T-127 | Implement sliding window tracker in pty.rs | backlog |
| T-128 | Add dynamic throttle calculation (16ms-100ms) | backlog |
| T-129 | Test adaptive throttling across workloads | backlog |
| T-130 | Add pause/resume button to Terminal UI | backlog |
| T-131 | Display output rate indicator (KB/s) | backlog |
| T-132 | Add clear buffer action for runaway processes | backlog |
| T-133 | Implement throttle adjustment logging | backlog |
| T-134 | Add lag metrics tracking (frame drops, buffer) | backlog |
| T-135 | Tune thresholds based on real usage data | backlog |

## Success Criteria
- ✅ Simple commands: <50ms response (no perceptible delay)
- ✅ Heavy streams: no UI freeze or crash
- ✅ CPU usage: <10% during massive output
- ✅ Memory: stable (no buffer leak)
- ✅ Interactive apps (vim): no input lag

## Technical Approach
**Backend (Rust - pty.rs):**
- VecDeque sliding window (1s retention)
- Track bytes/sec over window
- Adaptive emit_delay: 16ms (<50KB/s) → 33ms (<200KB/s) → 100ms (>500KB/s)

**Frontend (Terminal.tsx):**
- Pause/resume controls
- Output rate display
- Buffer management UI

## Dependencies
- Based on: T-125 analysis (.m2k/resources/T-125-terminal-lag-solutions.md)

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Breaks interactive apps (vim, top) | Detect interactive mode (no \n), bypass throttle |
| Sliding window memory leak | Cap to 1s, auto-prune old entries |
| Users miss output during throttle | Visual indicator (🐢 icon) when throttled |
| Regression in PTY behavior | Feature flag for gradual rollout |
