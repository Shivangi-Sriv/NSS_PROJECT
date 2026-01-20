import { auth, db } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Show error message
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 5000);
  } else {
    alert(message);
  }
}

// Show success message
function showSuccess(message) {
  const errorDiv = document.getElementById("error-message");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.className = "success-message";
    errorDiv.style.display = "block";
    setTimeout(() => {
      errorDiv.style.display = "none";
      errorDiv.className = "error-message";
    }, 3000);
  }
}

// Disable buttons during processing
function setButtonsLoading(isLoading) {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.disabled = isLoading;
    if (isLoading) {
      btn.style.opacity = '0.6';
      btn.style.cursor = 'not-allowed';
    } else {
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
    }
  });
}

// REGISTER (only as user)
window.register = async () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Email and password are required");
    return;
  }

  if (password.length < 6) {
    showError("Password must be at least 6 characters");
    return;
  }

  setButtonsLoading(true);

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email: email,
      role: "user",
      createdAt: new Date()
    });

    showSuccess("Registration successful! Please login.");

    emailInput.value = "";
    passwordInput.value = "";

  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      showError("This email is already registered. Please login.");
    } else if (err.code === 'auth/invalid-email') {
      showError("Invalid email address.");
    } else if (err.code === 'auth/weak-password') {
      showError("Password is too weak. Use at least 6 characters.");
    } else {
      showError(err.message);
    }
  } finally {
    setButtonsLoading(false);
  }
};

// LOGIN (user or admin)
window.login = async () => {
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Email and password are required");
    return;
  }

  setButtonsLoading(true);

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    const userDoc = await getDoc(doc(db, "users", cred.user.uid));

    if (!userDoc.exists()) {
      showError("User profile not found");
      setButtonsLoading(false);
      return;
    }

    const role = userDoc.data().role;

    if (role === "admin" || role === "superadmin") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user.html";
    }

  } catch (err) {
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      showError("Invalid email or password");
    } else if (err.code === 'auth/user-not-found') {
      showError("No account found with this email");
    } else if (err.code === 'auth/too-many-requests') {
      showError("Too many failed attempts. Please try again later.");
    } else {
      showError(err.message);
    }
    setButtonsLoading(false);
  }
};

// Enter key to submit
document.addEventListener('DOMContentLoaded', () => {
  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        login();
      }
    });
  }
});