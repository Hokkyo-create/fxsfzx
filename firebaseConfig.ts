// firebaseConfig.ts
//
// INSTRUÇÕES:
// 1. Você acabou de registrar seu app da Web. Ótimo!
// 2. O Firebase está mostrando agora um bloco de código `const firebaseConfig = { ... };`
// 3. COPIE esse bloco de código inteiro.
// 4. COLE-O aqui, substituindo todo o conteúdo abaixo.

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBYyS3lZjFJKRN03xtTjRVr25BFKiclU4",
  authDomain: "chat-44b2b.firebaseapp.com",
  databaseURL: "https://chat-44b2b-default-rtdb.firebaseio.com",
  projectId: "chat-44b2b",
  storageBucket: "chat-44b2b.appspot.com",
  messagingSenderId: "912911591389",
  appId: "1:912911591389:web:b748634a6b13808b227834",
  measurementId: "G-WY197CKX3N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
export const storage = getStorage(app);