/**
 * Sample inbox and price data exist to make the development build explorable.
 * Production stays local-first until a configured provider is available.
 */
export const showSampleData = import.meta.env.DEV || import.meta.env.VITE_WARDROBE_DEMO === 'true'
