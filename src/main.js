import * as THREE from "three";

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

const intro = document.querySelector("#intro");
const skipIntro = document.querySelector("#intro-skip");

let introTimer;

function finishIntro() {
  window.clearTimeout(introTimer);
  intro?.classList.add("done");
}

if (reduceMotion) {
  intro?.remove();
} else {
  introTimer = window.setTimeout(finishIntro, 2100);
  skipIntro?.addEventListener("click", finishIntro);
}

const yearElement = document.querySelector("#year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

const menuButton = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".desktop-nav");

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("open", !expanded);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !reduceMotion) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 },
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

const stage = document.querySelector("#orb-stage");
const isSmall = window.matchMedia("(max-width: 600px)").matches;
const canRender3d =
  !reduceMotion && !isSmall && stage && "WebGLRenderingContext" in window;

if (canRender3d) {
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.z = 5.2;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    stage.replaceChildren(renderer.domElement);

    const orb = new THREE.Group();
    scene.add(orb);

    const geometry = new THREE.IcosahedronGeometry(1.12, 5);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x8c63d8,
      metalness: 0.52,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.13,
      emissive: 0x251044,
      emissiveIntensity: 0.55,
    });

    orb.add(new THREE.Mesh(geometry, material));

    const wire = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0xd6c0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.12,
      }),
    );
    wire.scale.setScalar(1.004);
    orb.add(wire);

    const ringA = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.004, 8, 180),
      new THREE.MeshBasicMaterial({
        color: 0xc3a6ff,
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
      }),
    );
    ringA.rotation.set(1.16, 0.24, -0.42);
    orb.add(ringA);

    const ringB = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.003, 8, 180),
      new THREE.MeshBasicMaterial({
        color: 0x73e6de,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      }),
    );
    ringB.rotation.set(1.02, -0.42, 0.56);
    orb.add(ringB);

    scene.add(new THREE.AmbientLight(0x897ca8, 1.25));

    const key = new THREE.PointLight(0xf4eaff, 45, 12);
    key.position.set(-2.4, 2.4, 3.8);
    scene.add(key);

    const cyan = new THREE.PointLight(0x63d8e3, 28, 9);
    cyan.position.set(2.6, -1, 2.2);
    scene.add(cyan);

    const violet = new THREE.PointLight(0x8b57ee, 28, 10);
    violet.position.set(0, 2.4, -2.5);
    scene.add(violet);

    const pointer = { x: 0, y: 0 };

    stage.addEventListener(
      "pointermove",
      (event) => {
        const rect = stage.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      },
      { passive: true },
    );

    stage.addEventListener(
      "pointerleave",
      () => {
        pointer.x = 0;
        pointer.y = 0;
      },
      { passive: true },
    );

    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    if ("ResizeObserver" in window) {
      new ResizeObserver(resize).observe(stage);
    } else {
      window.addEventListener("resize", resize);
    }

    let frame;

    const render = (time) => {
      frame = requestAnimationFrame(render);

      const t = time * 0.00022;
      orb.rotation.y += (pointer.x * 0.18 + t * 0.35 - orb.rotation.y) * 0.018;
      orb.rotation.x +=
        (-pointer.y * 0.13 + Math.sin(t) * 0.1 - orb.rotation.x) * 0.018;
      ringA.rotation.z += 0.0008;
      ringB.rotation.z -= 0.0006;
      orb.position.y = Math.sin(t * 1.7) * 0.035;

      renderer.render(scene, camera);
    };

    render(0);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        render(0);
      }
    });
  } catch (error) {
    console.info(
      "Keeping the CSS orb fallback because WebGL could not start.",
      error,
    );
  }
}

const contactForm = document.querySelector("#contact-form");
const contactStatus = document.querySelector("#contact-status");

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = contactForm.querySelector('[type="submit"]');
  const payload = Object.fromEntries(new FormData(contactForm).entries());

  if (contactStatus) {
    contactStatus.textContent = "Sending your message…";
    contactStatus.dataset.state = "pending";
  }

  if (submitButton) submitButton.disabled = true;

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not send your message.");
    }

    if (contactStatus) {
      contactStatus.textContent = "Message received. Thanks for reaching out!";
      contactStatus.dataset.state = "success";
    }

    contactForm.reset();
  } catch (error) {
    if (contactStatus) {
      contactStatus.textContent =
        error.message || "Could not send your message. Please try again.";
      contactStatus.dataset.state = "error";
    }
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

const cliDialog = document.querySelector("#cli-dialog");
const cliOpen = document.querySelector("#cli-open");
const cliClose = document.querySelector("#cli-close");
const cliForm = document.querySelector("#cli-form");
const cliCommand = document.querySelector("#cli-command");
const cliOutput = document.querySelector("#cli-output");

cliOpen?.addEventListener("click", () => {
  if (!cliDialog || !cliCommand) return;
  cliDialog.showModal();
  cliCommand.focus();
});

cliClose?.addEventListener("click", () => cliDialog?.close());

cliDialog?.addEventListener("click", (event) => {
  if (event.target === cliDialog) cliDialog.close();
});

cliForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!cliCommand || !cliOutput) return;

  const command = cliCommand.value.trim().toLowerCase();
  if (!command) return;

  const promptLine = document.createElement("p");
  promptLine.textContent = `ayush@portfolio:~$ ${command}`;
  cliOutput.append(promptLine);

  const response = document.createElement("p");

  const commands = {
    help: "Available commands: about, projects, skills, contact, clear",
    about:
      "I’m Ayush Solanki, a B.Tech CS-AI student and full-stack developer.",
    projects: "Featured projects: Roamnest, FinSight, and TourWise AI.",
    skills:
      "Java, DSA, HTML, CSS, JavaScript, React, Node.js, Express, MongoDB, SQL.",
    contact: "Scroll to the contact section to send me a message.",
  };

  if (command === "clear") {
    cliOutput.replaceChildren();
  } else if (commands[command]) {
    response.textContent = commands[command];
    cliOutput.append(response);

    if (command === "contact") {
      cliDialog?.close();
      document
        .querySelector("#contact")
        ?.scrollIntoView({ behavior: "smooth" });
    } else if (command === "projects") {
      cliDialog?.close();
      document.querySelector("#work")?.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    response.textContent = `Command not found: ${command}. Type "help" for options.`;
    cliOutput.append(response);
  }

  cliCommand.value = "";
  cliOutput.scrollTop = cliOutput.scrollHeight;
});

