import { createWebTorrentClient } from "../config/webTorrent.js";

// Client recovery tracking
let clientRestartCount = 0;
const MAX_CLIENT_RESTARTS = 3;
const CLIENT_RESTART_COOLDOWN = 60000; // 1 minute
let lastRestartTime = 0;

/**
 * Classify WebTorrent client errors for recovery decisions
 * @param {Error} error - The client error
 * @returns {string} Error classification
 */
export const classifyClientError = (error) => {
  const message = error.message.toLowerCase();
  
  // Recoverable network/connection errors
  if (message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('socket') ||
      message.includes('peer')) {
    return 'RECOVERABLE';
  }
  
  // Configuration or permanent errors
  if (message.includes('invalid') ||
      message.includes('malformed') ||
      message.includes('permission') ||
      message.includes('access denied')) {
    return 'PERMANENT';
  }
  
  return 'UNKNOWN'; // Default to recoverable for unknown errors
};

/**
 * Attempt to restart the WebTorrent client
 * @param {Object} app - Express app instance
 * @returns {Promise<boolean>} Success status
 */
export const restartWebTorrentClient = async (app) => {
  try {
    console.log('🔄 Attempting WebTorrent client restart...');
    
    // Destroy existing client
    const oldClient = app.locals.webTorrentClient;
    if (oldClient) {
      oldClient.removeAllListeners();
      oldClient.destroy();
    }
    
    // Create new client with a delay to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newClient = createWebTorrentClient();
    app.locals.webTorrentClient = newClient;
    
    // Re-attach error handlers
    attachClientErrorHandlers(newClient, app);
    
    console.log('✅ WebTorrent client restarted successfully');
    return true;
  } catch (restartError) {
    console.error('❌ Failed to restart WebTorrent client:', restartError);
    return false;
  }
};

/**
 * Attach error handlers to WebTorrent client
 * @param {Object} client - WebTorrent client instance
 * @param {Object} app - Express app instance
 */
export const attachClientErrorHandlers = (client, app) => {
  client.on("error", async (err) => {
    console.error("WebTorrent client error:", err);
    
    const errorType = classifyClientError(err);
    const now = Date.now();
    
    // Don't attempt recovery for permanent errors
    if (errorType === 'PERMANENT') {
      console.error('❌ Permanent WebTorrent client error - manual intervention required');
      return;
    }
    
    // Check cooldown period to prevent rapid restart attempts
    if (now - lastRestartTime < CLIENT_RESTART_COOLDOWN) {
      console.log('⏳ WebTorrent client restart on cooldown, skipping recovery attempt');
      return;
    }
    
    // Attempt client recovery for recoverable errors
    if (errorType === 'RECOVERABLE' || errorType === 'UNKNOWN') {
      if (clientRestartCount < MAX_CLIENT_RESTARTS) {
        console.log(`🔄 Attempting WebTorrent client recovery (${clientRestartCount + 1}/${MAX_CLIENT_RESTARTS})`);
        clientRestartCount++;
        lastRestartTime = now;
        
        const restartSuccess = await restartWebTorrentClient(app);
        if (restartSuccess) {
          // Reset counter on successful restart
          clientRestartCount = 0;
          console.log('✅ WebTorrent client recovered successfully');
        } else {
          console.error('❌ WebTorrent client recovery failed');
        }
      } else {
        console.error('❌ Max client restart attempts reached, manual intervention required');
        console.error('💡 Consider restarting the server to restore WebTorrent functionality');
      }
    }
  });
  
  client.on("ready", () => {
    console.log('✅ WebTorrent client is ready');
    // Reset restart count on successful ready state
    clientRestartCount = 0;
  });
};

/**
 * Initialize WebTorrent client with error handlers
 * @param {Object} app - Express app instance
 * @returns {Object} WebTorrent client instance
 */
export const initializeClientManager = (app) => {
  console.log('🔧 Initializing WebTorrent client manager...');
  
  // Create WebTorrent client
  const client = createWebTorrentClient();
  
  // Store client in app locals for access in controllers
  app.locals.webTorrentClient = client;
  
  // Attach error handlers with recovery logic
  attachClientErrorHandlers(client, app);
  
  console.log('✅ WebTorrent client manager initialized');
  return client;
};

/**
 * Gracefully shutdown WebTorrent client
 * @param {Object} client - WebTorrent client instance
 * @returns {Promise<void>}
 */
export const gracefulClientShutdown = (client) => {
  return new Promise((resolve) => {
    console.log('🔄 Shutting down WebTorrent client...');
    
    if (client) {
      client.destroy(() => {
        console.log('✅ WebTorrent client destroyed');
        resolve();
      });
    } else {
      console.log('⚠️ No WebTorrent client to destroy');
      resolve();
    }
  });
};

/**
 * Get client recovery statistics
 * @returns {Object} Recovery stats
 */
export const getClientStats = () => {
  return {
    restartCount: clientRestartCount,
    maxRestarts: MAX_CLIENT_RESTARTS,
    cooldownPeriod: CLIENT_RESTART_COOLDOWN,
    lastRestartTime: lastRestartTime,
    cooldownRemaining: Math.max(0, CLIENT_RESTART_COOLDOWN - (Date.now() - lastRestartTime))
  };
};