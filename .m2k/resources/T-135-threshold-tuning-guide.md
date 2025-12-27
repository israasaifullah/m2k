# T-135: Adaptive Throttle Threshold Tuning Guide

## Current Thresholds (Initial Implementation)

**Backend (pty.rs):**
- `<50KB/s`: 16ms delay (fast path for interactive commands)
- `50-200KB/s`: 33ms delay (medium throttle)
- `>200KB/s`: 100ms delay (heavy throttle)
- Special case: `<50KB/s` emits immediately (no delay wait)

**Frontend (Terminal.tsx):**
- Output rate indicator threshold: `>50KB/s` shows 🐢 icon
- Throttle tracking interval: 500ms

## Rationale for Initial Thresholds

### 16ms (Fast Path)
- Target: 60fps rendering
- Use case: Simple commands (ls, pwd, echo)
- Expected output: <1KB typically
- Goal: Zero perceptible delay

### 33ms (Medium Throttle)
- Target: ~30fps rendering
- Use case: Medium workloads (npm install, git log)
- Expected output: 50-200KB/s
- Goal: Smooth scrolling without UI freeze

### 100ms (Heavy Throttle)
- Target: ~10fps rendering
- Use case: Heavy streams (build logs, find /, cat large files)
- Expected output: >200KB/s
- Goal: Prevent crash, controllable output

## Tuning Methodology

### 1. Data Collection (1+ week)

Enable metrics and logging:
```bash
# Development
RUST_LOG=debug npm run tauri dev

# Production
# Metrics auto-collected via window.__terminalMetrics
```

Export metrics:
```javascript
// In browser console
function downloadMetrics() {
  const data = JSON.stringify(window.__terminalMetrics, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `terminal-metrics-${Date.now()}.json`;
  a.click();
}
downloadMetrics();
```

### 2. Analysis Targets

**Simple Commands (ls, pwd, echo):**
- P95 latency: <20ms
- Avg output rate: <10KB/s
- Current threshold: GOOD if most are <50KB/s

**Medium Workloads (npm install, git log):**
- P95 latency: <50ms
- Avg output rate: 20-100KB/s
- Current threshold: GOOD if 50-200KB/s catches majority

**Heavy Streams (build logs, find):**
- P95 frame drops: 0
- Avg output rate: >200KB/s
- Current threshold: GOOD if prevents UI freeze

### 3. Metrics to Analyze

From `window.__terminalMetrics`:
```javascript
// Calculate statistics
const metrics = window.__terminalMetrics;
const avgBufferSize = metrics.bufferSize.reduce((a,b) => a+b, 0) / metrics.bufferSize.length;
const p95WriteDuration = metrics.writeDuration.sort()[Math.floor(metrics.writeDuration.length * 0.95)];

console.log('Avg buffer size:', avgBufferSize, 'bytes');
console.log('P95 write duration:', p95WriteDuration, 'ms');
```

From RUST_LOG debug output:
- Throttle adjustment frequency
- Bytes/sec distribution
- Emit batch sizes

### 4. Threshold Adjustment Criteria

**Increase lower threshold (50KB/s → 60KB/s) if:**
- Simple commands frequently trigger medium throttle
- P95 latency for interactive commands >30ms
- Many false positives in 🐢 indicator

**Decrease lower threshold (50KB/s → 40KB/s) if:**
- UI lag reported for medium workloads
- Buffer sizes growing >10KB regularly

**Increase upper threshold (200KB/s → 250KB/s) if:**
- Medium workloads trigger heavy throttle
- No crashes/freezes even at 200KB/s
- Scrolling feels too slow for build logs

**Decrease upper threshold (200KB/s → 150KB/s) if:**
- UI freezes occur >150KB/s
- Frame drops detected at current threshold

### 5. Testing New Thresholds

After adjusting thresholds in `src-tauri/src/pty.rs`:

1. Re-run T-129 test suite
2. Collect new metrics for same workloads
3. Compare before/after:
   - Latency (P50, P95, P99)
   - Frame drops
   - User-reported lag
4. Deploy if improvement >10% with no regression

### 6. Deployment Strategy

**Conservative Approach:**
1. A/B test new thresholds (50% users)
2. Monitor metrics for 1 week
3. Roll out to 100% if successful
4. Document changes in this file

**Rollback Criteria:**
- Crash rate increase >5%
- User-reported lag increase >10%
- P95 latency regression >20%

## Historical Changes

### Version 1.0 (Initial Implementation)
- Date: 2024-12-27
- Thresholds: 50KB/s (16→33ms), 200KB/s (33→100ms)
- Rationale: Based on T-125 analysis, theoretical modeling
- Status: ✅ Deployed, awaiting real usage data

### Future Tuning
(Document threshold adjustments here as they occur)

## Current Status

**Data Collection:** Not started (requires production deployment)
**Analysis:** Pending real-world usage data
**Tuning:** Initial thresholds based on theoretical analysis
**Next Steps:**
1. Deploy current implementation
2. Collect metrics for 1-2 weeks
3. Analyze data
4. Tune if needed (improvement >10%)
