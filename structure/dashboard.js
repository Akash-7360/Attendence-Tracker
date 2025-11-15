// dashboard.js - student page wiring
import { auth, db, storage } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { ref, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profilePic = document.getElementById('profilePic');
const btnLogout = document.getElementById('btnLogout');
const btnMark = document.getElementById('btnMark');
const btnHistory = document.getElementById('btnHistory');
const btnProfile = document.getElementById('btnProfile');
const btnEdit = document.getElementById('btnEdit');
const currentEventEl = document.getElementById('currentEvent');
const pageContent = document.getElementById('pageContent');

let currentUserData = null;

onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'index.html'; return; }
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists()) {
    const d = userDoc.data();
    currentUserData = d;
    profileName.textContent = d.name || user.displayName || 'Student';
    profileEmail.textContent = d.email || user.email;
    profilePic.src = d.profile_pic || 'images/placeholder-profile.svg';
    await loadCurrentEvent();
    showHome();
  } else {
    // no user doc: create minimal and redirect
    await fetch('/'); // noop
  }
});

btnLogout.addEventListener('click', async () => { await signOut(auth); window.location.href = 'index.html'; });
btnMark.addEventListener('click', () => { showMarkAttendance(); });
btnHistory.addEventListener('click', () => { showHistory(); });
btnProfile.addEventListener('click', () => { showProfile(); });
btnEdit.addEventListener('click', () => { showEditProfile(); });

async function loadCurrentEvent() {
  const now = new Date();
  const eventsRef = collection(db, 'events');
  const snapshot = await getDocs(eventsRef);
  let found = null;
  snapshot.forEach(snap => {
    const ev = snap.data();
    ev.id = snap.id;
    // parse date + times consistently (assuming ISO-like date strings or 'YYYY-MM-DD')
    try {
      const start = new Date(`${ev.date}T${ev.start_time}`);
      const end = new Date(`${ev.date}T${ev.end_time}`);
      if (now >= start && now <= end) found = ev;
    } catch (e) {
      // ignore parse errors
    }
  });
  if (found) {
    currentEventEl.innerHTML = `<h3>Current Session</h3><h2>${escapeHtml(found.title)}</h2><p>${escapeHtml(found.description)}</p><p>${found.start_time} - ${found.end_time}</p>`;
    currentEventEl.dataset.eventId = found.id;
  } else {
    currentEventEl.innerHTML = `<h3>No active session</h3><p>Check upcoming events</p>`;
    currentEventEl.dataset.eventId = '';
  }
}

function showHome() {
  pageContent.innerHTML = `<h2>Welcome, ${escapeHtml(currentUserData.name)}</h2><p>Use the buttons on the left to mark attendance or view history.</p>`;
}

function showMarkAttendance() {
  pageContent.innerHTML = `<h2>Mark Attendance</h2><div id="markArea"></div>`;
  const markArea = document.getElementById('markArea');
  if (currentEventEl.dataset.eventId) {
    markArea.innerHTML = `<p>Event: <strong>${currentEventEl.querySelector('h2').textContent}</strong></p><button id="doMark" class="btn-action btn-mark">Mark Attendance</button><p id="markStatus"></p>`;
    document.getElementById('doMark').addEventListener('click', async () => {
      const evId = currentEventEl.dataset.eventId;
      // call attendance function exported by attendance.js
      try {
        const mod = await import('./attendance.js');
        await mod.attemptMarkAttendance(evId);
        document.getElementById('markStatus').textContent = 'Marked ✓';
        // refresh history
        setTimeout(() => { showHistory(); }, 700);
      } catch (err) {
        document.getElementById('markStatus').textContent = err.message || String(err);
      }
    });
  } else {
    markArea.innerHTML = `<p>No active event now. Check events page.</p>`;
  }
}

async function showHistory() {
  pageContent.innerHTML = `<h2>Attendance History</h2><div id="historyArea">Loading...</div>`;
  const histSnap = await getDocs(collection(db, 'attendance'));
  const arr = [];
  histSnap.forEach(snap => {
    const d = snap.data();
    if (d.user_id === auth.currentUser.uid) {
      arr.push({ ...d, id: snap.id });
    }
  });
  if (arr.length === 0) { document.getElementById('historyArea').innerHTML = '<p>No records yet</p>'; return; }
  let html = '<table><thead><tr><th>Event</th><th>Time</th><th>Status</th></tr></thead><tbody>';
  for (const r of arr) {
    try {
      const evDoc = await getDoc(doc(db, 'events', r.event_id));
      const ev = evDoc.exists() ? evDoc.data().title : 'Event';
      const time = r.timestamp && r.timestamp.seconds ? new Date(r.timestamp.seconds * 1000).toLocaleString() : (r.timestamp ? new Date(r.timestamp).toLocaleString() : '-');
      html += `<tr><td>${escapeHtml(ev)}</td><td>${escapeHtml(time)}</td><td>${escapeHtml(r.status || '')}</td></tr>`;
    } catch (e) {
      html += `<tr><td>Event</td><td>-</td><td>${escapeHtml(r.status || '')}</td></tr>`;
    }
  }
  html += '</tbody></table>';
  document.getElementById('historyArea').innerHTML = html;
}

function showProfile() {
  pageContent.innerHTML = `<h2>Profile</h2><div><img src="${currentUserData.profile_pic || 'images/placeholder-profile.svg'}" style="width:96px;height:96px;border-radius:12px"/><p>Name: ${escapeHtml(currentUserData.name)}</p><p>Email: ${escapeHtml(currentUserData.email)}</p><p>Branch: ${escapeHtml(currentUserData.branch || '-')}</p><p>Year: ${escapeHtml(currentUserData.year || '-')}</p></div>`;
}

function showEditProfile() {
  pageContent.innerHTML = `<h2>Edit Profile</h2><div><input id="eName" placeholder="Full name" value="${escapeHtml(currentUserData.name || '')}" /><input id="eBranch" placeholder="Branch" value="${escapeHtml(currentUserData.branch || '')}" /><input id="eYear" placeholder="Year" value="${escapeHtml(currentUserData.year || '')}" /><input id="ePic" type="file" accept="image/*" /><button id="saveProfile" class="btn-action">Save</button><p id="saveStatus"></p></div>`;
  document.getElementById('saveProfile').addEventListener('click', async () => {
    const name = document.getElementById('eName').value.trim();
    const branch = document.getElementById('eBranch').value.trim();
    const year = document.getElementById('eYear').value.trim();
    const file = document.getElementById('ePic').files[0];
    const uid = auth.currentUser.uid;
    const uref = doc(db, 'users', uid);
    try {
      let picUrl = currentUserData.profile_pic || '';
      if (file) {
        const storRef = ref(storage, `profiles/${uid}/${file.name}`);
        const snap = await uploadBytesResumable(storRef, file);
        picUrl = await getDownloadURL(snap.ref);
      }
      await setDoc(uref, { ...currentUserData, name, branch, year, profile_pic: picUrl }, { merge: true });
      document.getElementById('saveStatus').textContent = 'Saved';
      setTimeout(() => { location.reload(); }, 800);
    } catch (e) {
      document.getElementById('saveStatus').textContent = e.message || String(e);
    }
  });
}

// small utility
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
