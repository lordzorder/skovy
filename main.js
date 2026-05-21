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
const REVIEWS_URL = "/data/reviews.json";
const REVIEW_COLLAPSE_LIMIT = 260;
const reviewsContainer = document.querySelector("[data-reviews]");
const reviewsPrev = document.querySelector("[data-reviews-prev]");
const reviewsNext = document.querySelector("[data-reviews-next]");

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

function renderReviews(reviews) {
  if (!reviews.length) {
    reviewsContainer.innerHTML = '<p class="loading-text">Jelenleg nincs megjeleníthető vélemény.</p>';
    return;
  }

  reviewsContainer.innerHTML = reviews
    .map((item, index) => {
      const isLong = item.text.length + item.translation.length > REVIEW_COLLAPSE_LIMIT;
      const meta = [item.source, item.intro].filter(Boolean).join(" · ");
      return `
        <article class="review-card${isLong ? " is-collapsible" : ""}" data-review-card>
          <div class="review-card-top">
            <span class="review-mark" aria-hidden="true">“</span>
            ${meta ? `<p class="review-meta">${escapeHtml(meta)}</p>` : ""}
          </div>
          <div class="review-copy${isLong ? " is-collapsed" : ""}" id="review-copy-${index}" data-review-copy>
            <p>${escapeHtml(item.text)}</p>
            ${item.translation ? `<p class="review-translation">${escapeHtml(item.translation)}</p>` : ""}
          </div>
          <div class="review-footer">
            <strong>${escapeHtml(item.name)}</strong>
            ${
              isLong
                ? `<button class="review-toggle" type="button" aria-expanded="false" aria-controls="review-copy-${index}" data-review-toggle>Tovább olvasom</button>`
                : ""
            }
          </div>
        </article>
      `;
    })
    .join("");
}

reviewsPrev.addEventListener("click", () => {
  reviewsContainer.scrollBy({ left: -reviewsContainer.clientWidth * 0.86, behavior: "smooth" });
});

reviewsNext.addEventListener("click", () => {
  reviewsContainer.scrollBy({ left: reviewsContainer.clientWidth * 0.86, behavior: "smooth" });
});

reviewsContainer.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-review-toggle]");
  if (!toggle) return;

  const card = toggle.closest("[data-review-card]");
  const copy = card.querySelector("[data-review-copy]");
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";

  toggle.setAttribute("aria-expanded", String(!isExpanded));
  toggle.textContent = isExpanded ? "Tovább olvasom" : "Bezárás";
  copy.classList.toggle("is-collapsed", isExpanded);
  card.classList.toggle("is-expanded", !isExpanded);
});

fetch(`${REVIEWS_URL}${REVIEWS_URL.includes("?") ? "&" : "?"}updated=${Date.now()}`, { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("A vélemények nem tölthetők be.");
    return response.json();
  })
  .then((payload) => renderReviews(normalizeReviews(payload)))
  .catch(() => {
    reviewsContainer.innerHTML =
      '<p class="loading-text">A vélemények jelenleg nem tölthetők be. Helyi fájlból futtatva indíts szervert, külső forrásnál pedig Google Sheets + Apps Script JSON endpointot használj.</p>';
  });

// Contact form opens the visitor's default email client with a prefilled message.
const mailForm = document.querySelector("[data-mail-form]");

mailForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = new FormData(mailForm);
  const name = data.get("name")?.toString().trim() || "";
  const email = data.get("email")?.toString().trim() || "";
  const phone = data.get("phone")?.toString().trim() || "";
  const message = data.get("message")?.toString().trim() || "";

  const subject = encodeURIComponent(`Masszázs időpontfoglalás - ${name}`);
  const body = encodeURIComponent(
    [`Név: ${name}`, `Email: ${email}`, `Telefonszám: ${phone}`, "", "Üzenet:", message].join("\n"),
  );

  window.location.href = `mailto:skovy.massage@gmail.com?subject=${subject}&body=${body}`;
});
