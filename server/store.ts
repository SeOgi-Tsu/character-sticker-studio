import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

/** Private storage. Job snapshots contain provider credentials and never leave this layer. */
export class Store {
  readonly db: DatabaseSync;
  constructor(readonly dataDir: string) {
    mkdirSync(dataDir, {recursive:true, mode:0o700});
    this.db=new DatabaseSync(join(dataDir,'studio.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, PRIMARY KEY(kind,id));');
    try { chmodSync(join(dataDir,'studio.sqlite'),0o600); } catch { /* Windows ACLs are inherited from the private data directory. */ }
  }
  get<T>(kind:string,id:string):T|undefined {const row=this.db.prepare('SELECT json FROM records WHERE kind=? AND id=?').get(kind,id);return row?JSON.parse(String(row.json)):undefined;}
  all<T>(kind:string):T[] {return this.db.prepare('SELECT json FROM records WHERE kind=? ORDER BY rowid').all(kind).map(r=>JSON.parse(String(r.json)));}
  put(kind:string,id:string,value:unknown) {this.db.prepare('INSERT INTO records(kind,id,json) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json').run(kind,id,JSON.stringify(value));}
  transaction<T>(operation:()=>T):T {this.db.exec('BEGIN IMMEDIATE');try{const result=operation();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
  close(){this.db.close();}
}
