import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const form = document.getElementById("form");
const photoInput = document.getElementById("photo");
const photoPreview = document.getElementById("photo-preview");
const photoPlaceholder = document.getElementById("photo-placeholder");
const submitBtn = document.getElementById("submit-btn");
const errorEl = document.getElementById("error");
const successEl = document.getElementById("success");
const againBtn = document.getElementById("again-btn");

let selectedFile = null;

photoInput.addEventListener("change", () => {
  selectedFile = photoInput.files[0] || null;
  if (!selectedFile) {
    photoPreview.hidden = true;
    photoPlaceholder.hidden = false;
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    photoPreview.src = reader.result;
    photoPreview.hidden = false;
    photoPlaceholder.hidden = true;
  };
  reader.readAsDataURL(selectedFile);
});

function resizeImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function photoToDataUrl(file) {
  // Keep the stored doc comfortably under Firestore's 1 MiB limit.
  let maxWidth = 1280;
  let quality = 0.75;
  for (let attempt = 0; attempt < 5; attempt++) {
    const dataUrl = await resizeImage(file, maxWidth, quality);
    if (dataUrl.length < 700_000) return dataUrl;
    maxWidth = Math.round(maxWidth * 0.75);
    quality = Math.max(0.4, quality - 0.15);
  }
  return resizeImage(file, 640, 0.4);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const name = document.getElementById("name").value.trim();
    const comment = document.getElementById("comment").value.trim();

    if (!name) throw new Error("Poné tu nombre.");
    if (!comment && !selectedFile) throw new Error("Agregá una foto o un mensaje.");

    const photo = selectedFile ? await photoToDataUrl(selectedFile) : null;

    await addDoc(collection(db, "guestbook"), {
      name,
      comment: comment || null,
      photo,
      createdAt: serverTimestamp(),
    });

    form.hidden = true;
    successEl.hidden = false;
  } catch (err) {
    errorEl.textContent = err.message || "Algo salió mal, probá de nuevo.";
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar";
  }
});

againBtn.addEventListener("click", () => {
  form.reset();
  photoPreview.hidden = true;
  photoPlaceholder.hidden = false;
  selectedFile = null;
  successEl.hidden = true;
  form.hidden = false;
});
