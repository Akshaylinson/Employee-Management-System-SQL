// src/routes/employees.js
const express = require('express');
const db = require('../db'); // db.query and db.pool
const router = express.Router();

/**
 * Helper: Ensure a department exists by name.
 * Returns id or null if name is falsy.
 * Uses the provided client (inside a transaction).
 */
async function ensureDepartment(client, name) {
  if (!name) return null;
  // Trim and normalize
  const nm = name.trim();
  if (!nm) return null;

  const found = await client.query('SELECT id FROM departments WHERE name = $1', [nm]);
  if (found.rows.length) return found.rows[0].id;

  const inserted = await client.query('INSERT INTO departments (name) VALUES ($1) RETURNING id', [nm]);
  return inserted.rows[0].id;
}

/**
 * Helper: Ensure a role exists by name.
 */
async function ensureRole(client, name) {
  if (!name) return null;
  const nm = name.trim();
  if (!nm) return null;

  const found = await client.query('SELECT id FROM roles WHERE name = $1', [nm]);
  if (found.rows.length) return found.rows[0].id;

  const inserted = await client.query('INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING id', [nm, {}]);
  return inserted.rows[0].id;
}

/* GET /api/employees?limit=&offset=&department=&role=&active= */
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, department, role, active } = req.query;
    let where = [];
    let params = [];

    if (department) { params.push(department); where.push(`employees.department_id = $${params.length}`); }
    if (role) { params.push(role); where.push(`employees.role_id = $${params.length}`); }
    if (active !== undefined) { params.push(active === 'true'); where.push(`employees.is_active = $${params.length}`); }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit, offset);
    const q = `
      SELECT employees.*, departments.name as department_name, roles.name as role_name
      FROM employees
      LEFT JOIN departments ON departments.id = employees.department_id
      LEFT JOIN roles ON roles.id = employees.role_id
      ${whereClause}
      ORDER BY employees.id
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET /api/employees/:id */
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT employees.*, departments.name as department_name, roles.name as role_name
       FROM employees
       LEFT JOIN departments ON departments.id = employees.department_id
       LEFT JOIN roles ON roles.id = employees.role_id
       WHERE employees.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* POST /api/employees
   Accepts employee fields plus optional department_name and role_name.
   Creates department/role rows if needed.
*/
router.post('/', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      first_name, last_name, email, phone, hire_date,
      salary = 0.00, is_active = true, department_name = null, role_name = null
    } = req.body;

    if (!first_name || !last_name || !email || !hire_date) {
      client.release();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    // Ensure department and role exist (create if needed)
    const department_id = await ensureDepartment(client, department_name);
    const role_id = await ensureRole(client, role_name);

    const insertQ = `INSERT INTO employees
      (first_name, last_name, email, phone, hire_date, department_id, role_id, salary, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
    const params = [first_name, last_name, email, phone, hire_date, department_id, role_id, salary, is_active];

    const { rows } = await client.query(insertQ, params);

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST /api/employees error', err);
    if (err.code === '23505') { // unique_violation
      res.status(409).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  } finally {
    client.release();
  }
});

/* PUT /api/employees/:id
   Partial update allowed. Accepts department_name & role_name as text (same behavior).
*/
router.put('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    // We will support both direct id updates and name-based lookups
    const allowed = ['first_name','last_name','email','phone','hire_date','salary','is_active'];
    const body = req.body;

    await client.query('BEGIN');

    // If department_name or role_name provided, ensure and get ids
    let deptId = null;
    let roleId = null;
    if ('department_name' in body) {
      deptId = await ensureDepartment(client, body.department_name);
    }
    if ('role_name' in body) {
      roleId = await ensureRole(client, body.role_name);
    }

    // Build dynamic SET
    const fields = [];
    const params = [];
    allowed.forEach((k) => {
      if (k in body) {
        params.push(body[k]);
        fields.push(`${k} = $${params.length}`);
      }
    });

    // Include deptId and roleId if set
    if (deptId !== null) { params.push(deptId); fields.push(`department_id = $${params.length}`); }
    if (roleId !== null) { params.push(roleId); fields.push(`role_id = $${params.length}`); }

    if (!fields.length) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);
    const q = `UPDATE employees SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`;
    const { rows } = await client.query(q, params);
    if (!rows[0]) {
      await client.query('ROLLBACK');
      client.release();
      return res.status(404).json({ error: 'Employee not found' });
    }

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('PUT /api/employees error', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/* DELETE /api/employees/:id  (soft delete) */
router.delete('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`UPDATE employees SET is_active = FALSE WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
    res.json({ message: 'Employee deactivated', employee: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
