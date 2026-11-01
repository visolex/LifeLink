import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    getDoc,
    addDoc,
    collection,
    getDocs,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const form = document.getElementById("request-form");
const status = document.getElementById("request-status");
const submitButton = document.getElementById("create-request");

let currentUser = null;
let organizerData = null;


// ------------------------------------------------------------
// MESSAGE
// ------------------------------------------------------------

function showStatus(message, type = "error") {
    if (!status) return;

    status.textContent = message;
    status.className = `auth-status ${type}`;
}


// ------------------------------------------------------------
// AUTHENTICATION + ORGANIZER CHECK
// ------------------------------------------------------------

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    currentUser = user;

    try {

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            showStatus("Your account profile could not be found.");
            return;
        }

        organizerData = userSnap.data();

        if (organizerData.role !== "organizer") {
            showStatus(
                "Only organizer accounts can create blood requests."
            );

            if (submitButton) {
                submitButton.disabled = true;
            }
            return;
        }

        updateOrganizerIdentity(organizerData.fullName);
        loadOrganizerData();

        // Pre-fill organization/contact details if available
        const organizationField =
            document.getElementById("organization-name");

        const contactPersonField =
            document.getElementById("contact-person");

        const contactPhoneField =
            document.getElementById("contact-phone");

        if (
            organizationField &&
            !organizationField.value &&
            organizerData.organizationName
        ) {
            organizationField.value =
                organizerData.organizationName;
        }

        if (
            contactPersonField &&
            !contactPersonField.value
        ) {
            contactPersonField.value =
                organizerData.fullName || "";
        }

        if (
            contactPhoneField &&
            !contactPhoneField.value
        ) {
            contactPhoneField.value =
                organizerData.phone || "";
        }

    } catch (error) {

        console.error(
            "Organizer verification failed:",
            error
        );

        showStatus(
            "Unable to verify your organizer account."
        );
    }
});


// ------------------------------------------------------------
// CREATE REQUEST
// ------------------------------------------------------------

if (form) {

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (!currentUser) {
            showStatus("Please sign in again.");
            return;
        }

        if (
            !organizerData ||
            organizerData.role !== "organizer"
        ) {
            showStatus(
                "You do not have permission to create requests."
            );
            return;
        }


        const bloodGroup =
            document.getElementById(
                "request-blood-group"
            )?.value.trim();

        const unitsRequired =
            Number(
                document.getElementById(
                    "units-required"
                )?.value
            );

        const urgency =
            document.getElementById(
                "request-urgency"
            )?.value;

        const requiredDate =
            document.getElementById(
                "required-date"
            )?.value;

        const hospital =
            document.getElementById(
                "request-hospital"
            )?.value.trim();

        const location =
            document.getElementById(
                "request-location"
            )?.value.trim();

        const organizationName =
            document.getElementById(
                "organization-name"
            )?.value.trim();

        const contactPerson =
            document.getElementById(
                "contact-person"
            )?.value.trim();

        const contactPhone =
            document.getElementById(
                "contact-phone"
            )?.value.trim();

        const notes =
            document.getElementById(
                "request-notes"
            )?.value.trim();


        // ------------------------------------------------------
        // VALIDATION
        // ------------------------------------------------------

        if (!bloodGroup) {
            showStatus("Please select a blood group.");
            return;
        }

        if (!Number.isInteger(unitsRequired) || unitsRequired < 1) {
            showStatus("Units required must be at least 1.");
            return;
        }

        if (!urgency) {
            showStatus("Please select the urgency.");
            return;
        }

        if (!requiredDate) {
            showStatus("Please select the required date.");
            return;
        }

        if (!hospital) {
            showStatus("Please enter the hospital name.");
            return;
        }

        if (!location) {
            showStatus("Please enter the location.");
            return;
        }

        if (!organizationName) {
            showStatus("Please enter the organization name.");
            return;
        }

        if (!contactPerson) {
            showStatus("Please enter the contact person.");
            return;
        }

        if (!contactPhone) {
            showStatus("Please enter the contact phone.");
            return;
        }


        // ------------------------------------------------------
        // SAVE
        // ------------------------------------------------------

        submitButton.disabled = true;
        submitButton.textContent = "Creating Request...";

        try {

            const requestData = {
                organizerId: currentUser.uid,

                organizationName,
                contactPerson,
                contactPhone,

                bloodGroup,
                unitsRequired,
                urgency,
                requiredDate,

                hospital,
                location,
                notes,

                status: "open",

                createdAt: serverTimestamp()
            };


            const requestRef = await addDoc(
                collection(db, "bloodRequests"),
                requestData
            );


            console.log(
                "Blood request created:",
                requestRef.id
            );


            showStatus(
                "Blood request created successfully.",
                "success"
            );


            form.reset();


        } catch (error) {

            console.error(
                "Create request failed:",
                error
            );

            let message =
                "Unable to create the blood request.";

            if (error.code === "permission-denied") {
                message =
                    "You do not have permission to create blood requests.";
            }

            if (error.code === "network-request-failed") {
                message =
                    "Network error. Please check your connection.";
            }

            showStatus(message);

            submitButton.disabled = false;
            submitButton.textContent =
                "Create Blood Request";
        }
    });
}

