import mongoose from 'mongoose';

/**
 * One MongoDB connection per server process, cached on `global` so Next's dev
 * hot reload does not open a new pool on every edit.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

function resetConnection() {
  cached.conn = null;
  cached.promise = null;
}

async function dbConnect() {
  if (cached.conn && cached.conn.connection?.readyState === 1) {
    return cached.conn;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable (see .env.example)');
  }

  if (!cached.promise) {
    const opts = {
      // Indexes declared on the models are built on first use. They can also be
      // created up front with `npm run db:indexes`.
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,   // reject quickly if the database is unreachable
      maxPoolSize: 10,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

/**
 * Run a DB operation with a hard timeout and a retry, so a request never hangs
 * on a database that has gone away. Used by the OAuth and connector routes,
 * which an AI assistant calls and would otherwise wait on indefinitely.
 */
export async function withDb(fn, { attempts = 3, timeoutMs = 6000 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    let timer;
    try {
      await dbConnect();
      return await Promise.race([
        Promise.resolve().then(fn),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('db_operation_timeout')), timeoutMs);
        }),
      ]);
    } catch (e) {
      lastErr = e;
      // Start over with a fresh connection only if the current one is down.
      if (mongoose.connection.readyState !== 1) resetConnection();
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export default dbConnect;
