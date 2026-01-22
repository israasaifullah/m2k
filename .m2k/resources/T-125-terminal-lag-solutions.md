4# T-125: Terminal Lag Solutions

## Problem Analysis

### Current Implementation
**Backend (Rust - pty.rs:74-116)**
- 50ms batching window OR 32KB threshold
- Emits output via Tauri events

**Frontend (Terminal.tsx:75-96)**
- 16ms write throttle (~60fps)
- Buffer accumulation between flushes

### Issue
- Huge output streams (e.g., build logs, recursive ls) cause lag/crashes
- Previous fix: added delays to ALL terminal processes
- Side effect: Simple commands (ls, basic writes) also delayed → poor UX

## Root Causes
1. **No output rate limiting** - backend emits as fast as it reads (50ms batches unlimited)
2. **Frontend buffer overflow** - xterm.js can't keep up with rapid write() calls
3. **Synchronous rendering** - large outputs block UI thread
4. **No stream prioritization** - ls and massive logs treated identically

## Proposed Solutions

### Solution 1: Adaptive Throttling (Recommended)
**Approach**: Dynamic delay based on output volume

**Implementation**:
```rust
// Backend (pty.rs)
let mut recent_bytes = VecDeque::new(); // sliding window
let mut emit_delay = Duration::from_millis(16); // baseline

loop {
    match reader.read(&mut buf) {
        Ok(n) => {
            // Track bytes/sec over last 1s
            recent_bytes.push_back((Instant::now(), n));
            recent_bytes.retain(|(t, _)| t.elapsed() < Duration::from_secs(1));

            let bytes_per_sec: usize = recent_bytes.iter().map(|(_, b)| b).sum();

            // Adaptive delay: 16ms for <50KB/s, scale up to 100ms for >500KB/s
            emit_delay = if bytes_per_sec < 50_000 {
                Duration::from_millis(16)  // Fast path for normal commands
            } else if bytes_per_sec < 200_000 {
                Duration::from_millis(33)
            } else {
                Duration::from_millis(100) // Throttle heavy streams
            };

            batch.push_str(&String::from_utf8_lossy(&buf[..n]));

            if last_emit.elapsed() > emit_delay || batch.len() > 32768 {
                // Emit with current delay
            }
        }
    }
}
```

**Pros**:
- Simple commands remain fast (16ms delay)
- Heavy streams auto-throttle (100ms)
- No UX regression for normal usage
- Self-adjusting based on actual load

**Cons**:
- Requires sliding window tracking (minor memory overhead)
- Delay calculation adds small CPU cost

**UX Impact**: ✅ Minimal - users won't notice lag on normal commands

---

### Solution 2: Frontend Virtual Scrolling
**Approach**: Render only visible terminal lines

**Implementation**:
- Replace standard xterm buffer with virtualized rendering
- Keep full scrollback in memory, render viewport only
- Use xterm.js addon or custom implementation

**Pros**:
- Handles unlimited output without DOM overhead
- No backend changes needed
- Smooth scrolling maintained

**Cons**:
- Complex implementation (custom renderer or addon)
- Breaks xterm.js built-in features (search, selection may need rework)
- Higher dev effort

**UX Impact**: ⚠️ Moderate - potential feature regressions during transition

---

### Solution 3: Output Sampling
**Approach**: Skip/collapse repeated lines in massive streams

**Implementation**:
```typescript
// Frontend (Terminal.tsx)
const dedupeOutput = (buffer: string): string => {
    const lines = buffer.split('\n');
    if (lines.length < 100) return buffer; // Skip for small outputs

    const dedupe: string[] = [];
    let repeatCount = 0;
    let lastLine = '';

    for (const line of lines) {
        if (line === lastLine) {
            repeatCount++;
        } else {
            if (repeatCount > 5) {
                dedupe.push(`... (${repeatCount} similar lines) ...`);
            }
            dedupe.push(line);
            repeatCount = 0;
            lastLine = line;
        }
    }

    return dedupe.join('\n');
};

// Apply before xterm.write()
xterm.write(dedupeOutput(writeBuffer));
```

