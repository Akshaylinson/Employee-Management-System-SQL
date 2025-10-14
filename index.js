// src/index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const employeesRouter = require('./routes/employees');
const departmentsRouter = require('./routes/departments');
const rolesRouter = require('./routes/roles');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/employees', employeesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/roles', rolesRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
