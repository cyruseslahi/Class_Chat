import { supabase } from "./supabase.js";
import { getCurrentUser } from "./auth.js";

/**
 * Fetch a user's profile from the profiles table
 * @param {string} userId - User's UUID
 * @returns {Promise<Object|null>} - Profile object or null if not found
 */
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  
  if (error) {
    // If no rows found, return null (not an error)
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  
  return data;
}

/**
 * Save or update a user's profile
 * @param {Object} profileData - Profile data object
 * @param {string} profileData.display_name - User's display name
 * @param {string} profileData.bio - User's bio
 * @param {string} profileData.grade - User's grade
 * @param {Array} profileData.classes - Array of class objects { period, name, teacher }
 * @param {string} profileData.interests - User's interests
 * @returns {Promise<Object>} - Saved profile data
 */
export async function saveProfile(profileData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User must be authenticated to save profile");
  }
  
  // Check if profile already exists
  const existingProfile = await fetchProfile(user.id);
  
  const profileToSave = {
    id: user.id,
    display_name: profileData.display_name,
    bio: profileData.bio || "",
    grade: profileData.grade || "",
    classes: profileData.classes || [],
    interests: profileData.interests || "",
    created_at: existingProfile?.created_at || new Date().toISOString(),
  };
  
  let result;
  if (existingProfile) {
    // Update existing profile
    const { data, error } = await supabase
      .from("profiles")
      .update(profileToSave)
      .eq("id", user.id)
      .select()
      .single();
    
    if (error) throw error;
    result = data;
  } else {
    // Insert new profile
    const { data, error } = await supabase
      .from("profiles")
      .insert(profileToSave)
      .select()
      .single();
    
    if (error) throw error;
    result = data;
  }
  
  return result;
}

