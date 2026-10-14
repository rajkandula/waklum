/**
 * Creates every index declared on the Mongoose models.
 *
 * The server also builds them on first use (Mongoose autoIndex), but on a large
 * collection that happens in the middle of live traffic. Run this before a
 * deploy that adds or changes a `Schema.index(...)` call to build them first:
 *
 *   npm run db:indexes
 *
 * It is idempotent: existing indexes are left alone.
 */
import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function readEnv(key) {
  if (process.env[key]) return process.env[key];
  for (const file of ['.env.local', '.env']) {
    if (!fs.existsSync(file)) continue;
    const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith(`${key}=`));
    if (line) return line.slice(key.length + 1).trim();
  }
  return null;
}

const uri = readEnv('MONGODB_URI');
if (!uri) {
  console.error('MONGODB_URI is not set (looked in the environment, .env.local and .env)');
  process.exit(1);
}

await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, autoIndex: false });
console.log(`connected to ${mongoose.connection.name}\n`);

// Importing a model file registers its schema and its index declarations.
const dir = path.resolve('src/models');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  await import(pathToFileURL(path.join(dir, file)).href);
}

let created = 0;
for (const name of Object.keys(mongoose.models).sort()) {
  const model = mongoose.models[name];
  const declared = model.schema.indexes();
  if (!declared.length) continue;

  const before = new Set((await model.collection.indexes().catch(() => [])).map((i) => i.name));
  await model.createIndexes();                       // idempotent
  const after = await model.collection.indexes();

  for (const idx of after) {
    if (idx.name !== '_id_' && !before.has(idx.name)) {
      console.log(`  + ${name.padEnd(18)} ${idx.name}`);
      created++;
    }
  }
}

console.log(created ? `\ncreated ${created} index(es)` : '\nall declared indexes already existed');
await mongoose.disconnect();
