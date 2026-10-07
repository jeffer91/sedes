import {
  db, ACTIVE_PERIOD_ID, ACTIVE_PERIOD_LABEL, RESPONSE_COLLECTION,
  normalizeCedula, isValidCedula, formatDate, initials, friendlyFirebaseError
} from "./firebase.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const el = (id) => document.getElementById(id);
const form = el("lookupForm");
const cedulaInput = el("cedula");
const lookupBtn = el("lookupBtn");
const lookupMessage = el("lookupMessage");
const lookupPanel = el("lookupPanel");
const selectionPanel = el("selectionPanel");
const registeredPanel = el("registeredPanel");
const saveMessage = el("saveMessage");
const confirmBtn = el("confirmBtn");
const selectedCityLabel = el("selectedCityLabel");
const dialog = el("confirmDialog");
const dialogCity = el("dialogCity");

let student = null;
let selectedCity = "";

function showMessage(node, text, type = "info") {
  node.textContent = text;
  node.className = `message ${type}`;
  node.hidden = false;
}
function hideMessage(node) { node.hidden = true; }
function resetSelection() {
  selectedCity = "";
  selectedCityLabel.textContent = "Aún no has seleccionado una sede";
  confirmBtn.disabled = true;
  document.querySelectorAll("[data-city]").forEach(card => {
    card.classList.remove("selected");
    card.setAttribute("aria-checked", "false");
  });
}
function responseId(cedula) {
  return `${ACTIVE_PERIOD_ID}__${cedula}`;
}
function renderStudent(data, cedula) {
  const name = data.nombres || "Estudiante";
  el("studentInitials").textContent = initials(name).toUpperCase() || "ES";
  el("studentName").textContent = name;
  el("studentId").textContent = `Cédula: ${cedula}`;
  el("studentCareer").textContent = data.nombreCarreraActual || "Carrera no registrada";
  el("studentAcademicCampus").textContent = `Sede académica: ${data.sede || "No registrada"}`;
}
function renderRegistered(data) {
  selectionPanel.hidden = true;
  lookupPanel.hidden = true;
  registeredPanel.hidden = false;
  el("registeredCity").textContent = data.sedeComplexivo || "—";
  el("registeredName").textContent = data.nombres || student?.nombres || "—";
  el("registeredId").textContent = data.cedula || student?.cedula || "—";
  el("registeredDate").textContent = formatDate(data.fechaRegistro || data.updatedAt);
  registeredPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

cedulaInput.addEventListener("input", () => {
  cedulaInput.value = normalizeCedula(cedulaInput.value);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage(lookupMessage);
  resetSelection();

  const cedula = normalizeCedula(cedulaInput.value);
  if (!isValidCedula(cedula)) {
    showMessage(lookupMessage, "Ingresa una cédula válida de 10 dígitos.", "error");
    cedulaInput.focus();
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.textContent = "Consultando…";
  try {
    const studentRef = doc(db, "Estudiante", cedula);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
      showMessage(lookupMessage, "No encontramos un estudiante activo con esa cédula. Verifica el número e intenta nuevamente.", "error");
      return;
    }

    const data = studentSnap.data();
    if (data.eliminado === true) {
      showMessage(lookupMessage, "El registro del estudiante no se encuentra activo.", "error");
      return;
    }

    student = { ...data, cedula };
    const existing = await getDoc(doc(db, RESPONSE_COLLECTION, responseId(cedula)));
    if (existing.exists()) {
      renderRegistered(existing.data());
      return;
    }

    renderStudent(data, cedula);
    selectionPanel.hidden = false;
    registeredPanel.hidden = true;
    selectionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    showMessage(lookupMessage, friendlyFirebaseError(error), "error");
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.textContent = "Consultar";
  }
});

document.querySelectorAll("[data-city]").forEach(card => {
  card.addEventListener("click", () => {
    selectedCity = card.dataset.city;
    document.querySelectorAll("[data-city]").forEach(item => {
      const active = item === card;
      item.classList.toggle("selected", active);
      item.setAttribute("aria-checked", String(active));
    });
    selectedCityLabel.textContent = `Sede seleccionada: ${selectedCity}`;
    confirmBtn.disabled = false;
    hideMessage(saveMessage);
  });
});

confirmBtn.addEventListener("click", () => {
  if (!student || !selectedCity) return;
  dialogCity.textContent = selectedCity;
  dialog.showModal();
});

el("dialogConfirmBtn").addEventListener("click", async (event) => {
  event.preventDefault();
  if (!student || !selectedCity) return;

  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "Registrando…";
  try {
    const ref = doc(db, RESPONSE_COLLECTION, responseId(student.cedula));
    const current = await getDoc(ref);
    if (current.exists()) {
      dialog.close();
      renderRegistered(current.data());
      return;
    }

    await setDoc(ref, {
      id: responseId(student.cedula),
      cedula: student.cedula,
      nombres: student.nombres || "",
      codigoCarrera: student.codigoCarreraActual || "",
      nombreCarrera: student.nombreCarreraActual || "",
      periodoId: ACTIVE_PERIOD_ID,
      periodoNombre: ACTIVE_PERIOD_LABEL,
      sedeAcademica: student.sede || "",
      sedeComplexivo: selectedCity,
      confirmado: true,
      origen: "web-estudiante",
      version: 1,
      fechaRegistro: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const saved = await getDoc(ref);
    dialog.close();
    renderRegistered(saved.exists() ? saved.data() : {
      ...student,
      sedeComplexivo: selectedCity,
      fechaRegistro: new Date()
    });
  } catch (error) {
    console.error(error);
    dialog.close();
    showMessage(saveMessage, friendlyFirebaseError(error), "error");
  } finally {
    button.disabled = false;
    button.textContent = "Sí, registrar sede";
  }
});

el("newLookupBtn").addEventListener("click", () => {
  student = null;
  cedulaInput.value = "";
  registeredPanel.hidden = true;
  selectionPanel.hidden = true;
  lookupPanel.hidden = false;
  hideMessage(lookupMessage);
  hideMessage(saveMessage);
  resetSelection();
  cedulaInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});