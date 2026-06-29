import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getPool } from "../src/lib/dsql";
import { dynamo } from "../src/lib/dynamo";

const DISPLAY_LIMIT = 20;
const DSQL_TABLES = ["events", "seats", "orders", "ledger"] as const;

async function showDsqlData() {
  const pool = getPool();

  console.log("\nAurora DSQL");
  for (const table of DSQL_TABLES) {
    const countResult = await pool.query(`SELECT COUNT(*) AS count FROM ${table}`);
    const rowsResult = await pool.query(
      `SELECT * FROM ${table} LIMIT ${DISPLAY_LIMIT}`
    );

    console.log(`\n${table} (${countResult.rows[0].count} rows)`);
    if (rowsResult.rows.length === 0) {
      console.log("No rows");
    } else {
      console.table(rowsResult.rows);
    }
  }
}

async function showDynamoData() {
  const tableName =
    process.env.DYNAMODB_TABLE_NAME ?? "encore-seat-holds ";
  const result = await dynamo.send(
    new ScanCommand({
      TableName: tableName,
      Limit: DISPLAY_LIMIT,
    })
  );

  console.log(`\nDynamoDB: ${tableName}`);
  console.log(
    `Showing ${result.Items?.length ?? 0} row(s)` +
      (result.LastEvaluatedKey ? ` (limited to ${DISPLAY_LIMIT})` : "")
  );
  if (!result.Items?.length) {
    console.log("No rows");
  } else {
    console.table(result.Items);
  }
}

async function main() {
  const pool = getPool();
  try {
    await showDsqlData();
    await showDynamoData();
  } finally {
    await pool.end();
    dynamo.destroy();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("Failed to read table data:", message);
  process.exit(1);
});
