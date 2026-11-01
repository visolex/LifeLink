import {
    auth,
    db,
    collection,
    getDocs,
    updateDoc,
    doc,
    watchRole,
    formatStatus,
    formatDate,
    showMessage
} from "./shared.js";

let users = [];
let requests = [];
let usersLoadError = null;

watchRole("admin", async (user, profile) => {
    document.querySelectorAll("#user-name, #welcome-name").forEach((element) => { element.textContent = element.id === "welcome-name" ? (profile.fullName || "Administrator").split(" ")[0] : profile.fullName || "Administrator"; });
    setAdminStatus("Loading dashboard data...", "loading");
    setStatsLoading();

    try {
        const userSnapshot = await getDocs(collection(db, "users"));
        users = userSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
        usersLoadError = null;
        console.info("LifeLink admin: loaded user profiles", { collection: "users", count: users.length });
        console.table(users.map((item) => ({ id: item.id, role: item.role || "missing", name: item.fullName || "" })));
    } catch (error) {
        users = [];
        usersLoadError = error;
        console.error("LifeLink admin: failed to read users collection", {
            collection: "users",
            code: error.code,
            message: error.message,
            hint: "Check Firestore rules for admin read access to users/{uid} documents."
        });
    }

    try {
        const requestSnapshot = await getDocs(collection(db, "bloodRequests"));
        requests = requestSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
        requests = [];
        console.error("LifeLink admin: failed to read bloodRequests collection", {
            collection: "bloodRequests",
            code: error.code,
            message: error.message
        });
    }

    render();
    if (usersLoadError) {
        setAdminStatus(`Unable to load users: ${formatFirebaseError(usersLoadError)}`, "error");
    } else if (!users.length) {
        setAdminStatus("No user profiles found in the users collection.", "empty");
    } else {
        setAdminStatus(`${users.length} user profile${users.length === 1 ? "" : "s"} loaded.`, "success");
    }
});

function render() {
    setText("total-user-count", usersLoadError ? "—" : users.length);
    setText("donor-count", usersLoadError ? "—" : users.filter((item) => item.role === "donor").length);
    setText("organizer-count", usersLoadError ? "—" : users.filter((item) => item.role === "organizer").length);
    setText("request-count", requests.length);
    setText("open-request-count", requests.filter((item) => item.status === "open" || item.status === "in-progress").length);
    ensureAdminFilters();
    const userList = document.getElementById("admin-user-list");
        const userSearch = document.getElementById("admin-user-search")?.value.toLowerCase() || "";
        const userRole = document.getElementById("admin-user-role")?.value || "";
        const visibleUsers = users.filter((item) => `${item.fullName || ""} ${item.email || ""}`.toLowerCase().includes(userSearch) && (!userRole || item.role === userRole));
        if (userList) userList.innerHTML = visibleUsers.map((item) => `<tr><td>${escapeHtml(item.fullName || "Unnamed")}</td><td>${escapeHtml(item.email || "-")}</td><td><select class="select" data-user-id="${item.id}"><option value="donor" ${item.role === "donor" ? "selected" : ""}>Donor</option><option value="organizer" ${item.role === "organizer" ? "selected" : ""}>Organizer</option><option value="admin" ${item.role === "admin" ? "selected" : ""}>Administrator</option></select></td><td>${escapeHtml(item.location || "-")}</td></tr>`).join("") || emptyRow(4, "No users match these filters.");
        userList?.querySelectorAll("select[data-user-id]").forEach((select) => select.addEventListener("change", async () => {
            try {
                await updateDoc(doc(db, "users", select.dataset.userId), { role: select.value });
                showMessage("admin-status", "User role updated.", "success");
            } catch (error) {
                console.error("User role update failed:", error);
                showMessage("admin-status", "Unable to update the user role.");
            }
        }));
    const requestList = document.getElementById("admin-request-list");
    const requestBlood = document.getElementById("admin-request-blood")?.value || "";
    const requestStatus = document.getElementById("admin-request-status")?.value || "";
    const visibleRequests = requests.filter((item) => (!requestBlood || item.bloodGroup === requestBlood) && (!requestStatus || item.status === requestStatus));
    if (requestList) requestList.innerHTML = visibleRequests.map((item) => `<tr><td>${escapeHtml(item.hospital || "-")}</td><td>${escapeHtml(item.bloodGroup || "-")}</td><td>${escapeHtml(item.organizationName || "-")}</td><td><select class="select" data-request-id="${item.id}"><option value="open" ${item.status === "open" ? "selected" : ""}>Open</option><option value="in-progress" ${item.status === "in-progress" ? "selected" : ""}>In Progress</option><option value="completed" ${item.status === "completed" ? "selected" : ""}>Completed</option><option value="cancelled" ${item.status === "cancelled" ? "selected" : ""}>Cancelled</option></select></td><td>${formatDate(item.createdAt)}</td></tr>`).join("") || emptyRow(5, "No requests match these filters.");
    requestList?.querySelectorAll("select[data-request-id]").forEach((select) => select.addEventListener("change", async () => { await updateDoc(doc(db, "bloodRequests", select.dataset.requestId), { status: select.value }); showMessage("admin-status", "Request status updated.", "success"); }));
    renderAdminReport();
}

