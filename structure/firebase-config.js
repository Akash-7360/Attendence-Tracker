// firebase-config.js
// Replace values below with your Firebase project's config
export const firebaseConfig = {
  apiKey: "AIzaSyA7psIsWYX0ffscsHfLg9bTGGbfgwwaDCE",
  authDomain: "attendancetracker-1163d.firebaseapp.com",
  projectId: "attendancetracker-1163d",
  storageBucket: "attendancetracker-1163d.firebasestorage.app",
  messagingSenderId: "584346423744",
  appId: "1:584346423744:web:831851b006a3b85d83b825",
  measurementId: "G-CPB57G39FH"
};

// Firebase v9 modular imports (CDN)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
