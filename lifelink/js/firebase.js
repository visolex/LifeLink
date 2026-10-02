import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';

// This is the Firebase web app configuration from the Firebase console.
// Do not add service-account keys or other server credentials here.
  const firebaseConfig = {
    apiKey: "AIzaSyCs35GI7fxxGNFEkN7vJvi6yvWkFJzFOuA",
    authDomain: "lifelink-40016.firebaseapp.com",
    projectId: "lifelink-40016",
    storageBucket: "lifelink-40016.firebasestorage.app",
    messagingSenderId: "118573578675",
    appId: "1:118573578675:web:7ebad20a47d1968a9433c6",
    measurementId: "G-MG6FG8ET1P"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
