const $ = (selector) => document.querySelector(selector);
const loginView = $("#login-view");
const dashboard = $("#dashboard");

let messages = [];
let certificates = [];
let projects = [];

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

async function api(url, options = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(!isFormData && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

async function uploadAdminImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  return api("/api/admin/upload-image", {
    method: "POST",
    body: formData,
  });
}

function showImagePreview(preview, src) {
  if (!preview) return;

  if (src) {
    preview.src = src;
    preview.hidden = false;
  } else {
    preview.removeAttribute("src");
    preview.hidden = true;
  }
}

function showLogin() {
  loginView.hidden = false;
  dashboard.hidden = true;
  $("#logout-button").hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboard.hidden = false;
  $("#logout-button").hidden = false;
  loadHome();
}

async function loadHome() {
  $("#home-status").textContent = "Loading dashboard…";
  try {
    const stats = await api("/api/admin/overview");
    $("#stat-messages").textContent = stats.messages;
    $("#stat-unread").textContent = stats.unread;
    $("#stat-projects").textContent = stats.projects;
    $("#stat-published").textContent = stats.published;
    $("#stat-certificates").textContent =
      `${stats.publishedCertificates} / ${stats.certificates}`;
    $("#home-status").textContent = "Dashboard is up to date.";
  } catch (error) {
    $("#home-status").textContent = error.message;
  }
}

function renderAdminSkills(skills = []) {
  const list = $("#admin-skills-list");
  list.replaceChildren();

  skills.forEach((skill) => {
    const row = document.createElement("div");
    row.className = "admin-skill-row";

    const input = document.createElement("input");
    input.type = "text";
    input.name = "skill";
    input.maxLength = 60;
    input.value = skill;
    input.placeholder = "Skill name";
    input.setAttribute("aria-label", "Skill name");

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary-button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${skill}`);

    remove.addEventListener("click", () => row.remove());

    row.append(input, remove);
    list.append(row);
  });
}

$("#add-skill-button").addEventListener("click", () => {
  const currentSkills = [
    ...document.querySelectorAll('#admin-skills-list input[name="skill"]'),
  ]
    .map((input) => input.value.trim())
    .filter(Boolean);

  renderAdminSkills([...currentSkills, ""]);
  $('#admin-skills-list input[name="skill"]:last-of-type')?.focus();
});

document.querySelectorAll(".admin-nav button").forEach((button) => {
  button.addEventListener("click", async () => {
    document
      .querySelectorAll(".admin-nav button")
      .forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    document.querySelectorAll(".admin-view").forEach((view) => {
      view.hidden = true;
    });
    $(`#view-${button.dataset.view}`).hidden = false;

    try {
      if (button.dataset.view === "home") await loadHome();
      if (button.dataset.view === "messages") await loadMessages();
      if (button.dataset.view === "projects") await loadProjects();
      if (button.dataset.view === "profile") await loadProfile();
      if (button.dataset.view === "certificates") await loadCertificates();
    } catch (error) {
      $("#inbox-status").textContent = error.message;
      $("#project-status").textContent = error.message;
      $("#profile-status").textContent = error.message;
    }
  });
});

$("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("#login-error").textContent = "";
  const body = Object.fromEntries(new FormData(event.currentTarget));

  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    showDashboard();
  } catch (error) {
    $("#login-error").textContent = error.message;
  }
});

$("#logout-button").addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" }).catch(() => {});
  showLogin();
});

// Messages
async function loadMessages() {
  const filter = $("#message-filter").value;
  const query =
    filter === "unread"
      ? "?unread=true"
      : filter === "archived"
        ? "?archived=true"
        : "";

  messages = (await api(`/api/admin/messages${query}`)).messages;
  renderMessages();
}

