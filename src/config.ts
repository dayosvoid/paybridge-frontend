/** Build-time settings, from .env.local (see .env.example). */
export const USE_MOCK: boolean = import.meta.env.VITE_USE_MOCK === 'true'

/** Where API calls go. In development Vite forwards /api to the Spring backend. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'
