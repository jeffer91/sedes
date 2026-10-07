import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
};

export const ACTIVE_PERIOD_ID = "2026-04__2026-09";
export const ACTIVE_PERIOD_LABEL = "Abril 2026 a Septiembre 2026";
export const RESPONSE_COLLECTION = "eleccionSedeComplexivo";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function normalizeCedula(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 10);
}

export function isValidCedula(value) {
  return /^\d{10}$/.test(value);
}

export function formatDate(value) {
  if (!value) return "Pendiente de sincronización";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export function friendlyFirebaseError(error) {
  const code = error?.code || "";
  const map = {
    "permission-denied": "Firebase bloqueó la consulta por permisos. Revisa las reglas de Firestore.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe una cuenta con ese correo.",
    "auth/wrong-password": "Contraseña incorrecta.",
    "auth/popup-closed-by-user": "Se cerró la ventana de autenticación.",
    "auth/operation-not-allowed": "Este método de inicio de sesión no está habilitado en Firebase Authentication.",
    "unavailable": "No fue posible conectar con Firebase. Revisa tu conexión e intenta nuevamente."
  };
  return map[code] || error?.message || "Ocurrió un error inesperado.";
}