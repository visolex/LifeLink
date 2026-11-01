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
    query,
    where,
    updateDoc,
    setDoc,
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
            window.location.href = organizerData.role === "donor"
                ? "../donor/dashboard.html"
                : "../admin/dashboard.html";
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

        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Create Blood Request";
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
        const requestsWithResponses = await Promise.all(requests.map(async (request) => {
            const responseSnapshot = await getDocs(collection(db, "bloodRequests", request.id, "responses"));
            return {
                ...request,
                responses: responseSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
            };
        }));
        const donorsSnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "donor")));
        const donors = donorsSnapshot.docs.map((item) => item.data()).filter((item) => item.availability !== "currently-unavailable");
        renderDonors(donors);
        setOrganizerText("active-request-count", requestsWithResponses.filter((item) => item.status === "open" || item.status === "in-progress").length);
        setOrganizerText("urgent-request-count", requestsWithResponses.filter((item) => item.urgency === "urgent" && item.status !== "completed" && item.status !== "cancelled").length);
        setOrganizerText("completed-request-count", requestsWithResponses.filter((item) => item.status === "completed").length);
        setOrganizerText("total-request-count", requestsWithResponses.length);
        setOrganizerText("available-donor-count", donors.length);
        renderOrganizerDashboard(requestsWithResponses);
        renderOrganizerRequests(requestsWithResponses);
        renderOrganizerReport(requestsWithResponses);
    } catch (error) {
        console.error("Failed to load organizer data:", error);
        showStatus("Unable to load organizer data.");
    }
}

function renderOrganizerReport(requests) {
    if (!document.getElementById("total-request-count")) return;
    let report = document.getElementById("organizer-report");
    if (!report) {
        report = document.createElement("section");
        report.id = "organizer-report";
        report.className = "dashboard-card organizer-section";
        document.querySelector(".dashboard-main")?.appendChild(report);
    }
    const status = document.getElementById("organizer-report-status")?.value || "";
    const group = document.getElementById("organizer-report-group")?.value || "";
    const from = document.getElementById("organizer-report-from")?.value || "";
    const to = document.getElementById("organizer-report-to")?.value || "";
    const filtered = requests.filter((request) => (!status || request.status === status) && (!group || request.bloodGroup === group) && (!from || String(request.requiredDate || "") >= from) && (!to || String(request.requiredDate || "") <= to));
    const byGroup = countValues(filtered, "bloodGroup");
    const byUrgency = countValues(filtered, "urgency");
    const byStatus = countValues(filtered, "status");
    report.innerHTML = `<div class="section-title-row"><div><p class="eyebrow">Live breakdown</p><h2>Request reports</h2></div></div><div class="request-toolbar"><div class="form-group"><label for="organizer-report-status">Status</label><select class="select" id="organizer-report-status"><option value="">All statuses</option><option value="open">Open</option><option value="in-progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><div class="form-group"><label for="organizer-report-group">Blood group</label><select class="select" id="organizer-report-group"><option value="">All groups</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option><option>O+</option><option>O-</option></select></div><div class="form-group"><label for="organizer-report-from">From</label><input class="input" id="organizer-report-from" type="date"></div><div class="form-group"><label for="organizer-report-to">To</label><input class="input" id="organizer-report-to" type="date"></div></div><div class="request-details-grid"><div class="request-detail"><span class="request-detail-label">Matching requests</span><span class="request-detail-value">${filtered.length}</span></div><div class="request-detail"><span class="request-detail-label">By blood group</span><span class="request-detail-value">${formatCounts(byGroup)}</span></div><div class="request-detail"><span class="request-detail-label">By urgency</span><span class="request-detail-value">${formatCounts(byUrgency)}</span></div><div class="request-detail"><span class="request-detail-label">By status</span><span class="request-detail-value">${formatCounts(byStatus)}</span></div></div>`;
    report.querySelectorAll("select, input").forEach((control) => {
        control.value = control.id === "organizer-report-status" ? status : control.id === "organizer-report-group" ? group : control.id === "organizer-report-from" ? from : to;
        control.addEventListener("input", () => renderOrganizerReport(requests));
        control.addEventListener("change", () => renderOrganizerReport(requests));
    });
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
    container.innerHTML = filtered.length ? filtered.map((item) => `<article class="request-card"><div class="request-card-header"><div><h3>${escapeOrganizer(item.fullName || "Donor")}</h3><p class="request-card-subtitle">${escapeOrganizer(item.location || "Location not provided")}</p></div><span class="status-badge status-neutral">${escapeOrganizer(item.bloodGroup || "-")}</span></div><div class="request-card-details"><div class="request-detail"><span class="request-detail-label">Availability</span><span class="request-detail-value">${escapeOrganizer(item.availability || "-")}</span></div><div class="request-detail"><span class="request-detail-label">Contact</span><span class="request-detail-value">Available through LifeLink coordination</span></div></div></article>`).join("") : `<div class="empty-state"><h3>No matching donors.</h3><p>Try adjusting the filters.</p></div>`;
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
        const editButton = document.createElement("button");
        editButton.className = "button button-outline";
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => showEditRequest(request));
        card.querySelector(".request-card-actions")?.appendChild(editButton);
        const responseButton = document.createElement("button");
        responseButton.className = "button button-outline";
        responseButton.type = "button";
        responseButton.textContent = `Donor responses (${request.responses?.length || 0})`;
        responseButton.addEventListener("click", () => showRequestResponses(request));
        card.querySelector(".request-card-actions")?.appendChild(responseButton);
        container.appendChild(card);
    });
}

