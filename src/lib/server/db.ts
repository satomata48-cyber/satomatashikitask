import Database from 'better-sqlite3';
import type { D1Database, D1PreparedStatement, D1Result } from '@cloudflare/workers-types';
import { dev } from '$app/environment';

// D1互換のラッパークラス
class LocalD1PreparedStatement<T = unknown> implements D1PreparedStatement {
	constructor(
		private stmt: Database.Statement,
		private db: Database.Database
	) {}

	bind(...values: unknown[]): D1PreparedStatement {
		this.stmt = this.stmt.bind(...values); // better-sqlite3 returns a new statement
		return this;
	}

	async first<T = unknown>(colName?: string): Promise<T | null> {
		const result = this.stmt.get() as T | undefined;
		if (!result) return null;
		if (colName && typeof result === 'object' && result !== null) {
			return (result as Record<string, unknown>)[colName] as T;
		}
		return result;
	}

	async run<T = unknown>(): Promise<D1Result<T>> {
		const info = this.stmt.run();
		return {
			success: true,
			meta: {
				duration: 0,
				rows_read: info.changes,
				rows_written: info.changes
			},
			results: [] as T[]
		};
	}

	async all<T = unknown>(): Promise<D1Result<T>> {
		const results = this.stmt.all() as T[];
		return {
			success: true,
			meta: {
				duration: 0,
				rows_read: results.length,
				rows_written: 0
			},
			results
		};
	}

	async raw<T = unknown>(): Promise<T[]> {
		return this.stmt.raw() as T[];
	}
}

class LocalD1Database implements D1Database {
	private db: Database.Database;

	constructor(dbPath: string) {
		this.db = new Database(dbPath);
	}

	prepare(query: string): D1PreparedStatement {
		const stmt = this.db.prepare(query);
		return new LocalD1PreparedStatement(stmt, this.db);
	}

	async dump(): Promise<ArrayBuffer> {
		throw new Error('dump() not implemented for local database');
	}

	async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
		const results: D1Result<T>[] = [];
		for (const stmt of statements) {
			const result = await stmt.run<T>();
			results.push(result);
		}
		return results;
	}

	async exec(query: string): Promise<D1Result> {
		this.db.exec(query);
		return {
			success: true,
			meta: {
				duration: 0,
				rows_read: 0,
				rows_written: 0
			},
			results: []
		};
	}
}

// 開発時はローカルSQLite、本番時はD1を使う
export function getDB(platform?: App.Platform): D1Database {
	if (dev || !platform?.env?.DB) {
		return new LocalD1Database('local.db');
	}
	return platform.env.DB;
}
