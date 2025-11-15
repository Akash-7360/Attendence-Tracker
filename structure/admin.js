// admin.js - admin page wiring: view students, attendance, events CRUD, analytics
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { collection, getDocs, doc, getDoc, deleteDoc, addDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { exportCSV } from './utils.js';

const studentsPanel = document.getElementById('studentsPanel');
const eventsPanel = document.getElementById('eventsPanel');
const attendancePanel = document.getElementById('attendancePanel');
const analyticsPanel = document.getElementById('analyticsPanel');
const exportBtn = document.getElementById('exportBtn');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'index.html'; return; }
  // role check
  const udoc = await getDoc(doc(db, 'users', user.uid));
  if (!udoc.exists() || udoc.data().role !== 'admin') { await signOut(auth); alert('Admin access required'); window.location.href = 'index.html'; return; }
  await loadStudents();
  await loadEvents();
  await loadAttendance();
  await loadAnalytics();
});

logoutBtn.addEventListener('click', async () => { await signOut(auth); window.location.href = 'index.html'; });

exportBtn.addEventListener('click', async () => {
  // fetch attendance and export
  const snap = await getDocs(collection(db, 'attendance'));
  const rows = [];
  snap.forEach(s => {
    const d = s.data();
    rows.push({ attendance_id: s.id, user_id: d.user_id, event_id: d.event_id, status: d.status, timestamp: d.timestamp ? (d.timestamp.seconds ? new Date(d.timestamp.seconds*1000).toISOString() : new Date(d.timestamp).toISOString()) : '', lat: d.lat || '', lng: d.lng || '' });
  });
  exportCSV(rows, 'attendance_export.csv');
});

async function loadStudents() {
  const snap = await getDocs(collection(db, 'users'));
  let html = '<h2>Students</h2><div class="student-list"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>';
  snap.forEach(s => {
    const d = s.data();
    html += `<tr><td>${escapeHtml(d.name || '')}</td><td>${escapeHtml(d.email || '')}</td><td>${escapeHtml(d.role || '')}</td></tr>`;
  });
  html += '</tbody></table></div>';
  studentsPanel.innerHTML = html;
}

async function loadEvents() {
  const snap = await getDocs(collection(db, 'events'));
  let html = '<h2>Events</h2><div class="event-list"><button id="addEvent" class="btn">Add Event</button><table><thead><tr><th>Title</th><th>Date</th><th>Time</th><th>Actions</th></tr></thead><tbody>';
  snap.forEach(s => {
    const d = s.data();
    html += `<tr><td>${escapeHtml(d.title||'')}</td><td>${escapeHtml(d.date||'')}</td><td>${escapeHtml(d.start_time||'')} - ${escapeHtml(d.end_time||'')}</td><td><button class="edit" data-id="${s.id}">Edit</button> <button class="del" data-id="${s.id}">Delete</button></td></tr>`;
  });
  html += '</tbody></table></div>';
  eventsPanel.innerHTML = html;
  document.getElementById('addEvent').addEventListener('click', showAddEventForm);
  document.querySelectorAll('.event-list .edit').forEach(b => b.addEventListener('click', e => showEditEventForm(e.target.dataset.id)));
  document.querySelectorAll('.event-list .del').forEach(b => b.addEventListener('click', async e => {
    if (!confirm('Delete this event?')) return;
    await deleteDoc(doc(db, 'events', e.target.dataset.id));
    await loadEvents();
  }));
}

function showAddEventForm() {
  eventsPanel.innerHTML = `<h2>Add Event</h2>
    <div><input id="evTitle" placeholder="Title" /><input id="evDate" placeholder="YYYY-MM-DD" /><input id="evStart" placeholder="HH:MM (24h)" /><input id="evEnd" placeholder="HH:MM (24h)" /><input id="evLat" placeholder="Latitude" /><input id="evLng" placeholder="Longitude" /><input id="evRadius" placeholder="Radius (meters)" /><textarea id="evDesc" placeholder="Description"></textarea><button id="saveEv" class="btn">Save</button> <button id="cancelEv" class="btn danger">Cancel</button></div>`;
  document.getElementById('saveEv').addEventListener('click', async () => {
    const title = document.getElementById('evTitle').value.trim();
    const date = document.getElementById('evDate').value.trim();
    const start_time = document.getElementById('evStart').value.trim();
    const end_time = document.getElementById('evEnd').value.trim();
    const geo_lat = parseFloat(document.getElementById('evLat').value);
    const geo_lng = parseFloat(document.getElementById('evLng').value);
    const radius_meters = parseInt(document.getElementById('evRadius').value, 10) || 50;
    const description = document.getElementById('evDesc').value.trim();
    await addDoc(collection(db, 'events'), { title, date, start_time, end_time, geo_lat, geo_lng, radius_meters, description });
    await loadEvents();
  });
  document.getElementById('cancelEv').addEventListener('click', loadEvents);
}

