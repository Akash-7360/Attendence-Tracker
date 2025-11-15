// utils.js - small utilities (CSV export etc.)

/**
 * exportCSV(rows, filename)
 * rows: array of objects (flat)
 */
export function exportCSV(rows, filename = 'export.csv') {
  if (!rows || rows.length === 0) {
    alert('No data to export');
    return;
  }
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => `"${String(r[k] || '').replace(/"/g,'""')}"`).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
