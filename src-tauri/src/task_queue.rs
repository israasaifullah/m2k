use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{Mutex, Semaphore, mpsc};
use tokio::task::JoinHandle;
use tauri::AppHandle;
use crate::claude_executor::{ClaudeExecutor, TaskRequest, TaskResult};
use crate::task_manager::{self, TaskStatus};

#[derive(Debug, Clone)]
pub struct QueueConfig {
    pub max_concurrent: usize,
    pub max_queue_size: usize,
}

impl Default for QueueConfig {
    fn default() -> Self {
        Self {
            max_concurrent: 5,
            max_queue_size: 100,
        }
    }
}

pub struct TaskQueue {
    config: QueueConfig,
    pending: Arc<Mutex<VecDeque<(String, TaskRequest)>>>,
    active: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
    semaphore: Arc<Semaphore>,
    executor: Arc<ClaudeExecutor>,
    shutdown_tx: mpsc::Sender<()>,
    shutdown_rx: Arc<Mutex<mpsc::Receiver<()>>>,
}

impl TaskQueue {
    pub fn new(config: QueueConfig, executor: Arc<ClaudeExecutor>) -> Self {
        let (shutdown_tx, shutdown_rx) = mpsc::channel(1);

        Self {
            semaphore: Arc::new(Semaphore::new(config.max_concurrent)),
            config,
            pending: Arc::new(Mutex::new(VecDeque::new())),
            active: Arc::new(Mutex::new(HashMap::new())),
            executor,
            shutdown_tx,
            shutdown_rx: Arc::new(Mutex::new(shutdown_rx)),
        }
    }

    /// Submit task to queue
    pub async fn submit(&self, task_id: String, request: TaskRequest) -> Result<(), String> {
        let mut pending = self.pending.lock().await;

        if pending.len() >= self.config.max_queue_size {
            return Err("Task queue full".to_string());
        }

        pending.push_back((task_id, request));
        Ok(())
    }

    /// Start processing queue (call once on app startup)
    pub async fn start(&self, app: AppHandle) {
        let pending = self.pending.clone();
        let active = self.active.clone();
        let semaphore = self.semaphore.clone();
        let executor = self.executor.clone();
        let shutdown_rx = self.shutdown_rx.clone();

        tokio::spawn(async move {
            let mut rx = shutdown_rx.lock().await;

            loop {
                tokio::select! {
                    _ = rx.recv() => {
                        log::info!("Task queue shutting down");
                        break;
                    }
                    _ = Self::process_next_task(
                        pending.clone(),
                        active.clone(),
                        semaphore.clone(),
                        executor.clone(),
                        app.clone()
                    ) => {}
                }
            }
        });
    }

    async fn process_next_task(
        pending: Arc<Mutex<VecDeque<(String, TaskRequest)>>>,
        active: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
        semaphore: Arc<Semaphore>,
        executor: Arc<ClaudeExecutor>,
        app: AppHandle,
    ) {
        // Wait for available slot
        let permit = semaphore.clone().acquire_owned().await;
        if permit.is_err() {
            return;
        }
        let permit = permit.unwrap();

        // Get next task
        let task = {
            let mut queue = pending.lock().await;
            queue.pop_front()
        };

        if let Some((task_id, request)) = task {
            // Update status to running
            task_manager::update_task_status(&task_id, TaskStatus::Running, None, None).ok();

            // Spawn task execution
            let executor_clone = executor.clone();
            let app_clone = app.clone();
            let task_id_clone = task_id.clone();

            let handle = tokio::spawn(async move {
                let result = executor_clone.execute_task(
                    &task_id_clone,
                    request,
                    app_clone.clone()
                ).await;

                // Update status on completion
                match result {
                    Ok(task_result) => {
                        task_manager::update_task_status(
                            &task_id_clone,
                            TaskStatus::Completed,
                            task_result.output.as_deref(),
                            None,
                        ).ok();

                        app_clone.emit_all("task-completed", serde_json::json!({
                            "task_id": task_id_clone,
                            "status": "completed"
                        })).ok();
                    }
                    Err(e) => {
                        task_manager::update_task_status(
                            &task_id_clone,
                            TaskStatus::Failed,
                            None,
                            Some(&e),
                        ).ok();

                        app_clone.emit_all("task-failed", serde_json::json!({
                            "task_id": task_id_clone,
                            "error": e
                        })).ok();
                    }
                }

                // Release permit
                drop(permit);
            });

            // Track active task
            let mut active_tasks = active.lock().await;
            active_tasks.insert(task_id, handle);
        } else {
            // No tasks, wait a bit
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            drop(permit);
        }
    }

    /// Cancel a specific task
    pub async fn cancel_task(&self, task_id: &str) -> Result<(), String> {
        // Remove from pending queue
        {
            let mut pending = self.pending.lock().await;
            pending.retain(|(id, _)| id != task_id);
        }

        // Abort active task
        {
            let mut active = self.active.lock().await;
            if let Some(handle) = active.remove(task_id) {
                handle.abort();

                task_manager::update_task_status(
                    task_id,
                    TaskStatus::Failed,
                    None,
                    Some("Task cancelled by user"),
                )?;

                return Ok(());
            }
        }

        Err(format!("Task {} not found", task_id))
    }

    /// Get queue statistics
    pub async fn get_stats(&self) -> QueueStats {
        let pending = self.pending.lock().await;
        let active = self.active.lock().await;

        QueueStats {
            pending_count: pending.len(),
            active_count: active.len(),
            available_slots: self.semaphore.available_permits(),
            max_concurrent: self.config.max_concurrent,
        }
    }

    /// Shutdown queue gracefully
    pub async fn shutdown(&self) {
        self.shutdown_tx.send(()).await.ok();

        // Wait for active tasks to complete (with timeout)
        tokio::time::timeout(
            tokio::time::Duration::from_secs(30),
            self.wait_for_completion()
        ).await.ok();
    }

    async fn wait_for_completion(&self) {
        loop {
            let active = self.active.lock().await;
            if active.is_empty() {
                break;
            }
            drop(active);
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }
    }
}

#[derive(Debug, serde::Serialize)]
pub struct QueueStats {
    pub pending_count: usize,
    pub active_count: usize,
    pub available_slots: usize,
    pub max_concurrent: usize,
}