async function showEditEventForm(id) {
  const evDoc = await getDoc(doc(db, 'events', id));
  if (!evDoc.exists()) return;
  const d = evDoc.data();
  eventsPanel.innerHTML = `<h2>Edit Event</h2>
    <div><input id="evTitle" placeholder="Title" value="${escapeHtml(d.title||'')}" /><input id="evDate" placeholder="YYYY-MM-DD" value="${escapeHtml(d.date||'')}" /><input id="evStart" placeholder="HH:MM (24h)" value="${escapeHtml(d.start_time||'')}" /><input id="evEnd" placeholder="HH:MM (24h)" value="${escapeHtml(d.end_time||'')}" /><input id="evLat" placeholder="Latitude" value="${escapeHtml(d.geo_lat||'')}" /><input id="evLng" placeholder="Longitude" value="${escapeHtml(d.geo_lng||'')}" /><input id="evRadius" placeholder="Radius (meters)" value="${escapeHtml(d.radius_meters||'')}" /><textarea id="evDesc" placeholder="Description">${escapeHtml(d.description||'')}</textarea><button id="updateEv" class="btn">Update</button> <button id="cancelEv" class="btn danger">Cancel</button></div>`;
  document.getElementById('updateEv').addEventListener('click', async () => {
    const title = document.getElementById('evTitle').value.trim();
    const date = document.getElementById('evDate').value.trim();
    const start_time = document.getElementById('evStart').value.trim();
    const end_time = document.getElementById('evEnd').value.trim();
    const geo_lat = parseFloat(document.getElementById('evLat').value);
    const geo_lng = parseFloat(document.getElementById('evLng').value);
    const radius_meters = parseInt(document.getElementById('evRadius').value, 10) || 50;
    const description = document.getElementById('evDesc').value.trim();
    await updateDoc(doc(db, 'events', id), { title, date, start_time, end_time, geo_lat, geo_lng, radius_meters, description });
    await loadEvents();
  });
  document.getElementById('cancelEv').addEventListener('click', loadEvents);
}

async function loadAttendance() {
  const snap = await getDocs(collection(db, 'attendance'));
  let html = '<h2>Attendance</h2><table><thead><tr><th>User</th><th>Event</th><th>Time</th><th>Status</th></tr></thead><tbody>';
  const promises = [];
  snap.forEach(s => {
    const d = s.data();
    promises.push((async () => {
      const userDoc = await getDoc(doc(db, 'users', d.user_id));
      const eventDoc = await getDoc(doc(db, 'events', d.event_id));
      const userName = userDoc.exists() ? userDoc.data().name : d.user_id;
      const eventTitle = eventDoc.exists() ? eventDoc.data().title : d.event_id;
      const time = d.timestamp && d.timestamp.seconds ? new Date(d.timestamp.seconds * 1000).toLocaleString() : (d.timestamp ? new Date(d.timestamp).toLocaleString() : '');
      html += `<tr><td>${escapeHtml(userName)}</td><td>${escapeHtml(eventTitle)}</td><td>${escapeHtml(time)}</td><td>${escapeHtml(d.status||'')}</td></tr>`;
    })());
  });
  await Promise.all(promises);
  html += '</tbody></table>';
  attendancePanel.innerHTML = html;
}

async function loadAnalytics() {
  // simple analytics: attendance counts per event
  const attSnap = await getDocs(collection(db, 'attendance'));
  const eventsSnap = await getDocs(collection(db, 'events'));
  const counts = {};
  eventsSnap.forEach(e => { counts[e.id] = { title: e.data().title || 'Event', count: 0 }; });
  attSnap.forEach(a => {
    const d = a.data();
    if (!counts[d.event_id]) counts[d.event_id] = { title: d.event_id, count: 0 };
    counts[d.event_id].count += 1;
  });
  const labels = [];
  const data = [];
  Object.values(counts).forEach(v => { labels.push(v.title); data.push(v.count); });

  analyticsPanel.innerHTML = `<h2>Analytics</h2><canvas id="barChart" width="400" height="160"></canvas><div><h3>Leaderboard</h3><ul id="leaderboard" class="leaderboard"></ul></div>`;
  // bar chart
  const ctx = document.getElementById('barChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Attendance count', data }] },
    options: { responsive: true }
  });

  // leaderboard - top events
  const lb = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
  const ul = document.getElementById('leaderboard');
  lb.forEach(item => {
    const li = document.createElement('li');
    li.textContent = `${item.title} — ${item.count}`;
    ul.appendChild(li);
  });
}

// small helper
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
