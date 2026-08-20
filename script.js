(function () {
  "use strict";

  // ---------------------------------------------------------
  // CONFIG
  // ---------------------------------------------------------
  const WHATSAPP_NUMBER = "212656147401"; // 06 56 14 74 01 in international format
  const WHATSAPP_DEFAULT_MESSAGE =
    "Bonjour Golden Scissors, je souhaite prendre rendez-vous.";

  // Static fallback data, used only if the backend API is unreachable
  // (e.g. the frontend is opened directly as a file, without the Node server running)
  const FALLBACK_SERVICES = [
    {
      category: "Coupes",
      items: [
        { name: "Coupe classique", price: 40, duration: "30 min" },
        { name: "Coupe enfant (-12 ans)", price: 30, duration: "25 min" },
        { name: "Coupe + dégradé précision", price: 50, duration: "35 min" },
      ],
    },
    {
      category: "Barbe & rasage",
      items: [
        { name: "Taille de barbe", price: 25, duration: "20 min" },
        { name: "Rasage traditionnel au rasoir", price: 35, duration: "25 min" },
        { name: "Barbe + contours à la cire", price: 40, duration: "30 min" },
      ],
    },
    {
      category: "Formules",
      items: [
        { name: "Coupe + Barbe", price: 60, duration: "45 min" },
        { name: "Forfait Golden (Coupe + Barbe + Soin visage)", price: 120, duration: "1h15" },
      ],
    },
    {
      category: "Soins",
      items: [
        { name: "Soin visage & gommage", price: 50, duration: "30 min" },
        { name: "Coloration cheveux ou barbe", price: 70, duration: "40 min" },
      ],
    },
  ];

  const FALLBACK_HOURS = {
    schedule: [
      { day: "Lundi", dayIndex: 1, open: "09:00", close: "23:00" },
      { day: "Mardi", dayIndex: 2, open: "09:00", close: "23:00" },
      { day: "Mercredi", dayIndex: 3, open: "09:00", close: "23:00" },
      { day: "Jeudi", dayIndex: 4, open: "09:00", close: "23:00" },
      { day: "Vendredi", dayIndex: 5, open: "09:00", close: "23:00" },
      { day: "Samedi", dayIndex: 6, open: "09:00", close: "23:00" },
      { day: "Dimanche", dayIndex: 0, open: "10:00", close: "22:00" },
    ],
  };

  // ---------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------
  function waLink(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  function setAllWhatsappLinks(message) {
    const link = waLink(message);
    ["navWhatsapp", "heroWhatsapp", "locWhatsapp", "floatWhatsapp", "formWhatsapp"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = link;
    });
  }

  async function fetchJSON(url, fallback) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("bad status " + res.status);
      return await res.json();
    } catch (err) {
      console.warn(`Using fallback data for ${url}:`, err.message);
      return fallback;
    }
  }

  // ---------------------------------------------------------
  // SERVICES / PRICES
  // ---------------------------------------------------------
  function renderServices(categories) {
    const grid = document.getElementById("ticketGrid");
    const select = document.getElementById("serviceSelect");
    if (!grid) return;

    grid.innerHTML = "";
    if (select) select.innerHTML = '<option value="">— Sélectionner —</option>';

    categories.forEach((cat) => {
      const ticket = document.createElement("article");
      ticket.className = "ticket";

      const heading = document.createElement("p");
      heading.className = "ticket-category";
      heading.textContent = cat.category;
      ticket.appendChild(heading);

      cat.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "ticket-item";
        row.innerHTML = `
          <span class="name">${item.name}</span>
          <span class="leader"></span>
          <span class="price">${item.price} DH</span>
        `;
        ticket.appendChild(row);

        if (item.duration) {
          const dur = document.createElement("span");
          dur.className = "duration";
          dur.textContent = item.duration;
          ticket.appendChild(dur);
        }

        if (select) {
          const opt = document.createElement("option");
          opt.value = `${cat.category} — ${item.name}`;
          opt.textContent = `${item.name} (${item.price} DH)`;
          select.appendChild(opt);
        }
      });

      grid.appendChild(ticket);
    });
  }

  // ---------------------------------------------------------
  // HOURS
  // ---------------------------------------------------------
  const DAY_NAMES_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  function computeOpenNow(schedule) {
    const now = new Date();
    const dayIndex = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const today = schedule.find((d) => d.dayIndex === dayIndex);
    if (!today) return { isOpenNow: false, today: DAY_NAMES_FR[dayIndex] };

    const [oh, om] = today.open.split(":").map(Number);
    const [ch, cm] = today.close.split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    return { isOpenNow: minutes >= openMin && minutes < closeMin, today: today.day };
  }

  function renderHours(data) {
    const tbody = document.querySelector("#hoursTable tbody");
    if (tbody) {
      tbody.innerHTML = "";
      const orderedForDisplay = [...data.schedule].sort((a, b) => {
        const order = [1, 2, 3, 4, 5, 6, 0];
        return order.indexOf(a.dayIndex) - order.indexOf(b.dayIndex);
      });
      const todayIndex = new Date().getDay();

      orderedForDisplay.forEach((d) => {
        const tr = document.createElement("tr");
        if (d.dayIndex === todayIndex) tr.className = "today";
        tr.innerHTML = `<td>${d.day}</td><td>${d.open} – ${d.close}</td>`;
        tbody.appendChild(tr);
      });
    }

    const status = typeof data.isOpenNow === "boolean" ? data : computeOpenNow(data.schedule);

    updateStatusUI(status.isOpenNow, status.today);
  }

  function updateStatusUI(isOpen, todayLabel) {
    const label = isOpen ? "Ouvert actuellement" : "Fermé actuellement";
    const pairs = [
      ["statusDot", "statusText"],
      ["statusDot2", "statusText2"],
    ];
    pairs.forEach(([dotId, textId]) => {
      const dot = document.getElementById(dotId);
      const text = document.getElementById(textId);
      if (dot) dot.className = "dot " + (isOpen ? "open" : "closed");
      if (text) text.textContent = `${label}${todayLabel ? " — " + todayLabel : ""}`;
    });
  }

  // ---------------------------------------------------------
  // NAV: scroll shadow + mobile toggle
  // ---------------------------------------------------------
  function initNav() {
    const header = document.getElementById("siteHeader");
    const toggle = document.getElementById("navToggle");
    const nav = document.getElementById("mainNav");

    window.addEventListener(
      "scroll",
      () => {
        header.classList.toggle("solid", window.scrollY > 40);
      },
      { passive: true }
    );

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
      nav.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => {
          nav.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        })
      );
    }
  }

  // ---------------------------------------------------------
  // BOOKING FORM
  // ---------------------------------------------------------
  function initBookingForm() {
    const form = document.getElementById("bookingForm");
    const feedback = document.getElementById("formFeedback");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      feedback.textContent = "Envoi en cours…";
      feedback.classList.remove("error");

      const data = Object.fromEntries(new FormData(form).entries());

      try {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Envoi impossible");

        feedback.textContent = "Merci ! Votre demande a bien été envoyée. Nous vous recontacterons rapidement.";
        form.reset();
      } catch (err) {
        feedback.textContent =
          "Impossible d'envoyer la demande pour le moment — écrivez-nous directement sur WhatsApp.";
        feedback.classList.add("error");
      }
    });
  }

  // ---------------------------------------------------------
  // SCROLL PROGRESS BAR
  // ---------------------------------------------------------
  function initProgressBar() {
    const bar = document.getElementById("progressBar");
    if (!bar) return;
    window.addEventListener(
      "scroll",
      () => {
        const h = document.documentElement;
        const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100;
        bar.style.width = scrolled + "%";
      },
      { passive: true }
    );
  }

  // ---------------------------------------------------------
  // SCROLL REVEAL
  // ---------------------------------------------------------
  function initScrollReveal() {
    const targets = document.querySelectorAll(".reveal, #ticketGrid, #galleryGrid");
    if (!("IntersectionObserver" in window) || !targets.length) {
      targets.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach((el) => io.observe(el));
  }

  // ---------------------------------------------------------
  // NAV SCROLLSPY (active link while scrolling)
  // ---------------------------------------------------------
  function initScrollspy() {
    const sections = document.querySelectorAll("section[id]");
    const links = document.querySelectorAll(".main-nav a[href^='#']");
    if (!sections.length || !links.length || !("IntersectionObserver" in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = entry.target.getAttribute("id");
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => io.observe(s));
  }

  // ---------------------------------------------------------
  // LIGHTBOX (gallery photos)
  // ---------------------------------------------------------
  function initLightbox() {
    const lightbox = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    const closeBtn = document.getElementById("lightboxClose");
    if (!lightbox || !img) return;

    function open(src, alt) {
      img.src = src;
      img.alt = alt || "";
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
    function close() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    document.querySelectorAll(".tile-media[data-full]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const full = btn.getAttribute("data-full");
        const altText = btn.querySelector("img")?.alt || "";
        open(full, altText);
      });
    });

    closeBtn?.addEventListener("click", close);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && lightbox.classList.contains("open")) close();
    });
  }

  // ---------------------------------------------------------
  // MAGNETIC BUTTONS (subtle pull toward cursor)
  // ---------------------------------------------------------
  function initMagneticButtons() {
    const els = document.querySelectorAll(".btn-gold, .float-whatsapp");
    if (window.matchMedia("(hover: none)").matches) return; // skip on touch devices
    els.forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.14}px, ${y * 0.28}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  // ---------------------------------------------------------
  // INIT
  // ---------------------------------------------------------
  document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("year").textContent = new Date().getFullYear();

    setAllWhatsappLinks(WHATSAPP_DEFAULT_MESSAGE);
    initNav();
    initBookingForm();
    initProgressBar();
    initScrollspy();
    initLightbox();
    initMagneticButtons();

    const services = await fetchJSON("/api/services", FALLBACK_SERVICES);
    renderServices(services);

    const hours = await fetchJSON("/api/hours", FALLBACK_HOURS);
    renderHours(hours);

    initScrollReveal();
  });
})();
