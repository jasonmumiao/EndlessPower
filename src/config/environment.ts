export const ENV_CONFIG = {
  isDevelopment:
    import.meta.env.DEV ||
    import.meta.env.MODE === 'development' ||
    (typeof window !== 'undefined' &&
      (window.location.hostname.includes('-dev') ||
        window.location.hostname.includes('localhost') ||
        window.location.hostname.includes('127.0.0.1'))),

  apiConfig: {
    enableDebugLogs:
      import.meta.env.DEV ||
      (typeof window !== 'undefined' && window.location.hostname.includes('-dev')),
    corsRetryAttempts: 5
  },

  pwaConfig: {
    enableDebugPanel:
      import.meta.env.DEV ||
      (typeof window !== 'undefined' && window.location.hostname.includes('-dev')),
    serviceWorkerUpdateInterval: 60_000
  }
}

export const IS_DEV = ENV_CONFIG.isDevelopment
export const ENABLE_DEBUG = ENV_CONFIG.apiConfig.enableDebugLogs