async function loadOrganizerData() {
    if (!currentUser) return;
    try {
        const snapshot = await getDocs(collection(db, "bloodRequests"));
        const requests = snapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .filter((request) => request.organizerId === currentUser.uid)
            .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
        const donorsSnapshot = await getDocs(collection(db, "users"));
        const donors = donorsSnapshot.docs.map((item) => item.data()).filter((item) => item.role === "donor" && item.availability !== "currently-unavailable");
        renderDonors(donors);
        setOrganizerText("active-request-count", requests.filter((item) => item.status === "open" || item.status === "in-progress").length);
        setOrganizerText("urgent-request-count", requests.filter((item) => item.urgency === "urgent" && item.status !== "completed" && item.status !== "cancelled").length);
        setOrganizerText("completed-request-count", requests.filter((item) => item.status === "completed").length);
        setOrganizerText("total-request-count", requests.length);
        setOrganizerText("available-donor-count", donors.length);
        renderOrganizerDashboard(requests);
        renderOrganizerRequests(requests);
        renderOrganizerReport(requests);
    } catch (error) {
        console.error("Failed to load organizer data:", error);
        showStatus("Unable to load organizer data.");
    }
}

function renderOrganizerReport(requests) {
    if (document.getElementById("organizer-report") || !document.getElementById("total-request-count")) return;
    const report = document.createElement("section");
    report.id = "organizer-report";
    report.className = "dashboard-card organizer-section";
    const byGroup = countValues(requests, "bloodGroup");
    const byUrgency = countValues(requests, "urgency");
    const byStatus = countValues(requests, "status");
    report.innerHTML = `<div class="section-title-row"><div><p class="eyebrow">Live breakdown</p><h2>Request reports</h2></div></div><div class="request-details-grid"><div class="request-detail"><span class="request-detail-label">By blood group</span><span class="request-detail-value">${formatCounts(byGroup)}</span></div><div class="request-detail"><span class="request-detail-label">By urgency</span><span class="request-detail-value">${formatCounts(byUrgency)}</span></div><div class="request-detail"><span class="request-detail-label">By status</span><span class="request-detail-value">${formatCounts(byStatus)}</span></div></div>`;
    document.querySelector(".dashboard-main")?.appendChild(report);
}

function countValues(items, field) {
    return items.reduce((counts, item) => { const key = item[field] || "Not set"; counts[key] = (counts[key] || 0) + 1; return counts; }, {});
}

function formatCounts(counts) {
    const values = Object.entries(counts);
    return values.length ? values.map(([key, value]) => `${escapeOrganizer(key)}: ${value}`).join(" · ") : "No data yet";
}

function renderDonors(donors) {
    const container = document.getElementById("donor-list");
    if (!container) return;
    const blood = document.getElementById("donor-blood-filter")?.value || "";
    const location = document.getElementById("donor-location-filter")?.value.toLowerCase() || "";
    const availability = document.getElementById("donor-availability-filter")?.value || "";
    const filtered = donors.filter((item) => (!blood || item.bloodGroup === blood) && (!location || String(item.location || "").toLowerCase().includes(location)) && (!availability || item.availability === availability));
    container.innerHTML = filtered.length ? filtered.map((item) => `<article class="request-card"><div class="request-card-header"><div><h3>${escapeOrganizer(item.fullName || "Donor")}</h3><p class="request-card-subtitle">${escapeOrganizer(item.location || "Location not provided")}</p></div><span class="status-badge status-neutral">${escapeOrganizer(item.bloodGroup || "-")}</span></div><div class="request-card-details"><div class="request-detail"><span class="request-detail-label">Availability</span><span class="request-detail-value">${escapeOrganizer(item.availability || "-")}</span></div><div class="request-detail"><span class="request-detail-label">Contact</span><span class="request-detail-value">${escapeOrganizer(item.phone || "Not provided")}</span></div></div></article>`).join("") : `<div class="empty-state"><h3>No matching donors.</h3><p>Try adjusting the filters.</p></div>`;
}

