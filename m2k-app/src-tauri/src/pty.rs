use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct PtyInstance {
    writer: Box<dyn Write + Send>,
    _child: Box<dyn portable_pty::Child + Send + Sync>,
}

lazy_static::lazy_static! {
    static ref PTY_INSTANCES: Mutex<HashMap<u32, Arc<Mutex<PtyInstance>>>> = Mutex::new(HashMap::new());
    static ref NEXT_PTY_ID: Mutex<u32> = Mutex::new(1);
}

pub fn spawn_pty(app: AppHandle, working_dir: String, cols: u16, rows: u16) -> Result<u32, String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open pty: {}", e))?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.cwd(&working_dir);

    // Set environment variables for proper terminal behavior
    cmd.env("TERM", "xterm-256color");
    cmd.env("COLORTERM", "truecolor");

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take writer: {}", e))?;

    // Generate PTY ID
    let pty_id = {
        let mut id = NEXT_PTY_ID.lock().unwrap();
        let current = *id;
        *id += 1;
        current
    };

    // Store PTY instance
    {
        let mut instances = PTY_INSTANCES.lock().unwrap();
        instances.insert(
            pty_id,
            Arc::new(Mutex::new(PtyInstance {
                writer,
                _child: child,
            })),
        );
    }

    // Spawn reader thread to emit output events
    let app_clone = app.clone();
    let pty_id_clone = pty_id;
    thread::spawn(move || {
        let mut buf = [0u8; 8192]; // Increased buffer size
        let mut batch = String::new();
        let mut last_emit = Instant::now();

        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    // EOF - emit any remaining batch before exit
                    if !batch.is_empty() {
                        let _ = app_clone.emit(&format!("pty-output-{}", pty_id_clone), batch.clone());
                    }
                    let _ = app_clone.emit(&format!("pty-exit-{}", pty_id_clone), ());
                    break;
                }
                Ok(n) => {
                    batch.push_str(&String::from_utf8_lossy(&buf[..n]));

                    // Emit every 50ms OR when batch exceeds 32KB
                    if last_emit.elapsed() > Duration::from_millis(50) || batch.len() > 32768 {
                        let _ = app_clone.emit(&format!("pty-output-{}", pty_id_clone), batch.clone());
                        batch.clear();
                        last_emit = Instant::now();
                    }
                }
                Err(e) => {
                    log::error!("PTY read error: {}", e);
                    // Emit any remaining batch before error exit
                    if !batch.is_empty() {
                        let _ = app_clone.emit(&format!("pty-output-{}", pty_id_clone), batch);
                    }
                    break;
                }
            }
        }

        // Clean up
        let mut instances = PTY_INSTANCES.lock().unwrap();
        instances.remove(&pty_id_clone);
    });

    Ok(pty_id)
}

pub fn write_pty(pty_id: u32, data: String) -> Result<(), String> {
    let instances = PTY_INSTANCES.lock().unwrap();
    let instance = instances
        .get(&pty_id)
        .ok_or_else(|| "PTY not found".to_string())?;

    let mut pty = instance.lock().unwrap();
    pty.writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {}", e))?;
    pty.writer
        .flush()
        .map_err(|e| format!("Failed to flush PTY: {}", e))?;

    Ok(())
}

pub fn resize_pty(pty_id: u32, cols: u16, rows: u16) -> Result<(), String> {
    // Note: portable-pty doesn't expose resize after creation easily
    // This is a limitation - for full resize support, consider using a different approach
    log::info!("Resize requested for PTY {}: {}x{}", pty_id, cols, rows);
    Ok(())
}

pub fn kill_pty(pty_id: u32) -> Result<(), String> {
    let mut instances = PTY_INSTANCES.lock().unwrap();
    instances.remove(&pty_id);
    Ok(())
}
