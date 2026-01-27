import "dotenv/config";
import { db } from "./config/database.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function removeInlineComments(line: string): string {
  // Remove inline comments (-- comment) but be careful with strings
  // Simple approach: remove everything after -- if not inside quotes
  const commentIndex = line.indexOf("--");
  if (commentIndex === -1) return line;

  // Check if the -- is inside a string (simple check)
  const beforeComment = line.substring(0, commentIndex);
  const singleQuotes = (beforeComment.match(/'/g) || []).length;

  // If odd number of single quotes, we're inside a string
  if (singleQuotes % 2 === 1) return line;

  return beforeComment;
}

async function initDatabase() {
  console.log("🔧 Initializing database...\n");

  try {
    // Read the schema file
    const schemaPath = join(__dirname, "db", "schema.sql");
    const schemaContent = readFileSync(schemaPath, "utf-8");

    // Parse SQL statements line by line
    const lines = schemaContent.split("\n");
    let currentStatement = "";
    const statements: string[] = [];

    for (const line of lines) {
      // Remove inline comments first
      const cleanedLine = removeInlineComments(line);
      const trimmedLine = cleanedLine.trim();

      // Skip empty lines and full-line comments
      if (trimmedLine === "") {
        continue;
      }

      // Add line to current statement
      currentStatement += " " + cleanedLine;

      // If line ends with semicolon, statement is complete
      if (trimmedLine.endsWith(";")) {
        const stmt = currentStatement.trim();
        if (stmt.length > 1) {
          // Remove trailing semicolon for execution
          statements.push(stmt.slice(0, -1));
        }
        currentStatement = "";
      }
    }

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (const statement of statements) {
      // Get first meaningful part for logging
      const preview = statement.replace(/\s+/g, " ").substring(0, 60);
      console.log(`  → ${preview}...`);

      await db.execute(statement);
    }

    console.log("\n✅ Database initialized successfully!");

    // Verify tables were created
    const tables = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    );
    console.log("\n📋 Tables created:");
    for (const row of tables.rows) {
      console.log(`  - ${row.name}`);
    }

    // Count indexes
    const indexes = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'",
    );
    console.log(`\n📊 Indexes created: ${indexes.rows.length}`);
  } catch (error) {
    console.error("\n❌ Error initializing database:", error);
    process.exit(1);
  }

  process.exit(0);
}

initDatabase();
