// src/routes/roles.js
const express = require('express');
const db = require('../db');
const router = express.Router();

/* GET /api/roles */
router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM roles ORDER BY id');
  res.json(rows);
});

/* POST /api/roles */
router.post('/', async (req, res) => {
  const { name, permissions = {} } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await db.query('INSERT INTO roles (name, permissions) VALUES ($1,$2) RETURNING *', [name, permissions]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') res.status(409).json({ error: 'Role exists' });
    else res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