function updateOrganizerIdentity(fullName) {
    const name = fullName || "Organizer";
    document.querySelectorAll("#user-name, #welcome-name").forEach((element) => {
        element.textContent = element.id === "welcome-name" ? name.split(" ")[0] : name;
    });
    document.querySelectorAll(".dashboard-user").forEach((element) => {
        const nameElement = Array.from(element.children).find((child) => !child.classList.contains("dashboard-avatar"));
        if (nameElement) nameElement.textContent = name;
    });
}

function setOrganizerText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function renderOrganizerDashboard(requests) {
    const recent = document.getElementById("recent-requests");
    const urgent = document.getElementById("urgent-requests");
    if (recent && requests.length) recent.innerHTML = requests.slice(0, 5).map((item) => `<p><strong>${escapeOrganizer(item.hospital)}</strong> · ${escapeOrganizer(item.bloodGroup)} · ${escapeOrganizer(item.status)}</p>`).join("");
    const urgentRequests = requests.filter((item) => item.urgency === "urgent" && item.status !== "completed" && item.status !== "cancelled");
    if (urgent && urgentRequests.length) urgent.innerHTML = urgentRequests.map((item) => `<p><strong>${escapeOrganizer(item.hospital)}</strong> needs ${item.unitsRequired || ""} unit(s) of ${escapeOrganizer(item.bloodGroup)}.</p>`).join("");
}

function renderOrganizerRequests(requests) {
    const container = document.getElementById("organizer-request-list");
    if (!container) return;
    const template = document.getElementById("request-card-template");
    if (!template) return;
    const search = document.getElementById("request-search")?.value.toLowerCase() || "";
    const statusFilter = document.getElementById("status-filter")?.value || "";
    const bloodFilter = document.getElementById("blood-group-filter")?.value || "";
    const filtered = requests.filter((item) => `${item.hospital} ${item.location}`.toLowerCase().includes(search) && (!statusFilter || item.status === statusFilter) && (!bloodFilter || item.bloodGroup === bloodFilter));
    container.innerHTML = "";
    if (!filtered.length) {
        container.innerHTML = `<div class="empty-state"><span class="empty-state-mark" aria-hidden="true">+</span><h3>No matching requests.</h3><p>Create or adjust the filters to see requests.</p></div>`;
        return;
    }
    filtered.forEach((request) => {
        const card = template.content.cloneNode(true);
        card.querySelector('[data-field="hospital"]').textContent = request.hospital || "Blood request";
        card.querySelector('[data-field="location"]').textContent = request.location || "Location not provided";
        card.querySelector('[data-field="bloodGroup"]').textContent = request.bloodGroup || "-";
        card.querySelector('[data-field="urgency"]').textContent = request.urgency || "-";
        card.querySelector('[data-field="unitsRequired"]').textContent = request.unitsRequired || "-";
        card.querySelector('[data-field="requiredDate"]').textContent = request.requiredDate || "-";
        card.querySelector('[data-field="organizationName"]').textContent = request.organizationName || "-";
        card.querySelector('[data-field="status"]').textContent = request.status || "open";
        card.querySelector('[data-field="createdAt"]').textContent = request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString("en-IN") : "Recently";
        const select = card.querySelector('[data-action="update-status"]');
        select.value = request.status || "open";
        select.addEventListener("change", () => updateRequestStatus(request.id, select.value));
        card.querySelector('[data-action="view-details"]').addEventListener("click", () => showRequestDetails(request));
        container.appendChild(card);
    });
}

async function updateRequestStatus(requestId, statusValue) {
    try {
        await updateDoc(doc(db, "bloodRequests", requestId), { status: statusValue, updatedAt: serverTimestamp() });
        await loadOrganizerData();
    } catch (error) {
        console.error("Request status update failed:", error);
        showStatus("Unable to update request status.");
    }
}

function showRequestDetails(request) {
    const modal = document.getElementById("request-details-modal");
    if (!modal) return;
    Object.entries(request).forEach(([key, value]) => {
        const element = modal.querySelector(`[data-modal-field="${key}"]`);
        if (element) element.textContent = value?.toDate ? value.toDate().toLocaleDateString("en-IN") : value || "-";
    });
    modal.hidden = false;
    modal.querySelectorAll(".modal-close, .modal-actions .button-outline").forEach((button) => button.onclick = () => { modal.hidden = true; });
}

function escapeOrganizer(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

document.querySelectorAll("#request-search, #status-filter, #blood-group-filter, #donor-blood-filter, #donor-location-filter, #donor-availability-filter").forEach((control) => control.addEventListener("input", loadOrganizerData));