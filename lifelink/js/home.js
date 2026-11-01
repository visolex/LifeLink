import { db } from "./firebase.js";
import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const statElements = {
    donors: document.getElementById("impact-donors"),
    requests: document.getElementById("impact-requests"),
    donations: document.getElementById("impact-donations")
};

async function loadImpactStats() {
    try {
        const [usersSnapshot, requestsSnapshot, donationsSnapshot] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "bloodRequests")),
            getDocs(collection(db, "donations"))
        ]);
        const users = usersSnapshot.docs.map((item) => item.data());
        const requests = requestsSnapshot.docs.map((item) => item.data());
        setStat("donors", users.filter((item) => item.role === "donor").length);
        setStat("requests", requests.length);
        setStat("donations", donationsSnapshot.size || requests.filter((item) => item.status === "completed").length);
    } catch (error) {
        console.error("Unable to load public impact statistics:", error);
        Object.values(statElements).forEach((element) => { if (element) element.textContent = "--"; });
    }
}

function setStat(name, value) {
    const element = statElements[name];
    if (element) element.textContent = value;
}

loadImpactStats();
