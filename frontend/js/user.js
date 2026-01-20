import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Fetch user profile
  const userSnap = await getDoc(doc(db, "users", user.uid));
  document.getElementById("userEmail").innerText =
    userSnap.data().email;

  // Fetch user's donations
  const q = query(
    collection(db, "donations"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const donationSnap = await getDocs(q);

  // Count total and successful donations
  let successfulCount = 0;
  donationSnap.forEach((docSnap) => {
    if (docSnap.data().status === "success") {
      successfulCount++;
    }
  });

  // Update stats
  document.getElementById("donationCount").innerText = donationSnap.size;
  document.getElementById("successfulDonationCount").innerText = successfulCount;

  // Populate table
  const tableBody = document.getElementById("donationTable");
  tableBody.innerHTML = "";

  if (donationSnap.empty) {
    tableBody.innerHTML = '<tr><td colspan="3" class="no-data">No donations yet</td></tr>';
    return;
  }

  donationSnap.forEach((docSnap) => {
    const data = docSnap.data();

    const row = document.createElement("tr");

    const amountCell = document.createElement("td");
    amountCell.innerText = "₹" + data.amount;

    const statusCell = document.createElement("td");
    statusCell.innerText = data.status;
    const statusColor =
        data.status === "success" ? "green" :
        data.status === "failed" ? "red" :
        data.status === "cancelled" ? "gray" :
        "orange";
    statusCell.style.color = statusColor;
    statusCell.style.fontWeight = "600";

    const dateCell = document.createElement("td");
    dateCell.innerText = data.createdAt
      ? data.createdAt.toDate().toLocaleString()
      : "-";

    row.appendChild(amountCell);
    row.appendChild(statusCell);
    row.appendChild(dateCell);

    tableBody.appendChild(row);
  });
});

// Navigation
window.goToDonate = () => {
  window.location.href = "donate.html";
};

window.logout = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};