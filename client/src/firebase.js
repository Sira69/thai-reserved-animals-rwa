import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAj_Gkt4TRdUdXFibfsolRDdZ3HvdJMTqs",
  authDomain: "thai-rwa-fd589.firebaseapp.com",
  // URL assumes the Realtime Database is created in asia-southeast1 (Singapore).
  // Replace it with the exact URL shown by Firebase if you choose another region.
  databaseURL: "https://thai-rwa-fd589-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thai-rwa-fd589",
  storageBucket: "thai-rwa-fd589.firebasestorage.app",
  messagingSenderId: "211802812031",
  appId: "1:211802812031:web:d8fb724a57135f3e01d94a",
  measurementId: "G-8HX1DFC0VQ"
};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);
const auth = getAuth(app);

export { db, auth };
