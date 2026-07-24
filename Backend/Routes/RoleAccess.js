const express = require("express");
const router = express.Router();
const db = require("../dataBase/connection");

// Ensure table schema is up to date on server start
const initRoleAccessTable = () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS role_tab_access (
      id INT AUTO_INCREMENT PRIMARY KEY,
      designation VARCHAR(100) NOT NULL,
      employee_id VARCHAR(100) DEFAULT '',
      group_key VARCHAR(50) NOT NULL,
      tab_label VARCHAR(100) NOT NULL,
      path VARCHAR(255) NOT NULL,
      is_allowed TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY desig_emp_path (designation, employee_id, path)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;

  db.pool.query(createTableQuery, (err) => {
    if (err) {
      console.error("❌ Failed to create role_tab_access table:", err.message);
    } else {
      console.log("✓ Table 'role_tab_access' ready");
      // Ensure employee_id column type is VARCHAR(100)
      db.pool.query("ALTER TABLE role_tab_access MODIFY COLUMN employee_id VARCHAR(100) DEFAULT ''", (alterErr) => {
        if (alterErr) {
          console.warn("Notice: Could not modify employee_id column type:", alterErr.message);
        }
      });
    }
  });
};

initRoleAccessTable();

// GET /api/role-access/designations - List all designations from DB
router.get("/designations", (req, res) => {
  const query = "SELECT DISTINCT designation FROM designations WHERE designation IS NOT NULL AND designation != '' ORDER BY designation ASC";
  db.pool.query(query, (err, results) => {
    if (err) {
      console.error("Fetch designations error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch designations" });
    }
    const designations = (results || []).map(r => r.designation).filter(Boolean);
    res.json({ success: true, designations });
  });
});

// GET /api/role-access/permissions - Fetch permissions for a specific designation & optional employee_id
router.get("/permissions", (req, res) => {
  const { designation, employee_id } = req.query;
  if (!designation) {
    return res.status(400).json({ success: false, message: "Designation is required" });
  }

  const searchVal = employee_id && String(employee_id).trim() !== "" ? String(employee_id).trim() : null;

  // Always fetch designation defaults first
  const desigQuery = "SELECT group_key, tab_label, path, is_allowed, sort_order FROM role_tab_access WHERE designation = ? AND (employee_id IS NULL OR employee_id = '' OR employee_id = '0') ORDER BY sort_order ASC, id ASC";

  db.pool.query(desigQuery, [designation], (desigErr, desigResults) => {
    if (desigErr) {
      console.error("Fetch designation permissions error:", desigErr);
      return res.status(500).json({ success: false, message: desigErr.message });
    }

    // Build a map from designation defaults (group_key + tab_label + path + is_allowed)
    const rowMap = new Map(); // path -> full row object
    (desigResults || []).forEach(r => {
      rowMap.set(r.path, { ...r, is_allowed: r.is_allowed === 1 });
    });

    if (!searchVal) {
      // No employee selected — return designation defaults as-is
      const raw = Array.from(rowMap.values());
      const permissionsMap = {};
      raw.forEach(r => { permissionsMap[r.path] = r.is_allowed; });
      return res.json({ success: true, designation, employee_id: null, permissions: permissionsMap, raw });
    }

    // Employee selected — overlay employee-specific rows on top of designation defaults
    const empQuery = `
      SELECT group_key, tab_label, path, is_allowed, sort_order, employee_id 
      FROM role_tab_access 
      WHERE designation = ? AND (
        employee_id = ? 
        OR FIND_IN_SET(?, employee_id) > 0 
        OR employee_id LIKE CONCAT('%,', ?, ',%') 
        OR employee_id LIKE CONCAT(?, ',%') 
        OR employee_id LIKE CONCAT('%,', ?)
      ) 
      ORDER BY sort_order ASC, id ASC
    `;

    db.pool.query(empQuery, [designation, searchVal, searchVal, searchVal, searchVal, searchVal], (empErr, empResults) => {
      if (empErr) {
        console.error("Fetch employee permissions error:", empErr);
        return res.status(500).json({ success: false, message: empErr.message });
      }

      // Overlay employee-specific rows.
      // IMPORTANT: For individual employee rows, access is determined by whether
      // the employee's ID appears in the employee_id column — NOT by is_allowed.
      // (is_allowed reflects the designation-level default, not individual grants)
      (empResults || []).forEach(r => {
        const empIds = (r.employee_id || "").split(",").map(s => s.trim()).filter(Boolean);
        const hasIndividualAccess = empIds.includes(searchVal);
        rowMap.set(r.path, { ...r, is_allowed: hasIndividualAccess });
      });

      const raw = Array.from(rowMap.values());
      const permissionsMap = {};
      raw.forEach(r => { permissionsMap[r.path] = r.is_allowed; });

      return res.json({ success: true, designation, employee_id: searchVal, permissions: permissionsMap, raw });
    });
  });
});

