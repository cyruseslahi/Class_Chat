import { supabase } from "./supabase.js";
import { fetchProfile } from "./profile.js";

/**
 * Sign up a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Auth response
 */
export async function signup(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Log in an existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} - Auth response
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    throw error;
  }
  
  return data;
}

/**
 * Log out the current user
 */
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/**
 * Get the current authenticated user
 * @returns {Promise<Object|null>} - Current user or null
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Set up auth state change listener
 * Redirects to profile.html if no profile exists, or home.html if profile exists
 */
export function setupAuthRedirect() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // User is logged in, check if profile exists
      try {
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          // Profile exists, redirect to home
          window.location.href = "home.html";
        } else {
          // No profile, redirect to profile setup
          window.location.href = "profile.html";
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        // If error, assume no profile and redirect to setup
        window.location.href = "profile.html";
      }
    } else {
      // User is logged out, redirect to index (but not if already on index.html)
      const currentPage = window.location.pathname.split("/").pop() || window.location.pathname;
      if (currentPage !== "index.html" && currentPage !== "" && !currentPage.endsWith("index.html")) {
        window.location.href = "index.html";
      }
    }
  });
}

