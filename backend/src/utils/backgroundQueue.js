class BackgroundQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  /**
   * Enqueue a task
   * @param {Function} taskAsyncFn - An asynchronous function returning a Promise
   * @param {string} name - Human-readable name for logging
   */
  enqueue(taskAsyncFn, name = 'unnamed-task') {
    this.queue.push({ task: taskAsyncFn, name });
    console.log(`[BackgroundQueue] Enqueued task: "${name}". Queue size: ${this.queue.length}`);
    
    if (!this.processing) {
      this.processNext();
    }
  }

  async processNext() {
    if (this.queue.length === 0) {
      this.processing = false;
      console.log('[BackgroundQueue] All queued tasks complete.');
      return;
    }

    this.processing = true;
    const { task, name } = this.queue.shift();

    try {
      console.log(`[BackgroundQueue] Processing task: "${name}"`);
      await task();
      console.log(`[BackgroundQueue] Successfully finished: "${name}"`);
    } catch (error) {
      console.error(`[BackgroundQueue] Failed task: "${name}". Error:`, error);
    }

    // Schedule next task execution in the next event loop tick
    setImmediate(() => this.processNext());
  }
}

export const backgroundQueue = new BackgroundQueue();
export default backgroundQueue;