function ensureAdminFilters() {
    const userList = document.getElementById("admin-user-list");
    if (userList && !document.getElementById("admin-user-search")) {
        if (!document.getElementById("admin-status")) {
            const status = document.createElement("p");
            status.id = "admin-status";
            status.className = "auth-status";
            status.setAttribute("role", "status");
            status.setAttribute("aria-live", "polite");
            userList.closest(".dashboard-card")?.before(status);
        }
        const toolbar = document.createElement("div");
        toolbar.className = "request-toolbar";
        toolbar.innerHTML = `<div class="form-group"><label for="admin-user-search">Search users</label><input class="input" id="admin-user-search" type="search" placeholder="Name or email"></div><div class="form-group"><label for="admin-user-role">Role</label><select class="select" id="admin-user-role"><option value="">All roles</option><option value="donor">Donor</option><option value="organizer">Organizer</option><option value="admin">Administrator</option></select></div>`;
        userList.closest(".dashboard-card")?.before(toolbar);
        toolbar.querySelectorAll("input, select").forEach((control) => control.addEventListener("input", render));
    }
    const requestList = document.getElementById("admin-request-list");
    if (requestList && !document.getElementById("admin-request-blood")) {
        const toolbar = document.createElement("div");
        toolbar.className = "request-toolbar";
        toolbar.innerHTML = `<div class="form-group"><label for="admin-request-blood">Blood group</label><select class="select" id="admin-request-blood"><option value="">All groups</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div><div class="form-group"><label for="admin-request-status">Status</label><select class="select" id="admin-request-status"><option value="">All statuses</option><option value="open">Open</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>`;
        requestList.closest(".dashboard-card")?.before(toolbar);
        toolbar.querySelectorAll("select").forEach((control) => control.addEventListener("input", render));
    }
}

function renderAdminReport() {
    if (document.getElementById("admin-report") || !document.getElementById("request-count")) return;
    const report = document.createElement("section");
    report.id = "admin-report";
    report.className = "dashboard-card organizer-section";
    report.innerHTML = `<div class="section-title-row"><div><p class="eyebrow">Live breakdown</p><h2>Platform reports</h2></div></div><div class="request-details-grid"><div class="request-detail"><span class="request-detail-label">Users by role</span><span class="request-detail-value">${formatAdminCounts(users, "role")}</span></div><div class="request-detail"><span class="request-detail-label">Requests by blood group</span><span class="request-detail-value">${formatAdminCounts(requests, "bloodGroup")}</span></div><div class="request-detail"><span class="request-detail-label">Requests by urgency</span><span class="request-detail-value">${formatAdminCounts(requests, "urgency")}</span></div><div class="request-detail"><span class="request-detail-label">Requests by status</span><span class="request-detail-value">${formatAdminCounts(requests, "status")}</span></div></div>`;
    document.querySelector(".dashboard-main")?.appendChild(report);
}

function formatAdminCounts(items, field) {
    const counts = items.reduce((result, item) => { const key = item[field] || "Not set"; result[key] = (result[key] || 0) + 1; return result; }, {});
    return Object.entries(counts).map(([key, value]) => `${escapeHtml(key)}: ${value}`).join(" · ") || "No data yet";
}

function setStatsLoading() {
    ["total-user-count", "donor-count", "organizer-count", "request-count", "open-request-count"].forEach((id) => setText(id, "Loading..."));
}

function setAdminStatus(message, type) {
    let status = document.getElementById("admin-status");
    if (!status) {
        status = document.createElement("p");
        status.id = "admin-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        document.querySelector(".dashboard-header")?.after(status);
    }
    status.textContent = message;
    status.className = `auth-status ${type}`;
}

function formatFirebaseError(error) {
    if (error?.code === "permission-denied") return "Firestore permission denied";
    if (error?.code === "failed-precondition") return "Firestore is not ready or requires an index";
    if (error?.code === "unavailable") return "Firestore is temporarily unavailable";
    return "Firestore request failed";
}

function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
function emptyRow(columns, text) { return `<tr><td colspan="${columns}">${text}</td></tr>`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
