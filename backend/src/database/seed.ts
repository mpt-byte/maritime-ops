import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, getPool } from './db.js';
import { loadConfig } from '../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runFile(path: string): Promise<void> {
  const sql = await readFile(path, 'utf8');
  await query(sql);
  console.log(`✔ applied ${path.split('/').slice(-2).join('/')}`);
}

async function main(): Promise<void> {
  loadConfig();
  const schemaPath = join(__dirname, 'schema.sql');
  const seedPath = join(__dirname, 'seed.sql');
  try {
    await runFile(schemaPath);
    await runFile(seedPath);
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    const pool = getPool();
    await pool.end();
  }
}

void main();
