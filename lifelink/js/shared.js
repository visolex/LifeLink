import { auth, db } from "./firebase.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

export { auth, db, collection, doc, getDoc, getDocs, setDoc, updateDoc, serverTimestamp, signOut };

export function watchRole(requiredRole, onReady) {
    return onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "../login.html";
            return;
        }

        let snapshot;
        try {
            snapshot = await getDoc(doc(db, "users", user.uid));
        } catch (error) {
            console.error("LifeLink auth guard: failed to read the current user profile", {
                collection: "users",
                documentId: user.uid,
                code: error.code,
                message: error.message
            });
            showMessage("admin-status", "Unable to read your LifeLink profile. Check Firestore permissions.");
            return;
        }
        if (!snapshot.exists()) {
            window.location.href = "../login.html";
            return;
        }

        const data = snapshot.data();
        if (requiredRole && data.role !== requiredRole) {
            const destinations = {
                donor: "../donor/dashboard.html",
                organizer: "../organizer/dashboard.html",
                admin: "../admin/dashboard.html"
            };
            window.location.href = destinations[data.role] || "../login.html";
            return;
        }

        await onReady(user, data);
    });
}

export function timestampDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
    const date = timestampDate(value);
    return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recently";
}

export function formatStatus(value) {
    return String(value || "open").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function setText(id, value, fallback = "Not provided") {
    const element = document.getElementById(id);
    if (element) element.textContent = value || fallback;
}

export function showMessage(id, message, type = "error") {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = message;
    element.className = `auth-status ${type}`;
}

export async function readCollection(name) {
    const snapshot = await getDocs(collection(db, name));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function sortNewest(items) {
    return items.sort((a, b) => {
        const first = timestampDate(a.createdAt)?.getTime() || 0;
        const second = timestampDate(b.createdAt)?.getTime() || 0;
        return second - first;
    });
}
