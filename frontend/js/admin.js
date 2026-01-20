import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Check role
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists() || userSnap.data().role == "user") {
    alert("Access denied");
    window.location.href = "index.html";
    return;
  }

  // Total users
  const usersSnap = await getDocs(collection(db, "users"));
  document.getElementById("totalUsers").innerText = usersSnap.size;

  // Donations with ordering - latest first
  const donationsQuery = query(
    collection(db, "donations"),
    orderBy("createdAt", "desc")
  );
  
  const donationsSnap = await getDocs(donationsQuery);
  document.getElementById("totalDonations").innerText = donationsSnap.size;

  let totalAmount = 0;
  let successfulCount = 0;
  let failedCount = 0;
  let pendingCount = 0;

  const tableBody = document.getElementById("donationTable");
  tableBody.innerHTML = "";

  donationsSnap.forEach((docSnap) => {
    const data = docSnap.data();

    // Count by status
    if (data.status === "success") {
      totalAmount += data.amount;
      successfulCount++;
    } else if (data.status === "failed") {
      failedCount++;
    } else if (data.status === "pending") {
      pendingCount++;
    }

    // Create table row
    const row = document.createElement("tr");

    const userCell = document.createElement("td");
    userCell.innerText = data.userEmail || "N/A";

    const amountCell = document.createElement("td");
    amountCell.innerText = "₹" + data.amount;

    const statusCell = document.createElement("td");
    statusCell.innerText = data.status;
    
    // Color code status
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

    row.appendChild(userCell);
    row.appendChild(amountCell);
    row.appendChild(statusCell);
    row.appendChild(dateCell);

    tableBody.appendChild(row);
  });

  // Update stats
  document.getElementById("successfulDonations").innerText = successfulCount;
  document.getElementById("totalAmount").innerText = totalAmount.toFixed(2);

  // If you have elements for failed and pending counts
  const failedElement = document.getElementById("failedDonations");
  const pendingElement = document.getElementById("pendingDonations");
  
  if (failedElement) {
    failedElement.innerText = failedCount;
  }
  
  if (pendingElement) {
    pendingElement.innerText = pendingCount;
  }

});

// Logout
window.logout = async () => {
  await signOut(auth);
  window.location.href = "index.html";
};