function renderMessages() {
  const search = $("#message-search").value.trim().toLowerCase();
  const filtered = messages.filter((message) =>
    [message.name, message.email, message.subject, message.message].some(
      (value) => String(value).toLowerCase().includes(search),
    ),
  );

  $("#inbox-status").textContent =
    `${filtered.length} message${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    $("#message-list").innerHTML =
      '<p class="empty-state">No messages match this view.</p>';
    $("#message-detail").innerHTML =
      '<p class="empty-state">Choose another filter or wait for a new message.</p>';
    return;
  }

  $("#message-list").innerHTML = filtered
    .map(
      (message) => `
    <button class="message-item ${message.read ? "" : "unread"}"
      type="button" data-id="${escapeHtml(message._id)}">
      <span class="message-item-top">
        <strong>${escapeHtml(message.name)}</strong>
        <time>${escapeHtml(new Date(message.createdAt).toLocaleString())}</time>
      </span>
      <span class="message-item-subject">${escapeHtml(message.subject)}</span>
      <span class="message-item-email">${escapeHtml(message.email)}</span>
    </button>
  `,
    )
    .join("");

  $("#message-list")
    .querySelectorAll(".message-item")
    .forEach((button) => {
      button.addEventListener("click", () =>
        showMessage(button.dataset.id, filtered),
      );
    });

  showMessage(filtered[0]._id, filtered);
}

function showMessage(id, list = messages) {
  const message = list.find((item) => item._id === id);
  if (!message) return;

  $("#message-detail").innerHTML = `
    <div class="detail-top">
      <div>
        <p class="admin-kicker">${escapeHtml(new Date(message.createdAt).toLocaleString())}</p>
        <h2>${escapeHtml(message.subject)}</h2>
      </div>
      <span class="read-badge ${message.read ? "is-read" : ""}">
        ${message.read ? "READ" : "UNREAD"}
      </span>
    </div>
    <div class="sender-block">
      <strong>${escapeHtml(message.name)}</strong>
      <a href="mailto:${encodeURIComponent(message.email)}">${escapeHtml(message.email)}</a>
    </div>
    <p class="message-body">${escapeHtml(message.message)}</p>
    <div class="detail-actions">
      <a class="reply-link"
        href="mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent(`Re: ${message.subject}`)}">
        Reply by email ↗
      </a>
      <button id="toggle-read" class="secondary-button" type="button">
        Mark ${message.read ? "unread" : "read"}
      </button>
      <button id="toggle-archive" class="secondary-button" type="button">
        ${message.archived ? "Move to inbox" : "Archive"}
      </button>
    </div>
  `;

  $("#toggle-read").addEventListener("click", async () => {
    await api(`/api/admin/messages/${message._id}`, {
      method: "PATCH",
      body: JSON.stringify({ read: !message.read }),
    });
    await loadMessages();
    await loadHome();
  });

  $("#toggle-archive").addEventListener("click", async () => {
    await api(`/api/admin/messages/${message._id}`, {
      method: "PATCH",
      body: JSON.stringify({ archived: !message.archived }),
    });
    await loadMessages();
    await loadHome();
  });
}

$("#message-filter").addEventListener("change", () =>
  loadMessages().catch(showMessageError),
);
$("#message-search").addEventListener("input", renderMessages);
$("#refresh-button").addEventListener("click", () =>
  loadMessages().catch(showMessageError),
);

function showMessageError(error) {
  $("#inbox-status").textContent = error.message;
}

// Projects
async function loadProjects() {
  projects = (await api("/api/admin/projects")).projects;
  $("#project-status").textContent =
    `${projects.length} project${projects.length === 1 ? "" : "s"}`;

  $("#project-list").innerHTML =
    projects
      .map(
        (project) => `
    <article class="project-row">
      <div>
        <strong>${escapeHtml(project.title)}</strong>
<span>${escapeHtml(project.status)}${project.featured ? " · featured" : ""}</span>
<small>${escapeHtml(project.stack.join(" · "))}</small>
      </div>
      <div class="form-actions">
        <button class="secondary-button edit-project" data-id="${escapeHtml(project._id)}" type="button">Edit</button>
        <button class="secondary-button delete-project" data-id="${escapeHtml(project._id)}" type="button">Delete</button>
      </div>
    </article>
  `,
      )
      .join("") ||
    '<p class="empty-state">No projects yet. Add your first one.</p>';

  document.querySelectorAll(".edit-project").forEach((button) => {
    button.addEventListener("click", () => editProject(button.dataset.id));
  });

  document.querySelectorAll(".delete-project").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this project?")) return;
      try {
        await api(`/api/admin/projects/${button.dataset.id}`, {
          method: "DELETE",
        });
        await loadProjects();
        await loadHome();
      } catch (error) {
        $("#project-status").textContent = error.message;
      }
    });
  });
}

function editProject(id = "") {
  const form = $("#project-form");
  const project = projects.find((item) => item._id === id);

  form.hidden = false;
  form.elements.id.value = project?._id || "";
  form.elements.title.value = project?.title || "";
  form.elements.imageUrl.value = project?.imageUrl || "";
  form.elements.category.value = project?.category || "";
  form.elements.accessType.value = project?.accessType || "public";
  form.elements.summary.value = project?.summary || "";
  form.elements.description.value = project?.description || "";
  form.elements.stack.value = project?.stack?.join(", ") || "";
  form.elements.githubUrl.value = project?.githubUrl || "";
  form.elements.liveUrl.value = project?.liveUrl || "";
  form.elements.featured.checked = Boolean(project?.featured);
  form.elements.status.value = project?.status || "draft";
  form.elements.imageUrl.value = project?.imageUrl || '';
  form.elements.imageFile.value = "";
  showImagePreview($("#project-image-preview"), project?.imageUrl || "");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#new-project").addEventListener("click", () => editProject());
$("#cancel-project").addEventListener("click", () => {
  $("#project-form").reset();
  $("#project-form").hidden = true;
});

$("#project-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const id = form.elements.id.value;
  const originalButtonText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "Saving…";
  $("#project-status").textContent = "Saving project…";

  try {
    const file = form.elements.imageFile.files[0];
    let imageUrl = form.elements.imageUrl.value.trim();

    if (file) {
      $("#project-status").textContent = "Uploading image…";
      const uploaded = await uploadAdminImage(file);
      imageUrl = uploaded.url;
    }

    const payload = {
      title: form.elements.title.value.trim(),
      category: form.elements.category.value.trim(),
      summary: form.elements.summary.value.trim(),
      description: form.elements.description.value.trim(),
      stack: form.elements.stack.value
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      githubUrl: form.elements.githubUrl.value.trim(),
      liveUrl: form.elements.liveUrl.value.trim(),
      imageUrl,
      accessType: form.elements.accessType.value,
      featured: form.elements.featured.checked,
      status: form.elements.status.value,
    };

    $("#project-status").textContent = "Saving project details…";

    await api(id ? `/api/admin/projects/${id}` : "/api/admin/projects", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    });

    form.reset();
    form.hidden = true;

    $("#project-status").textContent = "Project saved successfully.";
    await loadProjects();
    await loadHome();

    // Keep the admin panel on Projects after saving.
    document.querySelectorAll(".admin-view").forEach((view) => {
      view.hidden = view.id !== "view-projects";
    });
    document.querySelectorAll(".admin-nav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === "projects");
    });
  } catch (error) {
    $("#project-status").textContent = `Could not save project: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

// Certificates
async function loadCertificates() {
  certificates = (await api("/api/admin/certificates")).certificates;
  $("#certificate-status").textContent =
    `${certificates.length} certificate${certificates.length === 1 ? "" : "s"}`;

  $("#certificate-list").innerHTML =
    certificates
      .map(
        (certificate) => `
    <article class="project-row">
      <div>
        <strong>${escapeHtml(certificate.title)}</strong>
        <span>
          ${escapeHtml(certificate.issuer)} · ${escapeHtml(certificate.year)}
          · ${escapeHtml(certificate.status)}
        </span>
        <small>Order: ${escapeHtml(certificate.order)}</small>
      </div>
      <div class="form-actions">
        <button class="secondary-button edit-certificate"
          data-id="${escapeHtml(certificate._id)}" type="button">Edit</button>
        <button class="secondary-button delete-certificate"
          data-id="${escapeHtml(certificate._id)}" type="button">Delete</button>
      </div>
    </article>
  `,
      )
      .join("") ||
    '<p class="empty-state">No certificates yet. Add your first one.</p>';

  document.querySelectorAll(".edit-certificate").forEach((button) => {
    button.addEventListener("click", () => editCertificate(button.dataset.id));
  });

  document.querySelectorAll(".delete-certificate").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!confirm("Delete this certificate?")) return;

      try {
        await api(`/api/admin/certificates/${button.dataset.id}`, {
          method: "DELETE",
        });
        await loadCertificates();
        await loadHome();
      } catch (error) {
        $("#certificate-status").textContent = error.message;
      }
    });
  });
}

