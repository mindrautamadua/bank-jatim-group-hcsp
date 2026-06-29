// Shared auth constants with no server/db dependencies, so modules like
// tenant.ts can read the session cookie name without importing auth.ts
// (which imports db.ts and would create a cycle).
export const SESSION_COOKIE = 'hcsp_session'
