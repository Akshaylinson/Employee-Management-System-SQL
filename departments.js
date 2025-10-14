// src/routes/departments.js
const express = require('express');
const db = require('../db');
const router = express.Router();

/* GET /api/departments */
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT d.*, e.first_name || \' \' || e.last_name as manager_name FROM departments d LEFT JOIN employees e ON d.manager_id = e.id ORDER BY d.id');
  res.json(rows);
});

/* POST /api/departments */
router.post('/', async (req, res) => {
  const { name, manager_id = null } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await db.query('INSERT INTO departments (name, manager_id) VALUES ($1,$2) RETURNING *', [name, manager_id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') res.status(409).json({ error: 'Department name exists' });
    else res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
