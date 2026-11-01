import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    getDoc,
    addDoc,
    collection,
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