// events.js - helper utilities to be used on admin or other pages as module
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

export async function listEvents() {
  const snap = await getDocs(collection(db, 'events'));
  const arr = [];
  snap.forEach(s => arr.push({ id: s.id, ...s.data() }));
  return arr;
}

export async function getEvent(id) {
  const s = await getDoc(doc(db, 'events', id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function createEvent(obj) { // obj: {title,date,start_time,end_time,geo_lat,geo_lng,radius_meters,description}
  return await addDoc(collection(db, 'events'), obj); 
}

export async function updateEvent(id, obj) {
  return await updateDoc(doc(db, 'events', id), obj);
}

export async function deleteEvent(id) {
  return await deleteDoc(doc(db, 'events', id));
}
