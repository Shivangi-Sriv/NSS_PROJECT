import { auth, db } from "./firebase.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const usersTable = document.getElementById("usersTable");
const adminsTable = document.getElementById("adminsTable");

const userActionHeader = document.getElementById("userActionHeader");
const adminActionHeader = document.getElementById("adminActionHeader");

let currentUserRole = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) return;

  currentUserRole = snap.data().role;

  if (currentUserRole !== "admin" && currentUserRole !== "superadmin") {
    alert("Access denied");
    window.location.href = "user.html";
    return;
  }

  // Hide action columns for non-superadmin
  if (currentUserRole !== "superadmin") {
    userActionHeader.style.display = "none";
    adminActionHeader.style.display = "none";
  }

  loadUsers();
});

async function loadUsers() {
  const snapshot = await getDocs(collection(db, "users"));

  usersTable.innerHTML = "";
  adminsTable.innerHTML = "";

  let userCount = 0;
  let adminCount = 0;

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const uid = docSnap.id;

    // USERS TABLE
    if (user.role === "user") {
      userCount++;

      const row = document.createElement("tr");
      
      const emailCell = document.createElement("td");
      emailCell.textContent = user.email;

      const roleCell = document.createElement("td");
      roleCell.innerHTML = `<span class="role-badge role-user">${user.role}</span>`;

      row.appendChild(emailCell);
      row.appendChild(roleCell);

      if (currentUserRole === "superadmin") {
        const actionCell = document.createElement("td");
        const promoteBtn = document.createElement("button");
        promoteBtn.className = "btn btn-action";
        promoteBtn.textContent = "Promote to Admin";
        promoteBtn.onclick = () => promoteUser(uid);
        actionCell.appendChild(promoteBtn);
        row.appendChild(actionCell);
      }

      usersTable.appendChild(row);
    }

    // ADMINS TABLE
    if (user.role === "admin" || user.role === "superadmin") {
      adminCount++;

      const row = document.createElement("tr");
      
      const emailCell = document.createElement("td");
      emailCell.textContent = user.email;

      const roleCell = document.createElement("td");
      const roleClass = user.role === "superadmin" ? "role-superadmin" : "role-admin";
      roleCell.innerHTML = `<span class="role-badge ${roleClass}">${user.role}</span>`;

      row.appendChild(emailCell);
      row.appendChild(roleCell);

      if (currentUserRole === "superadmin") {
        const actionCell = document.createElement("td");
        if (user.role === "admin") {
          const demoteBtn = document.createElement("button");
          demoteBtn.className = "btn btn-danger";
          demoteBtn.textContent = "Remove Admin";
          demoteBtn.onclick = () => demoteUser(uid);
          actionCell.appendChild(demoteBtn);
        } else {
          actionCell.textContent = "Protected";
          actionCell.style.color = "#999";
          actionCell.style.fontStyle = "italic";
        }
        row.appendChild(actionCell);
      }

      adminsTable.appendChild(row);
    }
  });

  // Update counts
  document.getElementById("user-count").textContent = `${userCount} ${userCount === 1 ? 'user' : 'users'}`;
  document.getElementById("admin-count").textContent = `${adminCount} ${adminCount === 1 ? 'admin' : 'admins'}`;

  if (userCount === 0) {
    usersTable.innerHTML = '<tr><td colspan="3" class="no-data">No regular users found</td></tr>';
  }
  if (adminCount === 0) {
    adminsTable.innerHTML = '<tr><td colspan="3" class="no-data">No administrators found</td></tr>';
  }
}

// Promote user 
window.promoteUser = async (uid) => {
  if (!confirm("Are you sure you want to promote this user to admin?")) return;

  try {
    await updateDoc(doc(db, "users", uid), {
      role: "admin"
    });
    loadUsers();
  } catch (error) {
    alert("Error promoting user: " + error.message);
  }
};

// Demote admin
window.demoteUser = async (uid) => {
  if (!confirm("Are you sure you want to remove admin privileges from this user?")) return;

  try {
    await updateDoc(doc(db, "users", uid), {
      role: "user"
    });
    loadUsers();
  } catch (error) {
    alert("Error demoting admin: " + error.message);
  }
};

window.goBack = () => {
  window.location.href = "admin.html";
};