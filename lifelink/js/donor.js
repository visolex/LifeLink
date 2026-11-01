import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    updateEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    getDoc,
    getDocs,
    collection,
    setDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================================
// AUTH GUARD + USER DATA
// ============================================================

let currentUser = null;
let userData = null;

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "../login.html";
        return;
    }

    currentUser = user;

    try {

        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
            console.error("User profile not found.");
            return;
        }

        userData = snapshot.data();

        if (userData.role !== "donor") {
            window.location.href = userData.role === "organizer"
                ? "../organizer/dashboard.html"
                : "../admin/dashboard.html";
            return;
        }

        loadDashboard();
        loadProfile();
        loadDonorPageData();

    } catch (error) {
        console.error("Failed to load user data:", error);
    }
});


// ============================================================
// DASHBOARD
// ============================================================

function loadDashboard() {

    if (!userData) return;

    updateDonorIdentity(userData.fullName);

    const firstName =
        userData.fullName?.split(" ")[0] || "Donor";

    setText("user-name", userData.fullName);
    setText("welcome-name", firstName);

    setText("donor-blood-group", userData.bloodGroup);
    setText("donor-location", userData.location);

    const availability = formatAvailability(
        userData.availability
    );

    setText("donor-availability", availability);

    updateAvailabilityBadge(userData.availability);

    calculateProfileCompletion();
}


// ============================================================
// PROFILE
// ============================================================

function loadProfile() {

    if (!userData) return;

    setValue("profile-full-name", userData.fullName);
    setValue("profile-email", userData.email);
    setValue("profile-phone", userData.phone);
    setValue("profile-location", userData.location);
    setValue("profile-blood-group-input", userData.bloodGroup);
    setValue("profile-availability", userData.availability);

    setText("profile-name", userData.fullName);
    setText(
        "profile-role",
        formatRole(userData.role)
    );

    setText(
        "account-role",
        formatRole(userData.role)
    );

    setText(
        "member-since",
        formatMemberSince(userData.createdAt)
    );

    setText(
        "profile-blood-group",
        userData.bloodGroup
    );

    calculateProfileCompletion();
}


// ============================================================
// SAVE PROFILE
// ============================================================