const themeToggle = document.querySelector("#theme-toggle");

themeToggle?.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-theme");
  themeToggle.textContent = isLight ? "☾" : "☼";
  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Switch to dark theme" : "Switch to light theme",
  );
});

// Dynamic certificate postboxes
const certificateTrack = document.querySelector("#certificate-track");
const certificateDots = document.querySelector("#certificate-dots");
const certificateStatus = document.querySelector("#certificates-status");

const previewDialog = document.createElement("dialog");
previewDialog.className = "certificate-preview-dialog";
previewDialog.innerHTML = `
  <div class="certificate-preview-header">
    <p class="certificate-preview-caption"></p>
    <button type="button" class="certificate-preview-close" aria-label="Close preview">
      ×
    </button>
  </div>
  <img class="certificate-preview-image" alt="" />
`;
document.body.append(previewDialog);

const previewImage = previewDialog.querySelector(".certificate-preview-image");
const previewCaption = previewDialog.querySelector(".certificate-preview-caption");

function openCertificatePreview(certificate) {
  previewImage.src = certificate.imageUrl;
  previewImage.alt = `${certificate.title} certificate`;
  previewCaption.textContent =
    `${certificate.title} · ${certificate.issuer} · ${certificate.year}`;
  previewDialog.showModal();
}

previewDialog
  .querySelector(".certificate-preview-close")
  .addEventListener("click", () => previewDialog.close());

previewDialog.addEventListener("click", (event) => {
  if (event.target === previewDialog) previewDialog.close();
});


function makeCertificateCard(certificate) {
  const card = document.createElement("article");
  card.className = "postbox-card";
  card.tabIndex = 0;

  const paper = document.createElement("div");
  paper.className = "postbox-paper";

  const image = document.createElement("img");
  image.src = certificate.imageUrl;
  image.alt = `${certificate.title} certificate`;
  image.loading = "lazy";
  paper.append(image);

  const front = document.createElement("div");
  front.className = "postbox-front";

  const flap = document.createElement("div");
  flap.className = "postbox-flap";

  const details = document.createElement("div");
  details.className = "postbox-details";

  const title = document.createElement("h3");
  title.textContent = certificate.title;

  const meta = document.createElement("p");
  meta.textContent = `${certificate.issuer} · ${certificate.year}`;

  const view = document.createElement("button");
view.type = "button";
view.className = "certificate-view";
view.textContent = "View ↗";
view.addEventListener("click", () => openCertificatePreview(certificate));

  details.append(title, meta, view);
  front.append(flap, details);
  card.append(paper, front);

  return card;
}

async function loadPortfolioCertificates() {
  if (!certificateTrack) return;

  try {
    const response = await fetch("/api/portfolio/certificates");

    if (!response.ok) {
      throw new Error(`Could not load certificates (${response.status}).`);
    }

    const { certificates = [] } = await response.json();

    if (!certificates.length) {
      certificateTrack.innerHTML =
        '<p class="certificates-empty">No published certificates yet.</p>';
      certificateDots?.replaceChildren();
      return;
    }
    

    const cards = certificates.map(makeCertificateCard);
    certificateTrack.replaceChildren(...cards);

    if (!certificateDots) return;

    certificateDots.replaceChildren();

    cards.forEach((card, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `certificate-dot${index === 0 ? " is-active" : ""}`;
      dot.setAttribute("aria-label", `Show certificate ${index + 1}`);

      dot.addEventListener("click", () => {
        card.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "nearest",
          inline: "start",
        });
      });

      certificateDots.append(dot);
    });

    certificateTrack.addEventListener(
      "scroll",
      () => {
        const firstCard = cards[0];
        const gap =
          parseFloat(getComputedStyle(certificateTrack).columnGap) || 0;
        const step = firstCard.getBoundingClientRect().width + gap;
        const activeIndex = Math.min(
          cards.length - 1,
          Math.round(certificateTrack.scrollLeft / step),
        );

        [...certificateDots.children].forEach((dot, index) => {
          dot.classList.toggle("is-active", index === activeIndex);
        });
      },
      { passive: true },
    );
  } catch (error) {
    console.error("Certificate display failed:", error);

    if (certificateStatus) {
      certificateStatus.textContent = error.message;
    } else {
      certificateTrack.innerHTML =
        '<p class="certificates-empty">Could not load certificates.</p>';
    }
  }
}

function scrollCertificates(direction) {
  const card = certificateTrack?.querySelector(".postbox-card");
  if (!card || !certificateTrack) return;

  const gap = parseFloat(getComputedStyle(certificateTrack).columnGap) || 0;

  certificateTrack.scrollBy({
    left: direction * (card.getBoundingClientRect().width + gap),
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

document
  .querySelector("#certificate-prev")
  ?.addEventListener("click", () => scrollCertificates(-1));

document
  .querySelector("#certificate-next")
  ?.addEventListener("click", () => scrollCertificates(1));

loadPortfolioCertificates();
