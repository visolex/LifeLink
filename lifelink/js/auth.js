import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    doc,
    setDoc,
    serverTimestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


// ============================================================
// REGISTER
// ============================================================

const registerForm = document.getElementById("register-form");
const registerStatus = document.getElementById("register-status");

function showRegisterStatus(message, type = "error") {
    if (!registerStatus) return;

    registerStatus.textContent = message;
    registerStatus.className = `auth-status ${type}`;
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() || "";
}

function clearRegisterErrors() {
    document.querySelectorAll(".field-error").forEach(error => {
        error.textContent = "";
    });
}

function showFieldError(id, message) {
    const error = document.querySelector(
        `[data-error-for="${id}"]`
    );

    if (error) {
        error.textContent = message;
    }
}

function validateRegisterForm() {

    clearRegisterErrors();
    showRegisterStatus("");

    const fullName = getValue("full-name");
    const email = getValue("email");
    const phone = getValue("phone");
    const password = getValue("password");
    const confirmPassword = getValue("confirm-password");
    const bloodGroup = getValue("blood-group");
    const location = getValue("location");
    const availability = getValue("availability");

    const role =
        document.querySelector('input[name="role"]:checked')?.value || "";

    let valid = true;

    if (!fullName) {
        showFieldError("full-name", "Please enter your full name.");
        valid = false;
    }

    if (!email) {
        showFieldError("email", "Please enter your email address.");
        valid = false;
    }

    if (!phone) {
        showFieldError("phone", "Please enter your phone number.");
        valid = false;
    }

    if (password.length < 8) {
        showFieldError(
            "password",
            "Password must contain at least 8 characters."
        );
        valid = false;
    }

    if (password !== confirmPassword) {
        showFieldError(
            "confirm-password",
            "Passwords do not match."
        );
        valid = false;
    }

    if (!bloodGroup) {
        showFieldError(
            "blood-group",
            "Please select your blood group."
        );
        valid = false;
    }

    if (!location) {
        showFieldError(
            "location",
            "Please enter your location."
        );
        valid = false;
    }

    if (!availability) {
        showFieldError(
            "availability",
            "Please select your availability."
        );
        valid = false;
    }

    if (!role) {
        showFieldError(
            "role-options",
            "Please select how you want to join LifeLink."
        );
        valid = false;
    }

    return {
        valid,
        data: {
            fullName,
            email,
            phone,
            password,
            bloodGroup,
            location,
            availability,
            role
        }
    };
}


if (registerForm) {

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const result = validateRegisterForm();

        if (!result.valid) {
            showRegisterStatus("Please fix the highlighted fields.");
            return;
        }

        const submitButton =
            registerForm.querySelector('button[type="submit"]');

        submitButton.disabled = true;
        submitButton.textContent = "Creating Account...";

        try {

            const {
                fullName,
                email,
                phone,
                password,
                bloodGroup,
                location,
                availability,
                role
            } = result.data;

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            await setDoc(
                doc(db, "users", user.uid),
                {
                    uid: user.uid,
                    fullName,
                    email: user.email,
                    phone,
                    bloodGroup,
                    location,
                    availability,
                    role,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                }
            );

            showRegisterStatus(
                "Account created successfully. Redirecting...",
                "success"
            );

            registerForm.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);

        } catch (error) {

            console.error("Registration error:", error);

            let message = "Unable to create your account.";

            switch (error.code) {

                case "auth/email-already-in-use":
                    message =
                        "An account with this email already exists.";
                    break;

                case "auth/invalid-email":
                    message =
                        "Please enter a valid email address.";
                    break;

                case "auth/weak-password":
                    message =
                        "Your password is too weak.";
                    break;

                case "auth/network-request-failed":
                    message =
                        "Network error. Please check your connection.";
                    break;

                case "auth/operation-not-allowed":
                    message =
                        "Email/password authentication is not enabled.";
                    break;
            }

            showRegisterStatus(message);

            submitButton.disabled = false;
            submitButton.textContent = "Create Account";
        }
    });
}


// ============================================================
// LOGIN
// ============================================================

const loginForm = document.getElementById("login-form");
const loginStatus = document.getElementById("login-status");


function showLoginStatus(message, type = "error") {
    if (!loginStatus) return;

    loginStatus.textContent = message;
    loginStatus.className = `auth-status ${type}`;
}


if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const email =
            document.getElementById("email")?.value.trim();

        const password =
            document.getElementById("password")?.value || "";

        if (!email || !password) {
            showLoginStatus(
                "Please enter your email and password."
            );
            return;
        }

        const submitButton =
            loginForm.querySelector('button[type="submit"]');

        submitButton.disabled = true;
        submitButton.textContent = "Signing In...";

        try {

            // Authenticate with Firebase
            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;

            // Get LifeLink profile
            const userDocument =
                await getDoc(
                    doc(db, "users", user.uid)
                );

            if (!userDocument.exists()) {

                showLoginStatus(
                    "Your account profile could not be found."
                );

                submitButton.disabled = false;
                submitButton.textContent = "Sign In";

                return;
            }

            const userData = userDocument.data();

            showLoginStatus(
                "Signed in successfully. Redirecting...",
                "success"
            );

            // Role-based redirect
            setTimeout(() => {

                switch (userData.role) {

                    case "donor":
                        window.location.href =
                            "donor/dashboard.html";
                        break;

                    case "organizer":
                        window.location.href =
                            "organizer/dashboard.html";
                        break;

                    case "admin":
                        window.location.href =
                            "admin/dashboard.html";
                        break;

                    default:
                        showLoginStatus(
                            "Your account has an invalid role."
                        );

                        submitButton.disabled = false;
                        submitButton.textContent = "Sign In";
                }

            }, 800);

        } catch (error) {

            console.error("Login error:", error);

            let message =
                "Unable to sign in. Please try again.";

            switch (error.code) {

                case "auth/invalid-email":
                    message =
                        "Please enter a valid email address.";
                    break;

                case "auth/invalid-credential":
                    message =
                        "Incorrect email or password.";
                    break;

                case "auth/user-disabled":
                    message =
                        "This account has been disabled.";
                    break;

                case "auth/network-request-failed":
                    message =
                        "Network error. Please check your connection.";
                    break;

                case "auth/too-many-requests":
                    message =
                        "Too many attempts. Please try again later.";
                    break;
            }

            showLoginStatus(message);

            submitButton.disabled = false;
            submitButton.textContent = "Sign In";
        }
    });
}