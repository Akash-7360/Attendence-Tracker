// attendance.js
// Exports attemptMarkAttendance(eventId) that:
// - checks event exists
// - verifies current time within event time window
// - uses browser geolocation and checks radius
// - writes attendance document to Firestore

import { auth, db } from './firebase-config.js';
import { getDoc, doc, addDoc, collection } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Haversine formula
function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function attemptMarkAttendance(eventId) {
  if (!auth.currentUser) throw new Error('Not authenticated');
  if (!navigator.geolocation) throw new Error('Geolocation not supported by this browser');

  const evRef = doc(db, 'events', eventId);
  const evSnap = await getDoc(evRef);
  if (!evSnap.exists()) throw new Error('Event not found');
  const ev = evSnap.data();

  // time check
  const now = new Date();
  const start = new Date(`${ev.date}T${ev.start_time}`);
  const end = new Date(`${ev.date}T${ev.end_time}`);
  if (!(now >= start && now <= end)) throw new Error('Attendance is allowed only during the event time window');

  // obtain position
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const dist = distanceInMeters(lat, lng, Number(ev.geo_lat), Number(ev.geo_lng));
        const allowed = Number(ev.radius_meters || ev.radius || 50);
        if (dist > allowed) {
          reject(new Error(`You are ${Math.round(dist)} m away — outside allowed radius of ${allowed} m.`));
          return;
        }
        const rec = {
          user_id: auth.currentUser.uid,
          event_id: eventId,
          status: 'present',
          timestamp: new Date(),
          lat, lng
        };
        await addDoc(collection(db, 'attendance'), rec);
        resolve(true);
      } catch (e) {
        reject(e);
      }
    }, err => {
      reject(new Error('Geolocation error: ' + err.message));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}