async function updateRequestStatus(requestId, statusValue) {
    try {
        await updateDoc(doc(db, "bloodRequests", requestId), { status: statusValue, updatedAt: serverTimestamp() });
        await loadOrganizerData();
        return true;
    } catch (error) {
        console.error("Request status update failed:", error);
        showStatus("Unable to update request status.");
        return false;
    }
}

function showRequestDetails(request) {
    const modal = document.getElementById("request-details-modal");
    if (!modal) return;
    Object.entries(request).forEach(([key, value]) => {
        const element = modal.querySelector(`[data-modal-field="${key}"]`);
        if (element) element.textContent = value?.toDate ? value.toDate().toLocaleDateString("en-IN") : value || "-";
    });
    let statusSelect = modal.querySelector("[data-modal-action='status']");
    if (!statusSelect) {
        statusSelect = document.createElement("select");
        statusSelect.className = "select";
        statusSelect.dataset.modalAction = "status";
        statusSelect.innerHTML = "<option value='open'>Open</option><option value='in-progress'>In progress</option><option value='completed'>Completed</option><option value='cancelled'>Cancelled</option>";
        modal.querySelector(".modal-actions")?.prepend(statusSelect);
    }
    statusSelect.value = request.status || "open";
    const updateButton = modal.querySelector(".modal-actions .button-primary");
    if (updateButton) updateButton.onclick = async () => {
        updateButton.disabled = true;
        updateButton.textContent = "Updating...";
        const updated = await updateRequestStatus(request.id, statusSelect.value);
        if (updated) modal.hidden = true;
        updateButton.disabled = false;
        updateButton.textContent = "Update Status";
    };
    modal.hidden = false;
    modal.querySelectorAll(".modal-close, .modal-actions .button-outline").forEach((button) => button.onclick = () => { modal.hidden = true; });
}

