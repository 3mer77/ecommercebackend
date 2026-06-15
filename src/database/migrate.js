/**
 * MIGRATION RUNNER
 * 
 * Purpose: Runs all SQL migration files in order
 * 
 * How it works:
 * 1. Reads all .sql files from migrations folder
 * 2. Sorts them by number (001, 002, 003...)
 * 3. Runs each one in order
 * 4. Tracks which migrations have been run
 * 5. Only runs NEW migrations (idempotent)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function runMigrations() {
    console.log('🔄 Starting database migrations...\n');

    try {
        // Create migrations tracking table (if not exists)
        // This table remembers which migrations have already run
        await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

        // Get all migration files
        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sort alphabetically (001, 002, 003...)

        console.log(`📁 Found ${files.length} migration files`);

        // Get already executed migrations
        const { rows: executed } = await db.query('SELECT name FROM migrations');
        const executedNames = executed.map(row => row.name);

        // Run each new migration
        let runCount = 0;

        for (const file of files) {
            if (executedNames.includes(file)) {
                console.log(`⏭️  Skipping ${file} (already executed)`);
                continue;
            }

            console.log(`▶️  Running ${file}...`);

            // Read SQL file
            const sql = fs.readFileSync(
                path.join(migrationsDir, file),
                'utf8'
            );

            try {
                // Execute migration in a transaction
                // If anything fails, everything rolls back
                await db.transaction(async (client) => {
                    await client.query(sql);
                });

                // Record that migration was executed
                await db.query(
                    'INSERT INTO migrations (name) VALUES ($1)',
                    [file]
                );

                console.log(`✅ ${file} executed successfully`);
                runCount++;

            } catch (error) {
                console.error(`❌ Failed to run ${file}:`, error.message);
                process.exit(1);
            }
        }

        if (runCount === 0) {
            console.log('\n✅ Database is up to date. No new migrations to run.');
        } else {
            console.log(`\n✅ Successfully ran ${runCount} migration(s)`);
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

// Run migrations
runMigrations();