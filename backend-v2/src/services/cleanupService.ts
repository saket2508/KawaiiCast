let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const startCleanupTimer = () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
  // Placeholder: will run combined cleanup once ported
  cleanupTimer = setInterval(() => {}, 5 * 60 * 1000);
  console.log('Started cleanup timer (v2 stub)');
};

export const stopCleanupTimer = () => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    console.log('Stopped cleanup timer (v2 stub)');
  }
};

export const isCleanupTimerRunning = () => cleanupTimer !== null;

