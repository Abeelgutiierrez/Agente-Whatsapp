import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { State } from "@/domain/types";
import { createSeed } from "@/domain/seed";
const tables = [
  "business",
  "meta",
  "services",
  "professionals",
  "assignments",
  "schedules",
  "blocks",
  "clients",
  "bookings",
  "events",
  "messages",
  "operations",
] as const;
const bools = new Set(["active", "privacyConsent", "communicationConsent"]);
type Row = Record<string, string | number | boolean | null>;
export class Store {
  db: Database.Database;
  constructor(filename: string) {
    if (filename !== ":memory:")
      fs.mkdirSync(path.dirname(filename), { recursive: true });
    this.db = new Database(filename);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db.pragma("busy_timeout = 5000");
    this.db.exec(
      fs.readFileSync(
        path.join(process.cwd(), "src/server/migrations/001_initial.sql"),
        "utf8",
      ),
    );
    if (
      !(
        this.db.prepare("SELECT COUNT(*) AS n FROM business").get() as {
          n: number;
        }
      ).n
    )
      this.reset();
  }
  read(): State {
    const result: Record<string, unknown> = {};
    for (const table of tables) {
      const rows = (
        this.db.prepare(`SELECT * FROM ${table}`).all() as Row[]
      ).map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            bools.has(key) ? Boolean(value) : value,
          ]),
        ),
      );
      result[table] = table === "business" || table === "meta" ? rows[0] : rows;
    }
    return result as unknown as State;
  }
  private persist(state: State, previous?: State) {
    const rows = (
      s: State | undefined,
      table: (typeof tables)[number],
    ): Row[] =>
      s
        ? ((table === "business" || table === "meta"
            ? [s[table]]
            : s[table]) as unknown as Row[])
        : [];
    for (const table of [...tables].reverse()) {
      const ids = new Set(rows(state, table).map((r) => r.id));
      const remove = this.db.prepare(`DELETE FROM ${table} WHERE id = ?`);
      for (const row of rows(previous, table))
        if (!ids.has(row.id)) remove.run(row.id as string);
    }
    for (const table of tables) {
      const before = new Map(
        rows(previous, table).map((r) => [r.id, JSON.stringify(r)]),
      );
      const data = rows(state, table);
      if (!data.length) continue;
      const keys = Object.keys(data[0]);
      const stmt = this.db.prepare(
        `INSERT INTO ${table} (${keys.map((k) => `"${k}"`).join(",")}) VALUES (${keys.map((k) => `@${k}`).join(",")}) ON CONFLICT(id) DO UPDATE SET ${keys
          .filter((k) => k !== "id")
          .map((k) => `"${k}"=excluded."${k}"`)
          .join(",")}`,
      );
      for (const row of data)
        if (before.get(row.id) !== JSON.stringify(row))
          stmt.run(
            Object.fromEntries(
              Object.entries(row).map(([k, v]) => [
                k,
                typeof v === "boolean" ? Number(v) : v,
              ]),
            ),
          );
    }
  }
  mutate<T>(action: (state: State) => T): T {
    return this.db
      .transaction(() => {
        const state = this.read();
        const previous = structuredClone(state);
        const result = action(state);
        state.meta.revision++;
        this.persist(state, previous);
        return result;
      })
      .immediate();
  }
  reset(reference?: Date) {
    return this.db
      .transaction(() => {
        const revision =
          (
            this.db.prepare("SELECT revision FROM meta LIMIT 1").get() as
              { revision: number } | undefined
          )?.revision || 0;
        for (const table of [...tables].reverse())
          this.db.prepare(`DELETE FROM ${table}`).run();
        const seed = createSeed(reference);
        seed.meta.revision = revision + 1;
        this.persist(seed);
        return seed;
      })
      .immediate();
  }
  close() {
    this.db.close();
  }
}
const globalDb = globalThis as unknown as { armoniaStore?: Store };
export function getStore() {
  return (globalDb.armoniaStore ??= new Store(
    process.env.DEMO_DB_PATH || path.join(process.cwd(), "data", "armonia.db"),
  ));
}
