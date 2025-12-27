import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useAppStore } from "../lib/store";
import "@xterm/xterm/css/xterm.css";

export function Terminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef<boolean>(false);
  const pausedBufferRef = useRef<string>('');
  const projectPath = useAppStore((s) => s.projectPath);

  useEffect(() => {
    if (!terminalRef.current || !projectPath) return;

    // Initialize xterm
    const xterm = new XTerm({
      cursorBlink: true,
      scrollback: 1000, // Limit scrollback buffer to prevent memory issues
      fontSize: 13,
      fontFamily: "Geist Mono, Monaco, Menlo, monospace",
      theme: {
        background: "#0a0a0a",
        foreground: "#ededed",
        cursor: "#ededed",
        cursorAccent: "#0a0a0a",
        selectionBackground: "#3b3b3b",
        black: "#0a0a0a",
        red: "#ff6b6b",
        green: "#4ade80",
        yellow: "#fbbf24",
        blue: "#60a5fa",
        magenta: "#c084fc",
        cyan: "#22d3ee",
        white: "#ededed",
        brightBlack: "#666666",
        brightRed: "#ff8a8a",
        brightGreen: "#86efac",
        brightYellow: "#fcd34d",
        brightBlue: "#93c5fd",
        brightMagenta: "#d8b4fe",
        brightCyan: "#67e8f9",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Spawn PTY
    const spawnPty = async () => {
      try {
        const dims = fitAddon.proposeDimensions();
        const cols = dims?.cols || 80;
        const rows = dims?.rows || 24;

        const ptyId = await invoke<number>("spawn_pty", {
          workingDir: projectPath,
          cols,
          rows,
        });
        ptyIdRef.current = ptyId;
        setIsConnected(true);

        // Throttled output buffering
        let writeBuffer = '';
        let writeTimeout: number | null = null;

        const flushBuffer = () => {
          if (isPausedRef.current) {
            // Accumulate in paused buffer instead of writing
            pausedBufferRef.current += writeBuffer;
            writeBuffer = '';
            writeTimeout = null;
            return;
          }

          if (writeBuffer) {
            xterm.write(writeBuffer);
            writeBuffer = '';
          }
          writeTimeout = null;
        };

        // Listen for PTY output
        const unlistenOutput = await listen<string>(
          `pty-output-${ptyId}`,
          (event) => {
            writeBuffer += event.payload;

            if (writeTimeout) clearTimeout(writeTimeout);
            writeTimeout = setTimeout(flushBuffer, 16); // ~60fps
          }
        );

        // Listen for PTY exit
        const unlistenExit = await listen(`pty-exit-${ptyId}`, () => {
          // Flush any remaining buffered output
          if (writeTimeout) clearTimeout(writeTimeout);
          flushBuffer();

          xterm.write("\r\n\x1b[31m[Process exited]\x1b[0m\r\n");
          setIsConnected(false);
        });

        // Store unlisteners for cleanup
        (xterm as any)._unlisteners = [unlistenOutput, unlistenExit];
      } catch (err) {
        console.error("Failed to spawn PTY:", err);
        xterm.write(`\x1b[31mFailed to spawn terminal: ${err}\x1b[0m\r\n`);
      }
    };

    spawnPty();

    // Handle input
    xterm.onData((data) => {
      if (ptyIdRef.current !== null) {
        invoke("write_pty", { ptyId: ptyIdRef.current, data }).catch((err) => {
          console.error("Failed to write to PTY:", err);
        });
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (ptyIdRef.current !== null) {
        const dims = fitAddon.proposeDimensions();
        if (dims) {
          invoke("resize_pty", {
            ptyId: ptyIdRef.current,
            cols: dims.cols,
            rows: dims.rows,
          }).catch(console.error);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();

      // Cleanup listeners
      const unlisteners = (xterm as any)._unlisteners as UnlistenFn[] | undefined;
      if (unlisteners) {
        unlisteners.forEach((fn) => fn());
      }

      // Kill PTY
      if (ptyIdRef.current !== null) {
        invoke("kill_pty", { ptyId: ptyIdRef.current }).catch(console.error);
      }

      xterm.dispose();
    };
  }, [projectPath]);

  // Refit terminal when collapse state changes
  useEffect(() => {
    if (!isCollapsed && fitAddonRef.current && xtermRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (ptyIdRef.current !== null) {
          const dims = fitAddonRef.current?.proposeDimensions();
          if (dims) {
            invoke("resize_pty", {
              ptyId: ptyIdRef.current,
              cols: dims.cols,
              rows: dims.rows,
            }).catch(console.error);
          }
        }
      }, 50);
    }
  }, [isCollapsed]);

  const toggleCollapse = () => setIsCollapsed((prev) => !prev);

  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    isPausedRef.current = newPausedState;

    if (!newPausedState) {
      // Resume: flush paused buffer
      if (pausedBufferRef.current && xtermRef.current) {
        xtermRef.current.write(pausedBufferRef.current);
        pausedBufferRef.current = '';
      }
    }
  };

  // Keyboard shortcut: Ctrl+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPaused]);

  return (
    <div className={`flex flex-col bg-[#0a0a0a] transition-all duration-200 ${isCollapsed ? "h-8" : "h-[500px]"}`}>
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--geist-accents-2)] bg-[var(--geist-background)]">
        <div
          className="flex items-center gap-2 flex-1 cursor-pointer select-none hover:opacity-80"
          onClick={toggleCollapse}
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-[var(--geist-accents-5)]">Terminal</span>
          {isPaused && (
            <span className="text-xs text-yellow-500 font-medium">Paused</span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePause();
          }}
          className="px-2 py-0.5 text-xs rounded hover:bg-[var(--geist-accents-2)] text-[var(--geist-accents-5)] transition-colors"
          title="Toggle pause (Ctrl+P)"
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
        <svg
          className={`w-3.5 h-3.5 text-[var(--geist-accents-5)] transition-transform duration-200 cursor-pointer ${isCollapsed ? "" : "rotate-180"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          onClick={toggleCollapse}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>
      <div
        ref={terminalRef}
        className={`flex-1 overflow-auto ${isCollapsed ? "hidden" : ""}`}
      />
    </div>
  );
}
