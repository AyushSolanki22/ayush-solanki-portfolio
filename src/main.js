const stage = document.querySelector("#orb-stage");

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

if (stage) {
  stage.querySelector("canvas")?.remove();
  stage.querySelector(".reactor-motion")?.remove();

  const motion = document.createElement("div");
  motion.className = "reactor-motion";
  motion.setAttribute("aria-hidden", "true");

  const reactorImage = document.createElement("img");
  reactorImage.className = "reactor-image";
  reactorImage.src = "/images/reactor-core.png";
  reactorImage.alt = "";

  reactorImage.addEventListener("error", () => {
    console.error("Could not load /images/reactor-core.png");
  });

  motion.append(reactorImage);
  stage.append(motion);

  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    stage.addEventListener(
      "pointermove",
      (event) => {
        const bounds = stage.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;

        motion.style.setProperty("--tilt-x", `${-y * 7}deg`);
        motion.style.setProperty("--tilt-y", `${x * 9}deg`);
      },
      { passive: true },
    );

    stage.addEventListener(
      "pointerleave",
      () => {
        motion.style.setProperty("--tilt-x", "0deg");
        motion.style.setProperty("--tilt-y", "0deg");
      },
      { passive: true },
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



const projectGrid = document.querySelector('#project-grid');

function safeProjectUrl(value) {
  if (!value) return '';

  try {
    const url = new URL(value, window.location.origin);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return url.href;
    }
  } catch {
    // Invalid URL: do not render a link.
  }

  return '';
}

function createProjectCard(project) {
  const card = document.createElement('article');
  card.className = 'project-card';

  if (project.featured) {
    card.classList.add('is-featured');
  }

  const imageUrl = safeProjectUrl(project.imageUrl);
  const githubUrl = safeProjectUrl(project.githubUrl);
  const liveUrl = safeProjectUrl(project.liveUrl);

  const media = document.createElement('div');
  media.className = 'project-card-media';

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = `${project.title} project preview`;
    image.loading = 'lazy';
    media.append(image);
  } else {
    media.classList.add('project-card-media-fallback');
    const initials = document.createElement('span');
    initials.textContent = project.title
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0] || '')
      .join('')
      .toUpperCase();
    media.append(initials);
  }

  const badges = document.createElement('div');
  badges.className = 'project-card-badges';

  if (liveUrl) {
    badges.append(makeProjectBadge('LIVE', 'live'));
  }

  if (project.accessType === 'private') {
    badges.append(makeProjectBadge('PRIVATE', 'private'));
  }

  if (project.featured) {
    badges.append(makeProjectBadge('FEATURED', 'featured'));
  }

  media.append(badges);

  const body = document.createElement('div');
  body.className = 'project-card-body';

  const heading = document.createElement('div');
  heading.className = 'project-card-heading';

  const mark = document.createElement('span');
  mark.className = 'project-card-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = '✳';

  const titleGroup = document.createElement('div');

  const title = document.createElement('h3');
title.textContent = project.title;

if (project.category?.trim()) {
  const category = document.createElement('p');
  category.className = 'project-card-category';
  category.textContent = project.category;
  titleGroup.append(category);
}

titleGroup.append(title);
  heading.append(mark, titleGroup);

  const summary = document.createElement('p');
  summary.className = 'project-card-summary';
  summary.textContent = project.summary;

  body.append(heading, summary);

  if (Array.isArray(project.stack) && project.stack.length) {
    const tags = document.createElement('ul');
    tags.className = 'project-card-tags';
    tags.setAttribute('aria-label', 'Technologies used');

    project.stack.forEach((item) => {
      const tag = document.createElement('li');
      tag.textContent = item;
      tags.append(tag);
    });

    body.append(tags);
  }

  const actions = document.createElement('div');
  actions.className = 'project-card-actions';

  if (githubUrl) {
    actions.append(makeProjectLink('GitHub', githubUrl, 'github'));
  }

  if (liveUrl) {
    actions.append(makeProjectLink('Live project', liveUrl, 'live'));
  }

  if (project.accessType === 'private' && !githubUrl && !liveUrl) {
    const privateNote = document.createElement('span');
    privateNote.className = 'project-private-note';
    privateNote.textContent = 'Private / internal project';
    actions.append(privateNote);
  }

  if (actions.children.length) {
    body.append(actions);
  }

  card.append(media, body);
  return card;
}

function makeProjectBadge(label, kind) {
  const badge = document.createElement('span');
  badge.className = `project-badge project-badge-${kind}`;
  badge.textContent = label;
  return badge;
}

function makeProjectLink(label, url, kind) {
  const link = document.createElement('a');
  link.className = `project-link project-link-${kind}`;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = label;
  return link;
}

async function loadPortfolioProjects() {
  if (!projectGrid) return;

  try {
    const response = await fetch('/api/portfolio/projects');

    if (!response.ok) {
      throw new Error('Could not load projects.');
    }

    const { projects = [] } = await response.json();
    projectGrid.replaceChildren();

    if (!projects.length) {
      const empty = document.createElement('p');
      empty.className = 'projects-empty';
      empty.textContent = 'Projects will appear here soon.';
      projectGrid.append(empty);
      return;
    }

    projectGrid.append(...projects.map(createProjectCard));
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'projects-empty';
    message.textContent = error.message;
    projectGrid.replaceChildren(message);
  }
}

loadPortfolioProjects();


async function loadPortfolioSkills() {
  const track = document.querySelector('#portfolio-skills-track');
  if (!track) return;

  try {
    const response = await fetch('/api/portfolio/content');
    if (!response.ok) throw new Error('Could not load skills.');

    const { content } = await response.json();
    const skills = Array.isArray(content?.skills)
      ? content.skills.filter((skill) => typeof skill === 'string' && skill.trim())
      : [];

    track.replaceChildren();

    if (!skills.length) {
      const message = document.createElement('p');
      message.className = 'skills-empty';
      message.textContent = 'Skills will appear here soon.';
      track.append(message);
      return;
    }

    function makeSkillGroup(hidden = false) {
      const group = document.createElement('div');
      group.className = 'skill-object-group';

      if (hidden) group.setAttribute('aria-hidden', 'true');

      skills.forEach((skill) => {
        const item = document.createElement('span');
        item.className = 'skill-object';

        const abbreviation = document.createElement('b');
        abbreviation.textContent = skill
          .split(/\s+/)
          .map((word) => word[0])
          .join('')
          .slice(0, 3)
          .toUpperCase();

        const label = document.createElement('small');
        label.textContent = skill;

        item.append(abbreviation, label);
        group.append(item);
      });

      return group;
    }

    track.append(makeSkillGroup(), makeSkillGroup(true));
  } catch {
    track.replaceChildren();
    const message = document.createElement('p');
    message.className = 'skills-empty';
    message.textContent = 'Skills could not be loaded.';
    track.append(message);
  }
}

loadPortfolioSkills();