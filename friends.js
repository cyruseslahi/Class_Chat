import { supabase } from "./supabase.js";

/**
 * Fetch accepted friends for a user
 * Returns array with friend_id, friend profile, and mutual_count
 * @param {string} userId - Current user's ID
 * @returns {Promise<Array>} - Array of friend objects
 */
export async function fetchFriends(userId) {
  // Get all accepted friendships where user is either user_id or friend_id
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
    .eq('status', 'accepted');
  
  if (error) {
    console.error('Error fetching friends:', error);
    return [];
  }
  
  if (!friendships || friendships.length === 0) {
    return [];
  }
  
  // Process friendships to get friend IDs and fetch profiles
  const friendIds = friendships.map(f => 
    f.user_id === userId ? f.friend_id : f.user_id
  );
  
  // Fetch profiles for all friends
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, grade')
    .in('id', friendIds);
  
  if (profilesError) {
    console.error('Error fetching friend profiles:', profilesError);
    return [];
  }
  
  // Create a map of friend profiles
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.id] = p;
  });
  
  // Build friend objects with mutual count
  const friends = await Promise.all(
    friendships.map(async (f) => {
      const friendId = f.user_id === userId ? f.friend_id : f.user_id;
      const friendProfile = profileMap[friendId];
      
      if (!friendProfile) {
        return null;
      }
      
      // Calculate mutual count (users who are friends with both)
      const mutualCount = await getMutualCount(userId, friendId);
      
      return {
        friendship_id: f.id,
        friend_id: friendId,
        display_name: friendProfile.display_name,
        grade: friendProfile.grade,
        mutual_count: mutualCount
      };
    })
  );
  
  return friends.filter(f => f !== null);
}

/**
 * Calculate mutual friends count between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<number>} - Count of mutual friends
 */