// POST /api/role-access/permissions - Save / update permissions for a designation or specific employee
router.post("/permissions", (req, res) => {
  const { designation, employee_id, permissions } = req.body;
  if (!designation || !Array.isArray(permissions)) {
    return res.status(400).json({ success: false, message: "Designation and permissions array are required" });
  }

  if (permissions.length === 0) {
    return res.json({ success: true, message: "No permissions updated" });
  }

  const empIdVal = employee_id && String(employee_id).trim() !== "" ? String(employee_id).trim() : "";

  if (!empIdVal) {
    // 1. Designation Level Save: delete designation default rows and insert fresh
    db.pool.query("DELETE FROM role_tab_access WHERE designation = ? AND (employee_id IS NULL OR employee_id = '' OR employee_id = '0')", [designation], (delErr) => {
      if (delErr) return res.status(500).json({ success: false, message: delErr.message });

      const values = permissions.map((p, idx) => [
        designation,
        "",
        p.group_key || "general",
        p.tab_label || "",
        p.path,
        p.is_allowed ? 1 : 0,
        typeof p.sort_order === "number" ? p.sort_order : idx
      ]);

      db.pool.query("INSERT INTO role_tab_access (designation, employee_id, group_key, tab_label, path, is_allowed, sort_order) VALUES ?", [values], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        return res.json({ success: true, message: `Permissions updated for designation '${designation}'` });
      });
    });
  } else {
    // 2. Employee Level Save: update employee_id column on rows that already have this employee, or add for new grants
    let completed = 0;

    // Helper: after all updates done, fetch fresh merged permissions and return them
    const finishAndRespond = () => {
      completed++;
      if (completed < permissions.length) return;

      // Fetch fresh merged permissions for this employee to return in response
      const desigQ = "SELECT path, is_allowed, sort_order, employee_id FROM role_tab_access WHERE designation = ? AND (employee_id IS NULL OR employee_id = '' OR employee_id = '0') ORDER BY sort_order ASC, id ASC";
      db.pool.query(desigQ, [designation], (dErr, dRows) => {
        const pMap = new Map();
        (dRows || []).forEach(r => pMap.set(r.path, r.is_allowed === 1));

        const empQ = `SELECT path, is_allowed, sort_order, employee_id FROM role_tab_access WHERE designation = ? AND (employee_id = ? OR FIND_IN_SET(?, employee_id) > 0 OR employee_id LIKE CONCAT('%,', ?, ',%') OR employee_id LIKE CONCAT(?, ',%') OR employee_id LIKE CONCAT('%,', ?)) ORDER BY sort_order ASC, id ASC`;
        db.pool.query(empQ, [designation, empIdVal, empIdVal, empIdVal, empIdVal, empIdVal], (eErr, eRows) => {
          (eRows || []).forEach(r => {
            const ids = (r.employee_id || "").split(",").map(s => s.trim()).filter(Boolean);
            pMap.set(r.path, ids.includes(empIdVal));
          });

          const updatedPermissions = {};
          pMap.forEach((allowed, path) => { updatedPermissions[path] = allowed; });

          return res.json({
            success: true,
            message: `Permissions updated for employee '${empIdVal}'`,
            designation,
            employee_id: empIdVal,
            updatedPermissions
          });
        });
      });
    };

    permissions.forEach((p, idx) => {
      // Find row for this designation & path that already contains this employee OR is a designation default
      db.pool.query("SELECT id, employee_id, is_allowed FROM role_tab_access WHERE designation = ? AND path = ? LIMIT 1", [designation, p.path], (selErr, rows) => {
        if (!selErr && rows && rows.length > 0) {
          const row = rows[0];
          let currentEmpIds = (row.employee_id || "").split(",").map(s => s.trim()).filter(Boolean);
          const isDesigDefaultRow = currentEmpIds.length === 0; // employee_id is empty = designation default row

          if (p.is_allowed) {
            // Grant: add employee to the row's employee_id
            if (!currentEmpIds.includes(empIdVal)) currentEmpIds.push(empIdVal);
            const newEmpIdStr = currentEmpIds.join(",");
            // IMPORTANT: Never modify is_allowed — it belongs to designation-level only
            db.pool.query("UPDATE role_tab_access SET employee_id = ? WHERE id = ?", [newEmpIdStr, row.id], finishAndRespond);
          } else {
            // Revoke: only remove employee if they were actually individually added to this row
            if (isDesigDefaultRow) {
              // This is a designation default row — employee was never individually added, nothing to remove
              return finishAndRespond();
            }
            currentEmpIds = currentEmpIds.filter(id => id !== empIdVal);
            const newEmpIdStr = currentEmpIds.join(",");
            db.pool.query("UPDATE role_tab_access SET employee_id = ? WHERE id = ?", [newEmpIdStr, row.id], finishAndRespond);
          }
        } else {
          // No row exists for this path — only insert if granting access
          if (p.is_allowed) {
            const newRow = [designation, empIdVal, p.group_key || "general", p.tab_label || "", p.path, 1, typeof p.sort_order === "number" ? p.sort_order : idx];
            db.pool.query("INSERT INTO role_tab_access (designation, employee_id, group_key, tab_label, path, is_allowed, sort_order) VALUES (?)", [newRow], finishAndRespond);
          } else {
            finishAndRespond();
          }
        }
      });
    });
  }
});

