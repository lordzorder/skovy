const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");

function updateHeaderState() {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
}

updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

navToggle.addEventListener("click", () => {
  const isOpen = header.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    header.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }
});

const galleryTrack = document.querySelector("[data-gallery-track]");
const galleryItems = Array.from(document.querySelectorAll("[data-gallery-item]"));
const galleryPrev = document.querySelector("[data-gallery-prev]");
const galleryNext = document.querySelector("[data-gallery-next]");

galleryPrev.addEventListener("click", () => {
  galleryTrack.scrollBy({ left: -galleryTrack.clientWidth * 0.82, behavior: "smooth" });
});

galleryNext.addEventListener("click", () => {
  galleryTrack.scrollBy({ left: galleryTrack.clientWidth * 0.82, behavior: "smooth" });
});

// Lightbox gallery
const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
const lightboxClose = document.querySelector("[data-lightbox-close]");
const lightboxPrev = document.querySelector("[data-lightbox-prev]");
const lightboxNext = document.querySelector("[data-lightbox-next]");
let currentGalleryIndex = 0;

function renderLightbox() {
  const image = galleryItems[currentGalleryIndex].querySelector("img");
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = image.alt;
}

function openLightbox(index) {
  currentGalleryIndex = index;
  renderLightbox();
  lightbox.hidden = false;
  document.body.classList.add("is-lightbox-open");
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove("is-lightbox-open");
  galleryItems[currentGalleryIndex].focus();
}

function moveLightbox(direction) {
  currentGalleryIndex = (currentGalleryIndex + direction + galleryItems.length) % galleryItems.length;
  renderLightbox();
}

galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => openLightbox(index));
});

lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", () => moveLightbox(-1));
lightboxNext.addEventListener("click", () => moveLightbox(1));

lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (lightbox.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});

// Reviews can later point to a public Google Apps Script JSON endpoint.
// Prefer Google Sheets + Apps Script over direct Google Drive fetches to avoid CORS and permission issues.
const REVIEWS_URL = "data/reviews.json";
const reviewsContainer = document.querySelector("[data-reviews]");
const reviewsPrev = document.querySelector("[data-reviews-prev]");
const reviewsNext = document.querySelector("[data-reviews-next]");
const LOCAL_REVIEWS_FALLBACK = Array.isArray(window.LOCAL_REVIEWS) ? window.LOCAL_REVIEWS : [];
let loadedReviews = [];
let currentReviewIndex = 0;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeReviews(payload) {
  const reviews = Array.isArray(payload) ? payload : payload?.reviews;
  if (!Array.isArray(reviews)) return [];

  return reviews
    .map((item) => ({
      name: item?.name?.toString().trim() || "Vendég",
      source: item?.source?.toString().trim() || "",
      intro: item?.intro?.toString().trim() || "",
      text: item?.text?.toString().trim() || "",
      translation: item?.translation?.toString().trim() || "",
    }))
    .filter((item) => item.text);
}

function renderReviewParagraphs(value) {
  return String(value)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function renderCurrentReview() {
  if (!loadedReviews.length) {
    reviewsContainer.innerHTML = '<p class="loading-text">Jelenleg nincs megjeleníthető vélemény.</p>';
    return;
  }

  const item = loadedReviews[currentReviewIndex];
  const meta = [item.source, item.intro].filter(Boolean).join(" · ");

  reviewsContainer.innerHTML = `
    <article class="review-card" data-review-card>
      <div class="review-card-top">
        <span class="review-mark" aria-hidden="true">“</span>
        ${meta ? `<p class="review-meta">${escapeHtml(meta)}</p>` : ""}
      </div>
      <div class="review-copy" data-review-copy>
        ${renderReviewParagraphs(item.text)}
        ${item.translation ? `<div class="review-translation">${renderReviewParagraphs(item.translation)}</div>` : ""}
      </div>
      <div class="review-footer">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="review-counter">${currentReviewIndex + 1} / ${loadedReviews.length}</span>
      </div>
    </article>
  `;
}

function renderReviews(reviews) {
  loadedReviews = reviews;
  currentReviewIndex = 0;
  renderCurrentReview();
}

function moveReview(direction) {
  if (!loadedReviews.length) return;
  currentReviewIndex = (currentReviewIndex + direction + loadedReviews.length) % loadedReviews.length;
  renderCurrentReview();
}

reviewsPrev.addEventListener("click", () => moveReview(-1));
reviewsNext.addEventListener("click", () => moveReview(1));

fetch(`${REVIEWS_URL}${REVIEWS_URL.includes("?") ? "&" : "?"}updated=${Date.now()}`, { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("A vélemények nem tölthetők be.");
    return response.json();
  })
  .then((payload) => renderReviews(normalizeReviews(payload)))
  .catch(() => {
    const fallbackReviews = normalizeReviews(LOCAL_REVIEWS_FALLBACK);
    if (fallbackReviews.length) {
      renderReviews(fallbackReviews);
      return;
    }

    reviewsContainer.innerHTML =
      '<p class="loading-text">A vélemények jelenleg nem tölthetők be. Helyi fájlból futtatva indíts szervert, külső forrásnál pedig Google Sheets + Apps Script JSON endpointot használj.</p>';
  });