function attachProfileSaveHandler() {

    const saveProfileButton =
        document.getElementById("save-profile");

    if (!saveProfileButton) return;

    saveProfileButton.addEventListener("click", async () => {

        saveProfileButton.disabled = true;
        saveProfileButton.textContent = "Saving...";

        try {

            if (!currentUser) {
                throw new Error("No authenticated user is available.");
            }

            const fullName =
                document.getElementById("profile-full-name")?.value.trim();

            const email =
                document.getElementById("profile-email")?.value.trim();

            const phone =
                document.getElementById("profile-phone")?.value.trim();

            const location =
                document.getElementById("profile-location")?.value.trim();

            const bloodGroup =
                document.getElementById("profile-blood-group-input")?.value;

            const availability =
                document.getElementById("profile-availability")?.value;

            if (!fullName || !email || !phone || !location ||
                !bloodGroup || !availability) {

                showProfileStatus(
                    "Please complete all required fields."
                );

                return;
            }

            if (email !== currentUser.email) {
                await updateEmail(currentUser, email);
            }

            await updateDoc(
                doc(db, "users", currentUser.uid),
                {
                    fullName,
                    email,
                    phone,
                    location,
                    bloodGroup,
                    availability,
                    updatedAt: serverTimestamp()
                }
            );

            userData.fullName = fullName;
            userData.email = email;
            userData.phone = phone;
            userData.location = location;
            userData.bloodGroup = bloodGroup;
            userData.availability = availability;

            loadDashboard();
            loadProfile();

            showProfileStatus(
                "Profile updated successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Profile update failed:",
                error
            );

            showProfileStatus(
                "Unable to save your changes. Please try again."
            );

        } finally {

            saveProfileButton.disabled = false;
            saveProfileButton.textContent = "Save Changes";
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachProfileSaveHandler);
} else {
    attachProfileSaveHandler();
}


// ============================================================
// HELPERS
// ============================================================

function setText(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.textContent = value || "Not provided";
    }
}


function setValue(id, value) {

    const element =
        document.getElementById(id);

    if (element) {
        element.value = value || "";
    }
}


function formatAvailability(value) {

    switch (value) {

        case "available":
            return "Available";

        case "usually-available":
            return "Usually available";

        case "currently-unavailable":
            return "Currently unavailable";

        default:
            return "Not set";
    }
}


function formatRole(value) {

    switch (value) {

        case "donor":
            return "Donor";

        case "organizer":
            return "Organizer";

        case "admin":
            return "Administrator";

        default:
            return "Unknown";
    }
}


function formatMemberSince(timestamp) {

    if (!timestamp) {
        return "Recently";
    }

    try {

        const date =
            timestamp.toDate
                ? timestamp.toDate()
                : new Date(timestamp);

        return date.toLocaleDateString(
            "en-IN",
            {
                month: "long",
                year: "numeric"
            }
        );

    } catch {
        return "Recently";
    }
}


function updateAvailabilityBadge(value) {

    const elements = [
        document.getElementById("donor-availability"),
        document.getElementById("profile-availability-status")
    ];

    elements.forEach(element => {

        if (!element) return;

        element.classList.remove(
            "available",
            "usually-available",
            "currently-unavailable"
        );

        if (value) {
            element.classList.add(value);
        }
    });
}


function calculateProfileCompletion() {

    if (!userData) return;

    const fields = [
        userData.fullName,
        userData.email,
        userData.phone,
        userData.bloodGroup,
        userData.location,
        userData.availability,
        userData.role
    ];

    const completed =
        fields.filter(Boolean).length;

    const percentage =
        Math.round((completed / fields.length) * 100);

    const progress =
        document.getElementById("profile-progress");

    const progressText =
        document.getElementById("profile-progress-text");

    if (progress) {
        progress.style.width = `${percentage}%`;
    }

    if (progressText) {
        progressText.textContent =
            `${percentage}% complete`;
    }
}


function showProfileStatus(message, type = "error") {

    const status =
        document.getElementById("profile-status");

    if (!status) return;

    status.textContent = message;
    status.className =
        `auth-status ${type}`;
}

// ============================================================
// AVAILABILITY
// ============================================================

const availabilityOptions =
    document.querySelectorAll('input[name="availability"]');

const saveAvailabilityButton =
    document.getElementById("save-availability");

const availabilityStatus =
    document.getElementById("availability-status");

const currentAvailability =
    document.getElementById("current-availability");

const availabilityUpdated =
    document.getElementById("availability-updated");

const availabilityLocation =
    document.getElementById("availability-location");


function showAvailabilityStatus(message, type = "error") {
    if (!availabilityStatus) return;

    availabilityStatus.textContent = message;
    availabilityStatus.className = `auth-status ${type}`;
}


function selectAvailability(value) {

    if (!value) return;

    const input = document.querySelector(
        `input[name="availability"][value="${value}"]`
    );

    if (input) {
        input.checked = true;
    }
}


function formatUpdatedTime(timestamp) {

    if (!timestamp) {
        return "Not updated yet";
    }

    try {

        const date = timestamp.toDate
            ? timestamp.toDate()
            : new Date(timestamp);

        return `Last updated ${date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        })}`;

    } catch {
        return "Last updated recently";
    }
}


// Load availability data once the user is authenticated
onAuthStateChanged(auth, async (user) => {

    if (!user) return;

    // Only run this block on the availability page
    if (!saveAvailabilityButton) return;

    try {

        const userRef = doc(db, "users", user.uid);
        const snapshot = await getDoc(userRef);

        if (!snapshot.exists()) {
            showAvailabilityStatus(
                "Your profile could not be found."
            );
            return;
        }

        const data = snapshot.data();

        selectAvailability(data.availability);

        if (currentAvailability) {
            currentAvailability.textContent =
                formatAvailability(data.availability);
        }

        if (availabilityLocation) {
            availabilityLocation.value =
                data.location || "";
        }

        if (availabilityUpdated) {
            availabilityUpdated.textContent =
                formatUpdatedTime(data.updatedAt);
        }

    } catch (error) {

        console.error(
            "Failed to load availability:",
            error
        );

        showAvailabilityStatus(
            "Unable to load your availability."
        );
    }
});


// Save availability
if (saveAvailabilityButton) {

    saveAvailabilityButton.addEventListener("click", async () => {

        if (!currentUser) {
            showAvailabilityStatus(
                "You must be signed in to update availability."
            );
            return;
        }

        const selected =
            document.querySelector(
                'input[name="availability"]:checked'
            );

        const location =
            availabilityLocation?.value.trim() || "";

        if (!selected) {
            showAvailabilityStatus(
                "Please select your availability."
            );
            return;
        }

        if (!location) {
            showAvailabilityStatus(
                "Please enter your donation location."
            );
            return;
        }

        saveAvailabilityButton.disabled = true;
        saveAvailabilityButton.textContent = "Saving...";

        try {

            await updateDoc(
                doc(db, "users", currentUser.uid),
                {
                    availability: selected.value,
                    location,
                    updatedAt: serverTimestamp()
                }
            );

            // Update local state
            if (userData) {
                userData.availability = selected.value;
                userData.location = location;
                userData.updatedAt = new Date();
            }

            if (currentAvailability) {
                currentAvailability.textContent =
                    formatAvailability(selected.value);
            }

            if (availabilityUpdated) {
                availabilityUpdated.textContent =
                    "Last updated just now";
            }

            showAvailabilityStatus(
                "Availability updated successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Availability update failed:",
                error
            );

            showAvailabilityStatus(
                "Unable to save your availability. Please try again."
            );

        } finally {

            saveAvailabilityButton.disabled = false;
            saveAvailabilityButton.textContent =
                "Save Availability";
        }
    });
}


function updateDonorIdentity(fullName) {

    const displayName =
        fullName?.trim() || currentUser?.displayName?.trim() || "Donor";

    const nameParts =
        displayName.split(/\s+/).filter(Boolean);

    const initials =
        nameParts.length > 1
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
            : nameParts[0][0];

    document.querySelectorAll(".dashboard-user").forEach((userElement) => {
        const nameElement = Array.from(userElement.children).find(
            (child) => !child.classList.contains("dashboard-avatar")
        );

        if (nameElement) {
            nameElement.textContent = displayName;
        }
    });

    document.querySelectorAll(".dashboard-avatar, .profile-avatar").forEach(
        (avatarElement) => {
            avatarElement.textContent = initials.toUpperCase();
        }
    );
}

async function loadDonorPageData() {
    if (!currentUser) return;

    try {
        if (document.getElementById("active-requests") || document.getElementById("donor-request-list")) {
            const requestsSnapshot = await getDocs(collection(db, "bloodRequests"));
            const requests = requestsSnapshot.docs
                .map((item) => ({ id: item.id, ...item.data() }))
                .filter((request) => request.status !== "completed" && request.status !== "cancelled")
                .filter((request) => !request.bloodGroup || request.bloodGroup === userData.bloodGroup);
            const requestsWithResponses = await Promise.all(requests.map(async (request) => {
                const response = await getDoc(doc(db, "bloodRequests", request.id, "responses", currentUser.uid));
                return { ...request, response: response.exists() ? response.data() : null };
            }));
            renderDonorRequests(requestsWithResponses);
        }

        if (document.getElementById("donation-history")) {
            const historySnapshot = await getDocs(collection(db, "donations"));
            const history = historySnapshot.docs
                .map((item) => ({ id: item.id, ...item.data() }))
                .filter((item) => item.donorId === currentUser.uid)
                .sort((a, b) => formatUpdatedTime(b.donatedAt || b.createdAt).localeCompare(formatUpdatedTime(a.donatedAt || a.createdAt)));
            renderDonationHistory(history);
        }
    } catch (error) {
        console.error("Failed to load donor data:", error);
        showProfileStatus("Some donor activity could not be loaded.");
    }
}

function renderDonorRequests(requests) {
    const container = document.getElementById("donor-request-list") || document.getElementById("active-requests");
    if (!container) return;
    ensureDonorRequestFilters(container);
    const location = document.getElementById("donor-request-location")?.value.toLowerCase() || "";
    const urgency = document.getElementById("donor-request-urgency")?.value || "";
    const status = document.getElementById("donor-request-status")?.value || "";
    const filteredRequests = requests.filter((request) => (!location || String(request.location || "").toLowerCase().includes(location)) && (!urgency || request.urgency === urgency) && (!status || (status === "responded" ? request.response : request.status === status)));
    container.innerHTML = "";

    if (!filteredRequests.length) {
        container.innerHTML = `<div class="empty-state"><span class="empty-state-mark" aria-hidden="true">+</span><h3>No matching blood requests.</h3><p>New requests for your blood group will appear here.</p></div>`;
        return;
    }

    filteredRequests.slice(0, document.getElementById("donor-request-list") ? filteredRequests.length : 3).forEach((request) => {
        const card = document.createElement("article");
        card.className = "request-card";
        const responseAction = request.response
            ? `<button class="button button-outline" type="button" data-action="withdraw">Withdraw response</button><span class="status-badge status-neutral">Response: ${escapeHtml(request.response.status || "interested")}</span>`
            : `<button class="button button-primary" type="button" data-action="respond">I can help</button>`;
        card.innerHTML = `<div class="request-card-header"><div><h3>${escapeHtml(request.hospital || "Blood request")}</h3><p class="request-card-subtitle">${escapeHtml(request.location || "Location not provided")}</p></div><div class="request-card-badges"><span class="status-badge status-neutral">${escapeHtml(request.bloodGroup || "Any group")}</span><span class="status-badge status-neutral">${escapeHtml(request.urgency || "Standard")}</span></div></div><div class="request-card-details"><div class="request-detail"><span class="request-detail-label">Units required</span><span class="request-detail-value">${request.unitsRequired || "-"}</span></div><div class="request-detail"><span class="request-detail-label">Required date</span><span class="request-detail-value">${escapeHtml(request.requiredDate || "-" )}</span></div><div class="request-detail"><span class="request-detail-label">Request status</span><span class="request-detail-value">${escapeHtml(request.status || "open")}</span></div></div><div class="request-card-footer"><p class="request-card-meta">${escapeHtml(request.notes || "Please respond if you can help.")}</p>${responseAction}</div>`;
        const action = card.querySelector("[data-action]");
        action.addEventListener("click", () => request.response ? withdrawFromRequest(request.id, card) : respondToRequest(request.id, card));
        container.appendChild(card);
    });
}

async function respondToRequest(requestId, card) {
    const button = card.querySelector("button");
    button.disabled = true;
    button.textContent = "Saving...";
    try {
        await setDoc(doc(db, "bloodRequests", requestId, "responses", currentUser.uid), {
            donorId: currentUser.uid,
            donorName: userData.fullName || "Donor",
            bloodGroup: userData.bloodGroup || "",
            status: "interested",
            createdAt: serverTimestamp()
        }, { merge: true });
        button.textContent = "Response sent";
    } catch (error) {
        console.error("Request response failed:", error);
        button.disabled = false;
        button.textContent = "Try again";
    }
}

async function withdrawFromRequest(requestId, card) {
    const button = card.querySelector("button");
    button.disabled = true;
    button.textContent = "Removing...";
    try {
        await deleteDoc(doc(db, "bloodRequests", requestId, "responses", currentUser.uid));
        await loadDonorPageData();
    } catch (error) {
        console.error("Response withdrawal failed:", error);
        button.disabled = false;
        button.textContent = "Try again";
    }
}

function renderDonationHistory(history) {
    const container = document.getElementById("donation-history");
    if (!container) return;
    if (!history.length) return;
    container.innerHTML = history.slice(0, 5).map((item) => `<div class="request-detail"><span class="request-detail-label">${escapeHtml(item.hospital || "Donation")}</span><span class="request-detail-value">${escapeHtml(item.donatedAt || item.date || "Completed")}</span></div>`).join("");
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function ensureDonorRequestFilters(container) {
    if (document.getElementById("donor-request-filters")) return;
    const toolbar = document.createElement("div");
    toolbar.id = "donor-request-filters";
    toolbar.className = "request-toolbar";
    toolbar.innerHTML = `<div class="form-group"><label for="donor-request-location">Location</label><input class="input" id="donor-request-location" type="search" placeholder="City or area"></div><div class="form-group"><label for="donor-request-urgency">Urgency</label><select class="select" id="donor-request-urgency"><option value="">All urgency levels</option><option value="normal">Normal</option><option value="urgent">Urgent</option><option value="critical">Critical</option></select></div><div class="form-group"><label for="donor-request-status">Response</label><select class="select" id="donor-request-status"><option value="">All requests</option><option value="responded">My responses</option><option value="open">Open</option><option value="in-progress">In progress</option></select></div>`;
    container.before(toolbar);
    toolbar.querySelectorAll("input, select").forEach((control) => control.addEventListener("input", loadDonorPageData));
}