function editCertificate(id = "") {
  const form = $("#certificate-form");
  const certificate = certificates.find((item) => item._id === id);

  form.hidden = false;
  form.elements.id.value = certificate?._id || "";
  form.elements.title.value = certificate?.title || "";
  form.elements.issuer.value = certificate?.issuer || "";
  form.elements.year.value = certificate?.year || "";
  form.elements.imageUrl.value = certificate?.imageUrl || "";
  form.elements.credentialUrl.value = certificate?.credentialUrl || "";
  form.elements.order.value = certificate?.order ?? 0;
  form.elements.status.value = certificate?.status || "draft";
  form.elements.imageFile.value = "";
  form.elements.imageUrl.value = certificate?.imageUrl || "";
  showImagePreview(
    $("#certificate-image-preview"),
    certificate?.imageUrl || "",
  );
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

$("#new-certificate").addEventListener("click", () => editCertificate());

$("#cancel-certificate").addEventListener("click", () => {
  $("#certificate-form").reset();
  $("#certificate-form").hidden = true;
});

$("#certificate-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('[type="submit"]');
  const id = form.elements.id.value;
  const originalButtonText = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = "Uploading image and saving…";
  $("#certificate-status").textContent = "Saving certificate…";

  try {
    const file = form.elements.imageFile.files[0];
    let imageUrl = form.elements.imageUrl.value.trim();

    if (file) {
      $("#certificate-status").textContent = "Uploading image…";
      const uploaded = await uploadAdminImage(file);
      imageUrl = uploaded.url;
    }

    const payload = {
      title: form.elements.title.value.trim(),
      issuer: form.elements.issuer.value.trim(),
      year: form.elements.year.value.trim(),
      imageUrl,
      credentialUrl: form.elements.credentialUrl.value.trim(),
      order: Number(form.elements.order.value || 0),
      status: form.elements.status.value,
    };

    $("#certificate-status").textContent = "Saving certificate details…";

    await api(
      id ? `/api/admin/certificates/${id}` : "/api/admin/certificates",
      {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      },
    );

    form.reset();
    form.hidden = true;

    $("#certificate-status").textContent = "Certificate saved successfully.";
    await loadCertificates();
    await loadHome();

    document.querySelectorAll(".admin-view").forEach((view) => {
      view.hidden = view.id !== "view-certificates";
    });
    document.querySelectorAll(".admin-nav button").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === "certificates",
      );
    });
  } catch (error) {
    $("#certificate-status").textContent =
      `Could not save certificate: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});

// Profile and skills
async function loadProfile() {
  const { content } = await api("/api/admin/content");
  const form = $("#profile-form");

  renderAdminSkills(content.skills || []);

  for (const name of ["education", "experience"]) {
    form.elements[name].value = (content[name] || []).join("\n");
  }

  for (const name of ["skills", "education", "experience"]) {
    form.elements[name].value = (content[name] || []).join("\n");
  }

  $("#profile-status").textContent = "";
}

$("#profile-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;


  const payload = {
    heroLine: form.elements.heroLine.value,
    about: form.elements.about.value,
    availability: form.elements.availability.value,
    photoUrl: form.elements.photoUrl.value,
    resumeUrl: form.elements.resumeUrl.value,
    github: form.elements.github.value,
    linkedin: form.elements.linkedin.value,
    skills: [
      ...document.querySelectorAll('#admin-skills-list input[name="skill"]'),
    ]
      .map((input) => input.value.trim())
      .filter(Boolean),
    education: form.elements.education.value
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    experience: form.elements.experience.value
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
  };

  const submitButton = form.querySelector('[type="submit"]');
const originalButtonText = submitButton.textContent;

submitButton.disabled = true;
submitButton.textContent = "Saving…";
$("#profile-status").textContent = "Saving profile…";

  try {
    await api("/api/admin/content", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    $("#profile-status").textContent = "Profile saved successfully.";
  } catch (error) {
    $("#profile-status").textContent = error.message;
  }
  finally {
  submitButton.disabled = false;
  submitButton.textContent = originalButtonText;
}
});

api("/api/admin/me").then(showDashboard).catch(showLogin);