**Pros**:
- Reduces DOM nodes for repetitive output
- No delay added
- Simple to implement

**Cons**:
- Loses information (collapsed lines hidden)
- May hide important details in build logs
- Heuristic-based (not always correct)

**UX Impact**: ⚠️ High - users may miss critical output

---

### Solution 4: Progressive Loading with Pause/Resume
**Approach**: Add UI controls to pause/resume output

**Implementation**:
- Add pause button to terminal header
- Buffer output while paused
- Resume with controlled playback speed

**Pros**:
- User control over rendering
- No data loss
- Can inspect output mid-stream

**Cons**:
- Manual interaction required
- Doesn't solve automatic lag issue
- Adds UI complexity

**UX Impact**: ⚠️ Moderate - extra step for users during heavy output

---

### Solution 5: Hybrid - Adaptive + Backpressure
**Approach**: Combine adaptive throttling with frontend backpressure signal

**Implementation**:
```rust
// Backend: Listen for backpressure events
app.listen_global("pty-backpressure", |event| {
    // Increase delay when frontend overwhelmed
});
```

```typescript
// Frontend: Signal when buffer > threshold
if (writeBuffer.length > 100_000) {
    invoke('emit_event', { name: 'pty-backpressure', ptyId });
}
```

**Pros**:
- Frontend-driven throttling
- Handles extreme cases
- Bidirectional feedback loop

**Cons**:
- Most complex solution
- Requires IPC overhead
- Potential race conditions

**UX Impact**: ✅ Minimal - automatic adjustment

## Recommendation

**Primary: Solution 1 (Adaptive Throttling)**
- Immediate impact, low complexity
- Preserves UX for normal commands
- Addresses root cause (uncontrolled emit rate)

**Secondary: Solution 4 (Pause/Resume) as fallback**
- Add manual control for power users
- Complements adaptive throttling
- Useful for debugging huge logs

## Implementation Plan

### Phase 1: Adaptive Throttling
1. Add sliding window tracker to pty.rs
2. Calculate bytes/sec over 1s window
3. Adjust emit_delay dynamically (16ms → 100ms)
4. Test with massive outputs (build logs, find /, npm install)

### Phase 2: UI Enhancements
1. Add pause/resume button to Terminal.tsx
2. Display output rate indicator (KB/s)
3. Add "clear buffer" action for runaway processes

### Phase 3: Monitoring
1. Log throttle adjustments (debug mode)
2. Track lag metrics (frame drops, buffer size)
3. Tune thresholds based on real usage

## Testing Strategy

**Test Cases**:
1. Simple commands (ls, echo, pwd) - should remain <50ms response
2. Medium output (npm install) - acceptable delay, no crashes
3. Massive output (recursive find /, yes | head -1000000) - controlled throttle
4. Interactive commands (vim, top) - no input lag
5. Mixed workload (multiple PTYs active) - no cross-talk

**Success Criteria**:
- Simple commands: no perceptible delay vs current
- Heavy streams: no UI freeze or crash
- CPU usage: <10% during massive output (vs current)
- Memory: stable (no leak from buffer buildup)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Adaptive logic breaks interactive apps (vim) | High | Detect interactive mode (no \n in output), bypass throttle |
| Sliding window memory leak | Medium | Cap window to 1s, auto-prune old entries |
| Users miss output during high throttle | Low | Add visual indicator (🐢 icon) when throttled |
| Breaks existing PTY behavior | Medium | Feature flag for gradual rollout |

## Alternative Considered & Rejected

**Web Workers for Terminal Rendering**
- Reason: xterm.js requires DOM access, workers can't help
- Complexity: High, benefit: Low

**Switching to lightweight terminal (term.js)**
- Reason: xterm.js is industry standard, well-maintained
- Risk: Loss of features (ligatures, true color, addons)

## Conclusion

Solution 1 (Adaptive Throttling) provides the best balance of:
- ✅ Low implementation effort
- ✅ High impact on lag reduction
- ✅ Preserves existing UX
- ✅ No feature regression

Estimated effort: 4-6 hours (including testing)