function showEditRequest(request) {
    const modal = document.getElementById("request-details-modal");
    if (!modal) return;
    const heading = modal.querySelector("#request-details-heading");
    const grid = modal.querySelector(".request-details-grid");
    if (heading) heading.textContent = "Edit blood request";
    if (grid) grid.innerHTML = `<div class="form-group"><label for="edit-hospital">Hospital</label><input class="input" id="edit-hospital" value="${escapeOrganizer(request.hospital)}"></div><div class="form-group"><label for="edit-location">Location</label><input class="input" id="edit-location" value="${escapeOrganizer(request.location)}"></div><div class="form-group"><label for="edit-units">Units</label><input class="input" id="edit-units" type="number" min="1" value="${request.unitsRequired || 1}"></div><div class="form-group"><label for="edit-urgency">Urgency</label><select class="select" id="edit-urgency"><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></div><div class="form-group request-details-notes"><label for="edit-notes">Notes</label><textarea class="textarea" id="edit-notes">${escapeOrganizer(request.notes)}</textarea></div>`;
    const urgency = modal.querySelector("#edit-urgency");
    if (urgency) urgency.value = request.urgency || "normal";
    const primary = modal.querySelector(".modal-actions .button-primary");
    if (primary) primary.onclick = async () => {
        const units = Number(modal.querySelector("#edit-units")?.value);
        if (!modal.querySelector("#edit-hospital")?.value.trim() || !modal.querySelector("#edit-location")?.value.trim() || !Number.isInteger(units) || units < 1) return;
        primary.disabled = true;
        primary.textContent = "Saving...";
        try {
            await updateDoc(doc(db, "bloodRequests", request.id), { hospital: modal.querySelector("#edit-hospital").value.trim(), location: modal.querySelector("#edit-location").value.trim(), unitsRequired: units, urgency: urgency.value, notes: modal.querySelector("#edit-notes").value.trim(), updatedAt: serverTimestamp() });
            modal.hidden = true;
            await loadOrganizerData();
        } catch (error) {
            console.error("Request edit failed:", error);
            showStatus("Unable to save request changes.");
        } finally {
            primary.disabled = false;
            primary.textContent = "Update Status";
        }
    };
    modal.querySelectorAll(".modal-close, .modal-actions .button-outline").forEach((button) => button.onclick = () => { modal.hidden = true; });
    modal.hidden = false;
}

function showRequestResponses(request) {
    const modal = document.getElementById("request-details-modal");
    if (!modal) return;
    const heading = modal.querySelector("#request-details-heading");
    const grid = modal.querySelector(".request-details-grid");
    if (heading) heading.textContent = "Donor responses";
    if (grid) grid.innerHTML = request.responses?.length
        ? request.responses.map((response) => `<div class="request-detail"><span class="request-detail-label">${escapeOrganizer(response.donorName || "Donor")}</span><span class="request-detail-value">${escapeOrganizer(response.bloodGroup || "-")} · ${escapeOrganizer(response.status || "interested")} <button class="button button-outline" type="button" data-donation-response="${escapeOrganizer(response.id)}">Mark donated</button></span></div>`).join("")
        : "<p class='empty-state'>No donors have responded yet.</p>";
    modal.hidden = false;
    modal.querySelectorAll(".modal-close, .modal-actions button").forEach((button) => button.onclick = () => { modal.hidden = true; });
    modal.querySelectorAll("[data-donation-response]").forEach((button) => button.addEventListener("click", () => recordDonation(request, button.dataset.donationResponse, button)));
}

async function recordDonation(request, donorId, button) {
    button.disabled = true;
    button.textContent = "Saving...";
    try {
        await setDoc(doc(db, "bloodRequests", request.id, "responses", donorId), {
            status: "donated",
            updatedAt: serverTimestamp()
        }, { merge: true });
        await setDoc(doc(db, "donations", `${request.id}_${donorId}`), {
            donorId,
            requestId: request.id,
            hospital: request.hospital || "",
            location: request.location || "",
            bloodGroup: request.bloodGroup || "",
            donatedAt: serverTimestamp(),
            status: "completed",
            recordedBy: currentUser.uid
        }, { merge: true });
        button.textContent = "Donation recorded";
    } catch (error) {
        console.error("Donation record failed:", error);
        button.disabled = false;
        button.textContent = "Try again";
    }
}

function escapeOrganizer(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

document.querySelectorAll("#request-search, #status-filter, #blood-group-filter, #donor-blood-filter, #donor-location-filter, #donor-availability-filter").forEach((control) => {
    control.addEventListener("input", loadOrganizerData);
    control.addEventListener("change", loadOrganizerData);
});