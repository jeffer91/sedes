import express from "express";
import crypto from "node:crypto";
import admin from "firebase-admin";

const app = express();
const ORIGIN = "https://jeffer91.github.io";
const PROJECT = "utet-4387a";
const ACTIVE_PERIOD = "2026-04__2026-09";
const ADMIN_CEDULA = process.env.ADMIN_CEDULA || "";
const PIN_HASH = process.env.ADMIN_PIN_HASH || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const PORT = Number(process.env.PORT || 10000);
const attempts = new Map();

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "8kb" }));
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin === ORIGIN) {
    res.set("Access-Control-Allow-Origin", ORIGIN);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (origin && origin !== ORIGIN) return res.status(403).json({ error: "Origen no autorizado." });
  if (req.method === "OPTIONS") return res.status(204).end();
  res.set("Cache-Control", "no-store");
  next();
});

function checkPin(pin) {
  const parts = PIN_HASH.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  try {
    const expected = Buffer.from(parts[2], "hex");
    if (expected.length !== 32 || !/^[a-f0-9]{32}$/i.test(parts[1])) return false;
    const actual = crypto.scryptSync(pin, Buffer.from(parts[1], "hex"), 32);
    return crypto.timingSafeEqual(actual, expected);
  } catch { return false; }
}

function throttle(key, max, windowMs) {
  const now = Date.now();
  const row = attempts.get(key);
  if (!row || row.expires <= now) {
    attempts.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  row.count++;
  return row.count > max;
}

function clearThrottle(key) { attempts.delete(key); }
const b64 = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
function signToken() {
  const now = Math.floor(Date.now() / 1000);
  const data = b64({ sub: ADMIN_CEDULA, scope: "sedes-admin", iat: now, exp: now + 1800 });
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
  return data + "." + signature;
}
function verifyToken(token) {
  if (!SESSION_SECRET || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(parts[0]).digest();
  let provided;
  try { provided = Buffer.from(parts[1], "base64url"); } catch { return false; }
  if (sig.length !== provided.length || !crypto.timingSafeEqual(sig, provided)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return payload.sub === ADMIN_CEDULA && payload.scope === "sedes-admin" &&
      Number.isSafeInteger(payload.exp) && payload.exp > Date.now() / 1000;
  } catch { return false; }
}
function requireAdmin(req, res, next) {
  const value = req.get("authorization") || "";
  if (!value.startsWith("Bearer ") || !verifyToken(value.slice(7))) {
    return res.status(401).json({ error: "La sesión caducó. Vuelve a ingresar." });
  }
  next();
}

let firebaseDb;
function database() {
  if (firebaseDb) return firebaseDb;
  const value = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!value) {
    const error = new Error("Falta configurar FIREBASE_SERVICE_ACCOUNT_JSON en Render.");
    error.status = 503;
    throw error;
  }
  const credential = JSON.parse(value);
  if (credential.project_id !== PROJECT) throw new Error("Proyecto Firebase incorrecto.");
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(credential), projectId: PROJECT });
  firebaseDb = admin.firestore();
  return firebaseDb;
}
function time(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (typeof value === "string") return value;
  return null;
}
function errorResponse(res, error) {
  console.error("[sedes-backend]", error.message);
  return res.status(error.status || 503).json({ error: "No fue posible acceder a los datos administrativos del proyecto." });
}

app.get("/health", (_req, res) => {
  const credentialsPresent = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  res.json({ service: "sedes-backend", ready: credentialsPresent && Boolean(ADMIN_CEDULA && PIN_HASH && SESSION_SECRET) });
});

app.post("/api/admin/login", (req, res) => {
  if (!ADMIN_CEDULA || !PIN_HASH || !SESSION_SECRET) {
    return res.status(503).json({ error: "El acceso administrativo aún no está configurado en el servidor." });
  }
  const cedula = String(req.body?.cedula || "");
  const pin = String(req.body?.pin || "");
  const ip = req.ip || "unknown";
  const limiter = "login:" + ip;
  if (throttle(limiter, 5, 15 * 60 * 1000) || throttle("login:global", 15, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Demasiados intentos. Vuelve a intentarlo más tarde." });
  }
  if (cedula !== ADMIN_CEDULA || !/^\d{4}$/.test(pin) || !checkPin(pin)) {
    return res.status(401).json({ error: "Usuario o PIN incorrecto." });
  }
  clearThrottle(limiter);
  res.json({ token: signToken(), expiresIn: 1800, cedula: ADMIN_CEDULA });
});

app.get("/api/admin/data", requireAdmin, async (_req, res) => {
  try {
    const db = database();
    const [matriculasSnap, responsesSnap] = await Promise.all([
      db.collection("matriculas").where("periodoId", "==", ACTIVE_PERIOD).get(),
      db.collection("eleccionSedeComplexivo").where("periodoId", "==", ACTIVE_PERIOD).get()
    ]);
    const matriculas = matriculasSnap.docs.map(d => {
      const x = d.data();
      return {
        id: d.id, cedula: x.cedula || "", nombres: x.nombres || "",
        nombreCarrera: x.nombreCarrera || "", sede: x.sede || "",
        estadoMatricula: x.estadoMatricula, modalidadTitulacion: x.modalidadTitulacion || "",
        eliminado: x.eliminado === true, retirado: x.retirado === true
      };
    });
    const responses = responsesSnap.docs.map(d => {
      const x = d.data();
      return {
        id: d.id, cedula: x.cedula || "", nombres: x.nombres || "",
        nombreCarrera: x.nombreCarrera || "", sedeAcademica: x.sedeAcademica || "",
        sedeComplexivo: x.sedeComplexivo || "", periodoId: x.periodoId,
        fechaRegistro: time(x.fechaRegistro), createdAt: time(x.createdAt), updatedAt: time(x.updatedAt)
      };
    });
    return res.json({ matriculas, responses });
  } catch (error) { return errorResponse(res, error); }
});

app.patch("/api/admin/responses/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id || "");
  const city = req.body?.sedeComplexivo;
  if (!id.startsWith(ACTIVE_PERIOD + "__") || !/^[0-9A-Za-z_-]{10,80}$/.test(id) ||
      !["Quito", "Manta"].includes(city)) {
    return res.status(400).json({ error: "Registro o sede inválidos." });
  }
  try {
    const db = database();
    const ref = db.collection("eleccionSedeComplexivo").doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.periodoId !== ACTIVE_PERIOD)
      return res.status(404).json({ error: "El registro no existe." });
    await ref.update({
      sedeComplexivo: city,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      modificacionAdministrativa: true,
      modificadoPor: ADMIN_CEDULA
    });
    return res.json({ ok: true });
  } catch (error) { return errorResponse(res, error); }
});

app.listen(PORT, "0.0.0.0", () => console.log("Sedes backend iniciado en puerto " + PORT));
