import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import type { Database } from '../../apps/api/src/env';

export function database(): Database {
  const sql = new DatabaseSync(':memory:');
  const migrations = new URL('../../apps/api/migrations/', import.meta.url);
  for (const file of readdirSync(migrations).filter(name => name.endsWith('.sql')).sort()) sql.exec(readFileSync(new URL(file, migrations), 'utf8'));
  const prepare = (query: string): any => {
    let args: any[] = [];
    return { bind(...values: any[]) { args = values; return this; }, async first() { return sql.prepare(query).get(...args) || null; }, async all() { return { results: sql.prepare(query).all(...args) }; }, async run() { const result = sql.prepare(query).run(...args); return { success: true, meta: { changes: Number(result.changes) } }; } };
  };
  return { prepare, async batch(statements) { sql.exec('BEGIN'); try { const results = []; for (const statement of statements) results.push(await statement.run()); sql.exec('COMMIT'); return results; } catch (error) { sql.exec('ROLLBACK'); throw error; } } };
}
