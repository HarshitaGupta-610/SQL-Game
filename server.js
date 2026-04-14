const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

const db = mysql.createPool({
  host: envValue("DB_HOST", "MYSQLHOST") || "localhost",
  user: envValue("DB_USER", "MYSQLUSER") || "root",
  password: envValue("DB_PASSWORD", "MYSQLPASSWORD") || "CodePaglu18@@",
  database: envValue("DB_NAME", "MYSQLDATABASE") || "detective_game",
  port: Number(envValue("DB_PORT", "MYSQLPORT") || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  multipleStatements: true
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("DB Connection Failed:", err);
    return;
  }

  connection.release();
  console.log("Connected to MySQL ✅");
});

function loadNamedQueries() {
  const queriesPath = path.join(__dirname, "queries.sql");
  const raw = fs.readFileSync(queriesPath, "utf8");
  const blocks = raw.split(/\n\s*--\s*name:\s*/i).slice(1);
  const named = {};

  blocks.forEach((block) => {
    const newlineIdx = block.indexOf("\n");
    const name = block.slice(0, newlineIdx).trim();
    const sql = block.slice(newlineIdx + 1).trim().replace(/;\s*$/, "");
    named[name] = sql;
  });

  return named;
}

const namedQueries = loadNamedQueries();

function runQuery(sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

function normalizeSqlStatements(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => {
      if (!statement) {
        return false;
      }

      const upper = statement.toUpperCase();
      if (upper.startsWith("--") || upper.startsWith("/*")) {
        return false;
      }

      return !upper.startsWith("CREATE DATABASE") && !upper.startsWith("USE ");
    });
}

async function runStatements(sql) {
  const statements = normalizeSqlStatements(sql);

  for (const statement of statements) {
    await runQuery(statement);
  }
}

app.get("/suspects", async (req, res) => {
  try {
    const rows = await runQuery("SELECT * FROM suspects ORDER BY suspect_id");
    res.json(rows);
  } catch (error) {
    console.error("/suspects failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/evidence", async (req, res) => {
  try {
    const rows = await runQuery("SELECT * FROM evidence ORDER BY evidence_id");
    res.json(rows);
  } catch (error) {
    console.error("/evidence failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/witnesses", async (req, res) => {
  try {
    const rows = await runQuery("SELECT * FROM witnesses ORDER BY witness_id");
    res.json(rows);
  } catch (error) {
    console.error("/witnesses failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/solve", async (req, res) => {
  try {
    const rows = await runQuery(namedQueries.game_culprit);
    res.json(rows);
  } catch (error) {
    console.error("/solve failed:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/game/bootstrap", async (req, res) => {
  try {
    const [
      suspects,
      clues,
      culpritRows,
      sceneSuspects,
      redClothing,
      fingerprintMatches,
      witnessScene,
      evidenceMatches
    ] = await Promise.all([
      runQuery(namedQueries.game_suspects),
      runQuery(namedQueries.game_clues),
      runQuery(namedQueries.game_culprit),
      runQuery(namedQueries.game_investigation_scene_suspects),
      runQuery(namedQueries.game_investigation_red_clothing),
      runQuery(namedQueries.game_investigation_fingerprint),
      runQuery(namedQueries.game_investigation_witness_scene),
      runQuery(namedQueries.game_investigation_evidence_match)
    ]);

    res.json({
      suspects,
      clues,
      culpritName: culpritRows?.[0]?.name || "",
      investigation: {
        sceneSuspects,
        redClothing,
        fingerprintMatches,
        witnessScene,
        evidenceMatches
      }
    });
  } catch (error) {
    console.error("/game/bootstrap failed:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST once when you want to recreate tables and seed from files.
app.post("/db/init", async (req, res) => {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    const dataSql = fs.readFileSync(path.join(__dirname, "data.sql"), "utf8");

    await runQuery("SET FOREIGN_KEY_CHECKS=0");
    await runQuery("DROP TABLE IF EXISTS evidence");
    await runQuery("DROP TABLE IF EXISTS witnesses");
    await runQuery("DROP TABLE IF EXISTS locations");
    await runQuery("DROP TABLE IF EXISTS suspects");
    await runQuery("SET FOREIGN_KEY_CHECKS=1");

    await runStatements(schemaSql);
    await runStatements(dataSql);

    res.json({ message: "Database initialized from schema.sql and data.sql" });
  } catch (error) {
    console.error("/db/init failed:", error);
    res.status(500).json({
      error: error.message || error.code || error.sqlMessage || "Database initialization failed"
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} 🚀`);
});