async function getMutualCount(userId1, userId2) {
  // Get all friends of userId1
  const { data: friends1, error: error1 } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${userId1},friend_id.eq.${userId1}`)
    .eq('status', 'accepted');
  
  if (error1) return 0;
  
  // Get all friends of userId2
  const { data: friends2, error: error2 } = await supabase
    .from('friendships')
    .select('user_id, friend_id')
    .or(`user_id.eq.${userId2},friend_id.eq.${userId2}`)
    .eq('status', 'accepted');
  
  if (error2) return 0;
  
  // Extract friend IDs for both users
  const friendIds1 = new Set(
    friends1.map(f => f.user_id === userId1 ? f.friend_id : f.user_id)
  );
  const friendIds2 = new Set(
    friends2.map(f => f.user_id === userId2 ? f.friend_id : f.user_id)
  );
  
  // Count mutual friends (excluding the two users themselves)
  let mutual = 0;
  friendIds1.forEach(id => {
    if (friendIds2.has(id) && id !== userId1 && id !== userId2) {
      mutual++;
    }
  });
  
  return mutual;
}

/**
 * Fetch pending friend requests for a user
 * Returns requests where friend_id = userId and status = 'pending'
 * @param {string} userId - Current user's ID
 * @returns {Promise<Array>} - Array of friend request objects
 */
export async function fetchFriendRequests(userId) {
  const { data: requests, error } = await supabase
    .from('friendships')
    .select('id, user_id')
    .eq('friend_id', userId)
    .eq('status', 'pending');
  
  if (error) {
    console.error('Error fetching friend requests:', error);
    return [];
  }
  
  if (!requests || requests.length === 0) {
    return [];
  }
  
  // Fetch profiles for requesters
  const requesterIds = requests.map(r => r.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, grade')
    .in('id', requesterIds);
  
  if (profilesError) {
    console.error('Error fetching requester profiles:', profilesError);
    return [];
  }
  
  // Create profile map
  const profileMap = {};
  profiles.forEach(p => {
    profileMap[p.id] = p;
  });
  
  // Format the requests
  return requests.map(req => ({
    friendship_id: req.id,
    user_id: req.user_id,
    display_name: profileMap[req.user_id]?.display_name || 'Unknown',
    grade: profileMap[req.user_id]?.grade || ''
  }));
}

/**
 * Fetch user suggestions (people not yet friends)
 * Returns profiles excluding current user and existing friendships
 * @param {string} userId - Current user's ID
 * @returns {Promise<Array>} - Array of suggestion objects with mutual_count
 */
export async function fetchSuggestions(userId) {
  // Get all existing friendship IDs (both directions, any status)
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  
  if (friendshipsError) {
    console.error('Error fetching friendships for suggestions:', friendshipsError);
    return [];
  }
  
  // Collect all user IDs to exclude (any friendship status)
  const excludeIds = new Set([userId]);
  if (friendships) {
    friendships.forEach(f => {
      excludeIds.add(f.user_id);
      excludeIds.add(f.friend_id);
    });
  }
  
  // Fetch all profiles except excluded ones
  // Supabase doesn't support NOT IN directly, so we filter in JS
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, display_name, grade');
  
  if (profilesError) {
    console.error('Error fetching suggestions:', profilesError);
    return [];
  }
  
  // Filter out excluded IDs
  const profiles = allProfiles ? allProfiles.filter(p => !excludeIds.has(p.id)) : [];
  
  if (profilesError) {
    console.error('Error fetching suggestions:', profilesError);
    return [];
  }
  
  if (!profiles || profiles.length === 0) {
    return [];
  }
  
  // Calculate mutual count for each suggestion
  const suggestions = await Promise.all(
    profiles.map(async (profile) => {
      const mutualCount = await getMutualCount(userId, profile.id);
      return {
        user_id: profile.id,
        display_name: profile.display_name,
        grade: profile.grade,
        mutual_count: mutualCount
      };
    })
  );
  
  return suggestions;
}

/**
 * Send a friend request
 * Inserts into friendships with user_id = current user, friend_id = target, status = 'pending'
 * Checks if friendship already exists before creating
 * @param {string} targetId - Target user's ID
 * @returns {Promise<Object>} - Created friendship object or existing friendship
 */
export async function sendFriendRequest(targetId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  // Check if friendship already exists (in either direction, any status)
  // Get all friendships where current user is involved, then filter for target user
  const { data: existingFriendships, error: checkError } = await supabase
    .from('friendships')
    .select('*')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing friendship:', checkError);
    throw checkError;
  }
  
  // Filter to find if there's a match with the target user in either direction
  const existingFriendship = existingFriendships?.find(f => 
    (f.user_id === user.id && f.friend_id === targetId) ||
    (f.user_id === targetId && f.friend_id === user.id)
  );
  
  // If friendship already exists, return it
  if (existingFriendship) {
    console.log('Friendship already exists:', existingFriendship);
    return existingFriendship;
  }
  
  // Create new friendship request
  const { data, error } = await supabase
    .from('friendships')
    .insert({
      user_id: user.id,
      friend_id: targetId,
      status: 'pending'
    })
    .select()
    .single();
  
  if (error) {
    // Handle unique constraint violation gracefully
    if (error.code === '23505') {
      // Friendship already exists (race condition), fetch it
      const { data: existingFriendships } = await supabase
        .from('friendships')
        .select('*')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      
      const existingFriendship = existingFriendships?.find(f => 
        (f.user_id === user.id && f.friend_id === targetId) ||
        (f.user_id === targetId && f.friend_id === user.id)
      );
      
      if (existingFriendship) {
        return existingFriendship;
      }
    }
    console.error('Error sending friend request:', error);
    throw error;
  }
  
  return data;
}

/**
 * Accept a friend request
 * Updates the friendship status to 'accepted'
 * @param {string} friendshipId - Friendship ID to accept
 * @returns {Promise<Object>} - Updated friendship object
 */
export async function acceptFriendRequest(friendshipId) {
  const { data, error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single();
  
  if (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
  
  return data;
}

/**
 * Search for people (not friends, not pending)
 * Returns users matching query, ordered by mutual_count desc, then display_name asc
 * @param {string} userId - Current user's ID
 * @param {string} query - Search query string
 * @returns {Promise<Array>} - Array of user objects with mutual_count
 */
export async function searchPeople(userId, query = '') {
  console.log("searchPeople start", { userId, query });
  
  // Get all existing friendship IDs (both directions) - regardless of status
  const { data: friendships, error: friendshipsError } = await supabase
    .from('friendships')
    .select('user_id, friend_id, status')
    .or(`user_id.eq.${userId},friend_id.eq.${userId}`);
  
  if (friendshipsError) {
    console.error('Error fetching friendships for search:', friendshipsError);
    return [];
  }
  
  // Collect all user IDs to exclude (current user + all friendship connections, any status)
  const excludeIds = new Set([userId]);
  if (friendships && friendships.length > 0) {
    friendships.forEach(f => {
      excludeIds.add(f.user_id);
      excludeIds.add(f.friend_id);
    });
  }
  
  // Build query for profiles table
  let profilesQuery = supabase
    .from('profiles')
    .select('id, display_name, grade')
    .neq('id', userId);
  
  // If we have IDs to exclude, filter them out
  // Note: Supabase doesn't support NOT IN with array directly, so we'll filter in JS if needed
  // But first, let's try to get all profiles and filter
  
  // If search query provided, use ILIKE filter
  if (query && query.trim()) {
    profilesQuery = profilesQuery.ilike('display_name', `%${query.trim()}%`);
  }
  
  const { data: profiles, error: profilesError } = await profilesQuery;
  
  if (profilesError) {
    console.error('Error searching people:', profilesError);
    return [];
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('searchPeople result', []);
    return [];
  }
  
  // Filter out excluded IDs (users already in friendships)
  const filteredProfiles = profiles.filter(p => !excludeIds.has(p.id));
  
  if (filteredProfiles.length === 0) {
    console.log('searchPeople result', []);
    return [];
  }
  
  // Calculate mutual count for each
  const results = await Promise.all(
    filteredProfiles.map(async (profile) => {
      const mutualCount = await getMutualCount(userId, profile.id);
      return {
        user_id: profile.id,
        display_name: profile.display_name,
        grade: profile.grade,
        mutual_count: mutualCount
      };
    })
  );
  
  // Sort by mutual_count desc, then display_name asc
  results.sort((a, b) => {
    if (b.mutual_count !== a.mutual_count) {
      return b.mutual_count - a.mutual_count;
    }
    return (a.display_name || '').localeCompare(b.display_name || '');
  });
  
  console.log("searchPeople data", results?.length, results);
  return results;
}

/**
 * Count total profiles in database excluding current user
 * @param {string} userId - Current user's ID
 * @returns {Promise<number|null>} - Count of profiles or null on error
 */
export async function countKnownProfiles(userId) {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .neq('id', userId);
  
  if (error) {
    console.error('countKnownProfiles error', error);
    return null;
  }
  
  return count ?? 0;
}

