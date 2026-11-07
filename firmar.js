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

const translations = {
  es: {
    back: "← volver",
    eyebrowIntro: "[ libro de visitas ]",
    h1Line1: "Dejale algo",
    h1Line2: "a Pancha",
    sub: "Una foto, un mensajito, lo que quieras.",
    addPhoto: "+ Agregar foto",
    nameLabel: "Tu nombre",
    namePlaceholder: "¿Quién sos?",
    commentLabel: "Tu mensaje",
    commentPlaceholder: "Feliz cumple...",
    send: "Enviar",
    sending: "Enviando...",
    thanksEyebrow: "[ gracias ]",
    savedHeading: "Quedó guardado",
    addAnother: "Agregar otro",
    errName: "Poné tu nombre.",
    errBoth: "Agregá una foto o un mensaje.",
    errGeneric: "Algo salió mal, probá de nuevo.",
  },
  en: {
    back: "← back",
    eyebrowIntro: "[ guestbook ]",
    h1Line1: "Leave something",
    h1Line2: "for Pancha",
    sub: "A photo, a little note, whatever you like.",
    addPhoto: "+ Add photo",
    nameLabel: "Your name",
    namePlaceholder: "Who are you?",
    commentLabel: "Your message",
    commentPlaceholder: "Happy birthday...",
    send: "Send",
    sending: "Sending...",
    thanksEyebrow: "[ thanks ]",
    savedHeading: "Saved",
    addAnother: "Add another",
    errName: "Enter your name.",
    errBoth: "Add a photo or a message.",
    errGeneric: "Something went wrong, try again.",
  },
};

const LANG_KEY = "cumple-pancha-lang";
let currentLang = localStorage.getItem(LANG_KEY) || "es";

function t(key) {
  return translations[currentLang][key] || translations.es[key];
}

function applyLang() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.lang === currentLang);
  });
  submitBtn.textContent = submitBtn.disabled ? t("sending") : t("send");
}

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentLang = btn.dataset.lang;
    localStorage.setItem(LANG_KEY, currentLang);
    applyLang();
  });
});

applyLang();

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
  submitBtn.textContent = t("sending");

  try {
    const name = document.getElementById("name").value.trim();
    const comment = document.getElementById("comment").value.trim();

    if (!name) throw new Error("errName");
    if (!comment && !selectedFile) throw new Error("errBoth");

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
    errorEl.textContent = translations.es[err.message] ? t(err.message) : t("errGeneric");
    errorEl.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = t("send");
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
