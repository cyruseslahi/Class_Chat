import { login, signup, setupAuthRedirect, getCurrentUser } from "./auth.js";
import { fetchProfile } from "./profile.js";

// Check if user is already logged in on page load
getCurrentUser().then(async (user) => {
  if (user) {
    // User is logged in, check if profile exists and redirect accordingly
    try {
      const profile = await fetchProfile(user.id);
      if (profile) {
        window.location.href = "home.html";
      } else {
        window.location.href = "profile.html";
      }
    } catch (error) {
      // If error, assume no profile
      window.location.href = "profile.html";
    }
  }
}).catch(() => {
  // User not logged in, stay on login page
});

// Set up auth redirect listener
setupAuthRedirect();

// Tab switching
document.querySelectorAll(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    
    // Update active tab
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    
    // Update active form
    document.querySelectorAll(".auth-form").forEach(f => f.classList.remove("active"));
    document.getElementById(`${tabName}Form`).classList.add("active");
    
    // Clear error messages
    document.getElementById("loginError").style.display = "none";
    document.getElementById("signupError").style.display = "none";
    document.getElementById("signupSuccess").style.display = "none";
  });
});

// Login form handler
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const errorDiv = document.getElementById("loginError");
  
  try {
    await login(email, password);
    // Redirect will happen via auth state change listener
  } catch (error) {
    errorDiv.textContent = error.message || "Failed to log in";
    errorDiv.style.display = "block";
  }
});

// Signup form handler
document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const errorDiv = document.getElementById("signupError");
  const successDiv = document.getElementById("signupSuccess");
  
  try {
    await signup(email, password);
    // If email confirmation is disabled in Supabase, user will be automatically logged in
    // and the auth state change listener will handle redirect
    // Otherwise, show success message
    successDiv.textContent = "Account created! Redirecting...";
    successDiv.style.display = "block";
    errorDiv.style.display = "none";
    
    // Clear form
    document.getElementById("signupForm").reset();
  } catch (error) {
    errorDiv.textContent = error.message || "Failed to sign up";
    errorDiv.style.display = "block";
    successDiv.style.display = "none";
  }
});

