// Firebase project untuk WEBSITE PARDI (afiliator & tracking referral).
// Ini project Firebase TERPISAH dari project Pardi Finance — keduanya produk
// berbeda, jadi datanya sengaja tidak dicampur.
//
// Ganti seluruh objek ini dengan config dari Firebase Console:
// Project Settings -> General -> Your apps -> SDK setup and configuration
const firebaseConfig = {
  apiKey: "GANTI_DENGAN_API_KEY",
  authDomain: "GANTI.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID",
};

firebase.initializeApp(firebaseConfig);
const affAuth = firebase.auth();
const affDb = firebase.firestore();
