import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAUKe3CN-pG9Y0v-OkEpK9PTymrwPbx3GA",
    authDomain: "ngo-app-c2d23.firebaseapp.com",
    projectId: "ngo-app-c2d23",
    storageBucket: "ngo-app-c2d23.firebasestorage.app",
    messagingSenderId: "219733990432",
    appId: "1:219733990432:web:782f957e8b089c467ab045"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
