// auth.js
// Uses Firebase v9 modular SDK to register/login and manage basic user creation.
// DOM binding for index.html

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

import {
  doc,
  setDoc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const provider = new GoogleAuthProvider();

// DOM elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const googleSign = document.getElementById('googleSign');
const status = document.getElementById('status');
const roleStudent = document.getElementById('roleStudent');
const roleAdmin = document.getElementById('roleAdmin');

let currentRole = 'student';
roleStudent.addEventListener('click', () => { currentRole = 'student'; roleStudent.classList.add('active'); roleAdmin.classList.remove('active'); });
roleAdmin.addEventListener('click', () => { currentRole = 'admin'; roleAdmin.classList.add('active'); roleStudent.classList.remove('active'); });

registerBtn.addEventListener('click', async () => {
  status.textContent = '';
  const name = document.getElementById('nameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!name || !email || !password) { status.textContent = 'Please fill name, email and password'; return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      name, email, branch: '', year: '', profile_pic: '', role: currentRole, created_at: new Date()
    });
    await updateProfile(auth.currentUser, { displayName: name });
    status.textContent = 'Registration successful. Redirecting...';
    // small delay to let auth settle
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
  } catch (e) {
    console.error(e);
    status.textContent = e.message;
  }
});

loginBtn.addEventListener('click', async () => {
  status.textContent = '';
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  if (!email || !password) { status.textContent = 'Enter email & password'; return; }
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // role enforcement for admin
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    const role = userDoc.exists() ? userDoc.data().role : 'student';
    if (currentRole === 'admin' && role !== 'admin') {
      await signOut(auth);
      status.textContent = 'Admin access denied for this account';
      return;
    }
    if (currentRole === 'admin') window.location.href = 'admin.html';
    else window.location.href = 'dashboard.html';
  } catch (e) {
    console.error(e);
    status.textContent = e.message;
  }
});

googleSign.addEventListener('click', async () => {
  status.textContent = '';
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const uref = doc(db, 'users', user.uid);
    const snap = await getDoc(uref);
    if (!snap.exists()) {
      await setDoc(uref, { name: user.displayName || '', email: user.email || '', branch: '', year: '', profile_pic: user.photoURL || '', role: 'student', created_at: new Date() });
    }
    window.location.href = 'dashboard.html';
  } catch (e) {
    console.error(e);
    status.textContent = e.message;
  }
});

const forgot = document.getElementById('forgot');
forgot.addEventListener('click', async (e) => {
  e.preventDefault();
  status.textContent = '';
  const email = document.getElementById('emailInput').value.trim();
  if (!email) { status.textContent = 'Enter your email to reset password'; return; }
  try {
    await sendPasswordResetEmail(auth, email);
    status.textContent = 'Password reset email sent';
  } catch (e) {
    status.textContent = e.message;
  }
});

// Optional: redirect if already logged in (does not force admin redirect)
onAuthStateChanged(auth, user => {
  if (user) {
    // do nothing - allow page to be used
  }
});
