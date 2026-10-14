import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyA7QjWQ9frjqnistyoj_sSMNvxZJzgCFbc",
  authDomain: "pmc-tracker-d8b38.firebaseapp.com",
  projectId: "pmc-tracker-d8b38",
  storageBucket: "pmc-tracker-d8b38.firebasestorage.app",
  messagingSenderId: "53401702829",
  appId: "1:53401702829:web:176dcd22e97df9454ed124"
};

let db = null;
let auth = null;
let firebaseReady = false;

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  db = firebase.firestore();
  auth = firebase.auth();
  try {
    db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
  } catch (e) {}
  firebaseReady = true;
} catch (e) {
  console.warn('Firebase initialization notice:', e);
}

export { firebase, db, auth, firebaseReady };
