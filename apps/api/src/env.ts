export interface DbResult { success: boolean; meta: { changes?: number }; results?: any[] }
export interface DbStatement { bind(...values: unknown[]): DbStatement; first<T = any>(): Promise<T | null>; all<T = any>(): Promise<{ results: T[] }>; run(): Promise<DbResult> }
export interface Database { prepare(sql: string): DbStatement; batch(statements: DbStatement[]): Promise<DbResult[]> }
export interface Env {
  BETA_ACCESS?: string; SUPPORT_EMAIL?: string;
  GITHUB_REQUEST_LIMIT?: string;
  MODE?: string; ENVIRONMENT?: string; AI_MODEL?: string; GOOGLE_GENERATIVE_AI_API_KEY?: string; GITHUB_TOKEN?: string;
  EXTENSION_ID?: string; API_ORIGIN?: string; GITHUB_CLIENT_ID?: string; GITHUB_CLIENT_SECRET?: string;
  TOKEN_ENCRYPTION_KEY?: string; DAILY_LIMIT?: string; MONTHLY_BUDGET_MICRODOLLARS?: string; ACTION_RESERVATION_MICRODOLLARS?: string;
  AI_INPUT_USD_PER_MILLION?: string; AI_OUTPUT_USD_PER_MILLION?: string;
  DB?: Database;
}
