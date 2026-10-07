import {
  db, auth, ACTIVE_PERIOD_ID, RESPONSE_COLLECTION,
  formatDate, friendlyFirebaseError
} from "./firebase.js";
import {
  collection, query, where, getDocs, onSnapshot, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import {
  signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const el = (id) => document.getElementById(id);
const loginView = el("loginView");
const dashboardView = el("dashboardView");
const loginMessage = el("loginMessage");
const dataMessage = el("dataMessage");

let responses = [];
let eligible = [];
let pending = [];
let unsubscribeResponses = null;
let editingRecord = null;
let editCity = "";

function showMessage(node, text, type = "info") {
  node.textContent = text;
  node.className = `message ${type}`;
  node.hidden = false;
}
function hideMessage(node) { node.hidden = true; }
function isInstitutional(email = "") {
  return email.toLowerCase().endsWith("@itsqmet.edu.ec");
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[c]);
}
function csvEscape(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function normalize(value = "") { return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

el("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage(loginMessage);
  const email = el("adminEmail").value.trim();
  const password = el("adminPassword").value;
  if (!isInstitutional(email)) {
    showMessage(loginMessage, "Utiliza un correo institucional @itsqmet.edu.ec.", "error");
    return;
  }
  el("loginBtn").disabled = true;
  el("loginBtn").textContent = "Ingresando…";
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showMessage(loginMessage, friendlyFirebaseError(error), "error");
  } finally {
    el("loginBtn").disabled = false;
    el("loginBtn").textContent = "Ingresar";
  }
});

el("googleLoginBtn").addEventListener("click", async () => {
  hideMessage(loginMessage);
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error) {
    showMessage(loginMessage, friendlyFirebaseError(error), "error");
  }
});

el("logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (unsubscribeResponses) unsubscribeResponses();
    loginView.hidden = false;
    dashboardView.hidden = true;
    return;
  }
  if (!isInstitutional(user.email || "")) {
    await signOut(auth);
    showMessage(loginMessage, "La cuenta autenticada no pertenece al dominio institucional @itsqmet.edu.ec.", "error");
    return;
  }
  loginView.hidden = true;
  dashboardView.hidden = false;
  el("adminUserEmail").textContent = user.email;
  await loadEligibility();
  listenResponses();
});

async function loadEligibility() {
  hideMessage(dataMessage);
  el("eligibilityStatus").textContent = "Base de elegibles: verificando…";
  try {
    const q = query(collection(db, "matriculas"), where("periodoId", "==", ACTIVE_PERIOD_ID));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(x => x.eliminado !== true && x.retirado !== true && (x.estadoMatricula || "ACTIVO") === "ACTIVO");

    const complexivo = rows.filter(x => normalize(x.modalidadTitulacion).includes("complexivo"));
    eligible = complexivo.length ? complexivo : rows;

    if (!snap.size) {
      el("eligibilityStatus").textContent = "Base de elegibles: no hay matrículas con este periodoId";
      el("pendingNote").textContent = "sin base de matrícula para comparar";
    } else if (!complexivo.length) {
      el("eligibilityStatus").textContent = `Base de elegibles: ${eligible.length} matrículas activas (modalidad no identificada)`;
      el("pendingNote").textContent = "sobre matrículas activas";
    } else {
      el("eligibilityStatus").textContent = `Base de elegibles: ${eligible.length} estudiantes de Complexivo`;
      el("pendingNote").textContent = "estudiantes sin respuesta";
    }
    calculatePending();
    renderAll();
  } catch (error) {
    eligible = [];
    el("eligibilityStatus").textContent = "Base de elegibles: no disponible";
    el("pendingNote").textContent = "no se pudo consultar matrículas";
    showMessage(dataMessage, friendlyFirebaseError(error), "warning");
  }
}

function listenResponses() {
  if (unsubscribeResponses) unsubscribeResponses();
  const q = query(collection(db, RESPONSE_COLLECTION), where("periodoId", "==", ACTIVE_PERIOD_ID));
  unsubscribeResponses = onSnapshot(q, (snap) => {
    responses = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => {
        const at = a.fechaRegistro?.seconds || a.createdAt?.seconds || 0;
        const bt = b.fechaRegistro?.seconds || b.createdAt?.seconds || 0;
        return bt - at;
      });
    calculatePending();
    populateCareers();
    renderAll();
  }, (error) => {
    showMessage(dataMessage, friendlyFirebaseError(error), "error");
  });
}

function calculatePending() {
  if (!eligible.length) {
    pending = [];
    return;
  }
  const answered = new Set(responses.map(r => r.cedula));
  pending = eligible.filter(e => !answered.has(e.cedula));
}