// GET /api/role-access/my-permissions - Get allowed tabs for logged in user
router.get("/my-permissions", (req, res) => {
  const designation = req.query.designation || req.headers["x-user-designation"] || "";
  const employee_id = req.query.employee_id || req.headers["x-user-id"] || null;
  const searchVal = employee_id && String(employee_id).trim() !== "" ? String(employee_id).trim() : null;

  if (!designation && !searchVal) {
    return res.json({ success: true, designation: "", allowedPaths: null });
  }

  // Fetch ALL rows for this designation (including those with individual employee_id grants)
  // We use is_allowed as the designation-level base, then overlay employee-specific access
  const allRowsQuery = "SELECT path, is_allowed, sort_order, employee_id FROM role_tab_access WHERE designation = ? ORDER BY sort_order ASC, id ASC";

  db.pool.query(allRowsQuery, [designation], (err, rows) => {
    if (err) {
      console.error("my-permissions error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    const permMap = new Map();

    (rows || []).forEach(r => {
      const rowEmpIds = (r.employee_id || "").split(",").map(s => s.trim()).filter(Boolean);
      const isDesigDefaultRow = rowEmpIds.length === 0; // employee_id = '' → designation default

      let isAllowed;
      if (isDesigDefaultRow) {
        // Designation default row: use is_allowed column as the base
        isAllowed = r.is_allowed === 1;
      } else {
        // Individual-grant row: base is 'restricted for designation' (is_allowed=0 means not for everyone)
        // But if a specific employee is queried AND their ID is in employee_id → they have access
        if (searchVal && rowEmpIds.includes(searchVal)) {
          isAllowed = true; // individual grant for this employee
        } else {
          // No employee queried or employee not in this row → designation-level base (is_allowed)
          isAllowed = r.is_allowed === 1;
        }
      }

      // Keep the most permissive value if path appears in multiple rows
      if (!permMap.has(r.path) || isAllowed) {
        permMap.set(r.path, isAllowed);
      }
    });

    const allowedPaths = [];
    const restrictedPaths = [];
    permMap.forEach((isAllowed, path) => {
      if (isAllowed) allowedPaths.push(path);
      else restrictedPaths.push(path);
    });

    return res.json({
      success: true,
      designation,
      employee_id: searchVal,
      allowedPaths,
      restrictedPaths
    });
  });
});

module.exports = router;
