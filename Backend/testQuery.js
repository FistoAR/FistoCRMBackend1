const { queryWithRetry } = require("./dataBase/connection");

async function debug() {
  const mf = await queryWithRetry("SELECT * FROM ManagementFollowups");
  console.log("=== ManagementFollowups ===");
  console.log(JSON.stringify(mf, null, 2));

  const cdm = await queryWithRetry("SELECT id, company_name, active FROM ClientsDataManagement");
  console.log("=== ClientsDataManagement ===");
  console.log(JSON.stringify(cdm, null, 2));

  const employee_id = "FSTMD001";
  const dbStatuses = ["Followup Taken", "Not picking/busy/others", "Lead"];
  const statusPlaceholders = dbStatuses.map(() => "?").join(",");

  const latestStatusQuery = `
    SELECT 
      f.*,
      c.id as clientID,
      c.company_name
    FROM (
      SELECT MAX(id) AS max_id
      FROM ManagementFollowups
      ${employee_id ? "WHERE employee_id = ?" : ""}
      GROUP BY clientID, COALESCE(projectId, 0)
    ) latest
    JOIN ManagementFollowups f ON f.id = latest.max_id
    LEFT JOIN ClientsDataManagement c ON f.clientID = c.id
    WHERE f.status IN (${statusPlaceholders})
  `;

  const params = [];
  if (employee_id) params.push(employee_id);
  params.push(...dbStatuses);

  console.log("=== Query Params ===", params);
  const rows = await queryWithRetry(latestStatusQuery, params);
  console.log("=== Output Rows ===", JSON.stringify(rows, null, 2));

  process.exit(0);
}

debug().catch(err => {
  console.error(err);
  process.exit(1);
});