function populateCareers() {
  const select = el("careerFilter");
  const current = select.value;
  const set = new Set([
    ...responses.map(r => r.nombreCarrera),
    ...eligible.map(r => r.nombreCarrera)
  ].filter(Boolean));
  select.innerHTML = '<option value="">Todas las carreras</option>' +
    [...set].sort((a,b)=>a.localeCompare(b,"es")).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function renderStats() {
  const total = responses.length;
  const quito = responses.filter(r => r.sedeComplexivo === "Quito").length;
  const manta = responses.filter(r => r.sedeComplexivo === "Manta").length;
  el("statResponses").textContent = total;
  el("statQuito").textContent = quito;
  el("statManta").textContent = manta;
  el("pctQuito").textContent = total ? `${Math.round(quito * 100 / total)}%` : "0%";
  el("pctManta").textContent = total ? `${Math.round(manta * 100 / total)}%` : "0%";
  el("statPending").textContent = eligible.length ? pending.length : "—";
}

function filteredRows() {
  const mode = el("statusFilter").value;
  const search = normalize(el("searchInput").value.trim());
  const city = el("cityFilter").value;
  const career = el("careerFilter").value;

  const source = mode === "pending"
    ? pending.map(p => ({
        id: p.id,
        cedula: p.cedula,
        nombres: p.nombres || "",
        nombreCarrera: p.nombreCarrera || "",
        sedeAcademica: p.sede || "",
        sedeComplexivo: "",
        fechaRegistro: null,
        pending: true
      }))
    : responses;

  return source.filter(r => {
    const haystack = normalize([r.nombres, r.cedula, r.nombreCarrera, r.sedeAcademica].join(" "));
    return (!search || haystack.includes(search))
      && (!city || r.sedeComplexivo === city)
      && (!career || r.nombreCarrera === career);
  });
}

function renderTable() {
  const rows = filteredRows();
  const tbody = el("recordsBody");
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.nombres || "—")}</strong></td>
      <td class="mono">${escapeHtml(r.cedula || "—")}</td>
      <td>${escapeHtml(r.nombreCarrera || "—")}</td>
      <td>${escapeHtml(r.sedeAcademica || r.sede || "—")}</td>
      <td>${r.pending ? '<span class="badge badge-pending">Pendiente</span>' : `<span class="badge badge-${(r.sedeComplexivo || "").toLowerCase()}">${escapeHtml(r.sedeComplexivo || "—")}</span>`}</td>
      <td>${r.pending ? "—" : escapeHtml(formatDate(r.fechaRegistro || r.updatedAt))}</td>
      <td>${r.pending ? "" : `<button class="link-btn" data-edit="${escapeHtml(r.id)}">Corregir</button>`}</td>
    </tr>`).join("");

  el("emptyTable").hidden = rows.length !== 0;
  el("tableCount").textContent = `${rows.length} registro${rows.length === 1 ? "" : "s"}`;

  tbody.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => openEdit(btn.dataset.edit));
  });
}

function renderAll() {
  renderStats();
  renderTable();
}

["searchInput","cityFilter","careerFilter","statusFilter"].forEach(id => {
  el(id).addEventListener(id === "searchInput" ? "input" : "change", renderTable);
});

el("refreshBtn").addEventListener("click", async () => {
  await loadEligibility();
});

el("exportBtn").addEventListener("click", () => {
  const rows = filteredRows();
  if (!rows.length) return;
  const header = ["Estudiante","Cedula","Carrera","Sede academica","Sede complexivo","Fecha"];
  const data = rows.map(r => [
    r.nombres || "", r.cedula || "", r.nombreCarrera || "",
    r.sedeAcademica || r.sede || "", r.sedeComplexivo || "PENDIENTE",
    r.pending ? "" : formatDate(r.fechaRegistro || r.updatedAt)
  ]);
  const csv = "\uFEFF" + [header, ...data].map(row => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sede-complexivo-${ACTIVE_PERIOD_ID}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

function openEdit(id) {
  editingRecord = responses.find(r => r.id === id);
  if (!editingRecord) return;
  editCity = "";
  el("editStudentName").textContent = editingRecord.nombres || editingRecord.cedula;
  el("saveEditBtn").disabled = true;
  document.querySelectorAll("[data-edit-city]").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.editCity === editingRecord.sedeComplexivo);
  });
  el("editDialog").showModal();
}

document.querySelectorAll("[data-edit-city]").forEach(btn => {
  btn.addEventListener("click", () => {
    editCity = btn.dataset.editCity;
    document.querySelectorAll("[data-edit-city]").forEach(x => x.classList.toggle("selected", x === btn));
    el("saveEditBtn").disabled = editCity === editingRecord?.sedeComplexivo;
  });
});

el("saveEditBtn").addEventListener("click", async (event) => {
  event.preventDefault();
  if (!editingRecord || !editCity) return;
  const btn = event.currentTarget;
  btn.disabled = true;
  btn.textContent = "Guardando…";
  try {
    await updateDoc(doc(db, RESPONSE_COLLECTION, editingRecord.id), {
      sedeComplexivo: editCity,
      updatedAt: serverTimestamp(),
      modificacionAdministrativa: true,
      modificadoPor: auth.currentUser?.email || ""
    });
    el("editDialog").close();
  } catch (error) {
    showMessage(dataMessage, friendlyFirebaseError(error), "error");
    el("editDialog").close();
  } finally {
    btn.textContent = "Guardar cambio";
    editingRecord = null;
    editCity = "";
  }
});