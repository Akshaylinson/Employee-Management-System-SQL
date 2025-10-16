// public/app.js
const api = '/api/employees';

document.addEventListener('DOMContentLoaded', () => {
  const log = (...args) => { if (window.console) console.log('[app.js]', ...args); };

  const tbody = document.querySelector('#employeesTable tbody');
  const searchInput = document.getElementById('searchInput');
  const addBtn = document.getElementById('addBtn');
  const modalEl = document.getElementById('employeeModal');
  const form = document.getElementById('employeeForm');

  let bsModal = null;
  try { if (modalEl && typeof bootstrap !== 'undefined') bsModal = new bootstrap.Modal(modalEl); } catch (e) { log('modal create error', e); }

  async function fetchEmployees() {
    try {
      const res = await fetch(api);
      if (!res.ok) { log('fetch failed', res.status); return; }
      const rows = await res.json();
      const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
      const filtered = rows.filter(r => {
        if (!q) return true;
        const s = `${r.first_name} ${r.last_name} ${r.email}`.toLowerCase();
        return s.includes(q);
      });
      tbody.innerHTML = filtered.map(r => `
        <tr>
          <td>${r.id}</td>
          <td>${(r.first_name || '') + ' ' + (r.last_name || '')}</td>
          <td>${r.email || ''}</td>
          <td>${r.department_name || ''}</td>
          <td>${r.role_name || ''}</td>
          <td>${r.salary != null ? parseFloat(r.salary).toFixed(2) : ''}</td>
          <td>${r.is_active ? 'Yes' : 'No'}</td>
          <td>
            <button class="btn btn-sm btn-secondary" data-id="${r.id}" data-action="edit">Edit</button>
            <button class="btn btn-sm btn-danger" data-id="${r.id}" data-action="delete">Deactivate</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      log('fetchEmployees error', err);
    }
  }

  if (searchInput) searchInput.addEventListener('input', fetchEmployees);

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      if (form) form.reset();
      const empId = document.getElementById('empId');
      if (empId) empId.value = '';
      if (bsModal) bsModal.show();
    });
  }

  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.action === 'edit') {
        try {
          const res = await fetch(`${api}/${id}`);
          if (!res.ok) { log('GET employee failed', res.status); return; }
          const emp = await res.json();
          document.getElementById('empId').value = emp.id;
          document.getElementById('first_name').value = emp.first_name || '';
          document.getElementById('last_name').value = emp.last_name || '';
          document.getElementById('email').value = emp.email || '';
          document.getElementById('phone').value = emp.phone || '';
          document.getElementById('hire_date').value = emp.hire_date || '';
          document.getElementById('department_name').value = emp.department_name || '';
          document.getElementById('role_name').value = emp.role_name || '';
          document.getElementById('salary').value = emp.salary || 0;
          document.getElementById('is_active').checked = !!emp.is_active;
          if (bsModal) bsModal.show();
        } catch (err) {
          log('Error loading employee', err);
        }
      } else if (btn.dataset.action === 'delete') {
        if (!confirm('Deactivate this employee?')) return;
        try {
          await fetch(`${api}/${id}`, { method: 'DELETE' });
          fetchEmployees();
        } catch (err) {
          log('delete error', err);
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const id = document.getElementById('empId').value;
        const payload = {
          first_name: document.getElementById('first_name').value,
          last_name: document.getElementById('last_name').value,
          email: document.getElementById('email').value,
          phone: document.getElementById('phone').value,
          hire_date: document.getElementById('hire_date').value,
          salary: Number(document.getElementById('salary').value || 0),
          is_active: document.getElementById('is_active').checked,
          department_name: (document.getElementById('department_name').value || null),
          role_name: (document.getElementById('role_name').value || null)
        };

        let res;
        if (id) {
          res = await fetch(`${api}/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        } else {
          res = await fetch(api, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        }

        if (!res.ok) {
          const txt = await res.text();
          alert('Server error: ' + (txt || res.status));
        } else {
          if (bsModal) bsModal.hide();
          fetchEmployees();
        }
      } catch (err) {
        log('submit error', err);
        alert('Submit error: ' + err.message);
      }
    });
  }

  // initial load
  fetchEmployees();
});



