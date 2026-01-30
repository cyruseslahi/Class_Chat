import { getCurrentUser, logout } from "./auth.js";
import { fetchProfile } from "./profile.js";
import { supabase } from "./supabase.js";
import { 
  fetchFriends, 
  fetchFriendRequests, 
  fetchSuggestions, 
  sendFriendRequest, 
  acceptFriendRequest,
  searchPeople,
  countKnownProfiles
} from "./friends.js";

// Global variables
let currentUser = null;
let currentProfile = null;

// Global variables for DMs
let currentDmConversationId = null;
let currentDmFriend = null;
let dmMessagesChannel = null;

// Check if user is authenticated
getCurrentUser().then(async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  
  currentUser = user;
  
  // Fetch and display profile
  try {
    const profile = await fetchProfile(user.id);
    
    if (!profile) {
      // No profile found, redirect to setup
      window.location.href = "profile.html";
      return;
    }
    
    currentProfile = profile;
    displayProfile(profile);
    
    // Initialize private messaging system
    initializeDMs();
    
    // Set up Add Friends modal
    setupAddFriendsModal();
    
    // Set up keyboard shortcut for counting profiles
    setupProfileCountShortcut();
  } catch (error) {
    console.error("Error loading profile:", error);
    document.getElementById("profileCard").innerHTML = `
      <div class="error-message">Error loading profile. Please try refreshing.</div>
    `;
  }
}).catch(() => {
  window.location.href = "index.html";
});

/**
 * Display profile data in the sidebar
 * @param {Object} profile - Profile data object
 */
function displayProfile(profile) {
  const profileCard = document.getElementById("profileCard");
  
  // Build classes HTML
  let classesHTML = "";
  if (profile.classes && profile.classes.length > 0) {
    classesHTML = '<div class="classes-list"><h3>Classes</h3>';
    profile.classes.forEach(cls => {
      classesHTML += `
        <div class="class-item">
          <span class="period">Period ${cls.period || "N/A"}:</span>
          ${cls.name || "Unnamed"} ${cls.teacher ? `(${cls.teacher})` : ""}
        </div>
      `;
    });
    classesHTML += "</div>";
  }
  
  // Build interests HTML
  let interestsHTML = "";
  if (profile.interests) {
    interestsHTML = `
      <div class="interests">
        <h3>Interests</h3>
        <p>${profile.interests}</p>
      </div>
    `;
  }
  
  profileCard.innerHTML = `
    <h2>${profile.display_name || "No name"}</h2>
    ${profile.bio ? `<div class="bio profile-bio">${profile.bio}</div>` : ""}
    ${profile.grade ? `<div class="grade"><strong>Grade:</strong> ${profile.grade}</div>` : ""}
    ${classesHTML}
    ${interestsHTML}
    <button class="btn logout-btn" id="logoutBtn">Log Out</button>
  `;
  
  // Add logout handler
  document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
      // Unsubscribe from real-time channels before logging out
      if (dmMessagesChannel) {
        await supabase.removeChannel(dmMessagesChannel);
      }
      await logout();
      window.location.href = "index.html";
    } catch (error) {
      console.error("Error logging out:", error);
    }
  });
}

/**
 * Initialize private messaging system
 */
async function initializeDMs() {
  // Load friends UI immediately
  await loadFriendsUI();
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


/**
 * Set up Add Friends modal
 */
function setupAddFriendsModal() {
  const modal = document.getElementById('add-friends-modal');
  const openBtn = document.getElementById('add-friends-btn');
  const closeBtn = document.getElementById('close-modal-btn');
  const searchInput = document.getElementById('add-friend-search');
  const resultsContainer = document.getElementById('add-friend-results');
  const statusEl = document.getElementById('add-friend-status');
  
  if (!modal || !openBtn || !closeBtn || !searchInput || !resultsContainer || !statusEl) return;
  
  let searchTimeout = null;
  const requestedIds = new Set(); // Track requested user IDs
  
  // Open modal
  openBtn.addEventListener('click', async () => {
    modal.style.display = 'flex';
    requestedIds.clear();
    statusEl.textContent = 'Idle';
    // Load initial results (empty query)
    await performSearch('');
  });
  
  // Close modal
  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    searchInput.value = '';
    resultsContainer.innerHTML = '';
    statusEl.textContent = 'Idle';
  });
  
  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      searchInput.value = '';
      resultsContainer.innerHTML = '';
      statusEl.textContent = 'Idle';
    }
  });
  
  // Search with debouncing
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Debounce search (300ms)
    searchTimeout = setTimeout(async () => {
      await performSearch(query);
    }, 300);
  });
  
  /**
   * Perform search and render results
   * @param {string} query - Search query
   */
  async function performSearch(query) {
    if (!currentUser) return;
    
    try {
      statusEl.textContent = 'Searching...';
      const results = await searchPeople(currentUser.id, query);
      statusEl.textContent = 'Found ' + results.length + ' people in search.';
      renderSearchResults(results);
    } catch (error) {
      console.error('Error searching people:', error);
      statusEl.textContent = 'Error loading results';
      resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #86868b;">Error loading results</div>';
    }
  }
  
  /**
   * Render search results
   * @param {Array} results - Array of user objects
   */
  function renderSearchResults(results) {
    if (results.length === 0) {
      resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #86868b;">No results found</div>';
      return;
    }
    
    resultsContainer.innerHTML = results.map(person => {
      const isRequested = requestedIds.has(person.user_id);
      return `
        <div class="add-friend-result-item">
          <div class="add-friend-result-info">
            <div class="add-friend-result-name">${escapeHtml(person.display_name)}</div>
            <div class="add-friend-result-meta">
              ${person.grade || ''}
              ${person.mutual_count > 0 ? `<span class="add-friend-mutual-badge">${person.mutual_count} mutual</span>` : ''}
            </div>
          </div>
          <div class="add-friend-result-actions">
            <button 
              class="dm-btn ${isRequested ? '' : 'dm-btn-primary'}" 
              onclick="handleModalAddRequest('${person.user_id}')"
              ${isRequested ? 'disabled' : ''}
            >
              ${isRequested ? 'Requested' : 'Add'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }
  
  /**
   * Handle Add button click in modal
   * @param {string} targetId - Target user ID
   */
  window.handleModalAddRequest = async function(targetId) {
    if (!currentUser) return;
    
    try {
      const result = await sendFriendRequest(targetId);
      
      // Check if friendship already existed
      if (result && result.status === 'accepted') {
        // Already friends
        const button = document.querySelector(`[onclick="handleModalAddRequest('${targetId}')"]`);
        if (button) {
          button.textContent = 'Already Friends';
          button.disabled = true;
          button.classList.remove('dm-btn-primary');
        }
      } else {
        // Request sent or already pending
        requestedIds.add(targetId);
        
        // Update the button state
        const button = document.querySelector(`[onclick="handleModalAddRequest('${targetId}')"]`);
        if (button) {
          button.textContent = result?.status === 'pending' ? 'Requested' : 'Sent';
          button.disabled = true;
          button.classList.remove('dm-btn-primary');
        }
      }
      
      // Refresh sidebar lists
      await loadFriendsUI();
    } catch (error) {
      console.error('Error sending friend request from modal:', error);
      // Show error to user
      alert('Error sending friend request: ' + (error.message || 'Unknown error'));
    }
  };
}

/**
 * Set up keyboard shortcut (Ctrl+Shift+A) to count known profiles
 */
function setupProfileCountShortcut() {
  window.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
      if (!currentUser) return;
      
      const statusEl = document.getElementById('add-friend-status');
      if (!statusEl) return;
      
      statusEl.textContent = 'Counting known people...';
      const total = await countKnownProfiles(currentUser.id);
      
      if (total === null) {
        statusEl.textContent = 'Error counting known people.';
      } else {
        statusEl.textContent = `Known people in database (excluding me): ${total}`;
      }
    }
  });
}

/**
 * Load and render friends UI (Friends, Requests, People)
 */
async function loadFriendsUI() {
  if (!currentUser) return;
  
  try {
    const [friends, requests, suggestions] = await Promise.all([
      fetchFriends(currentUser.id),
      fetchFriendRequests(currentUser.id),
      fetchSuggestions(currentUser.id)
    ]);
    
    renderFriends(friends);
    renderRequests(requests);
    renderSuggestions(suggestions);
  } catch (error) {
    console.error('Error loading friends UI:', error);
  }
}

/**
 * Render friends list
 * @param {Array} friends - Array of friend objects
 */
function renderFriends(friends) {
  const friendsList = document.getElementById('friends-list');
  if (!friendsList) return;
  
  if (friends.length === 0) {
    friendsList.innerHTML = '<div style="padding: 12px; color: #86868b; font-size: 14px;">No friends yet</div>';
    return;
  }
  
  friendsList.innerHTML = friends.map(friend => `
    <div class="dm-list-item dm-friend-item" data-friend-id="${friend.friend_id}">
      <div class="dm-list-item-info">
        <div class="dm-list-item-name">${escapeHtml(friend.display_name)}</div>
        <div class="dm-list-item-meta">${friend.grade || ''} ${friend.mutual_count > 0 ? `• ${friend.mutual_count} mutual` : ''}</div>
      </div>
    </div>
  `).join('');
  
  // Attach click handlers after rendering
  attachFriendClickHandlers();
}

/**
 * Attach click handlers to friend items
 */
function attachFriendClickHandlers() {
  const items = document.querySelectorAll('.dm-friend-item');
  console.log('attachFriendClickHandlers: Found', items.length, 'friend items');
  
  items.forEach(item => {
    // Remove any existing handlers
    item.onclick = null;
    
    // Add new click handler
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const friendId = item.dataset.friendId;
      if (!friendId) {
        console.error('attachFriendClickHandlers: No friendId found');
        return;
      }
      
      console.log('Friend clicked:', friendId);
      await openOrCreateConversation(friendId);
      setActiveFriendItem(item);
    });
  });
}

/**
 * Set active friend item in the list
 * @param {HTMLElement} active - The active item element
 */
function setActiveFriendItem(active) {
  document.querySelectorAll('.dm-friend-item').forEach(i => i.classList.remove('active'));
  if (active) active.classList.add('active');
}

/**
 * Render friend requests list
 * @param {Array} requests - Array of request objects
 */
function renderRequests(requests) {
  const requestsList = document.getElementById('requests-list');
  if (!requestsList) return;
  
  if (requests.length === 0) {
    requestsList.innerHTML = '<div style="padding: 12px; color: #86868b; font-size: 14px;">No pending requests</div>';
    return;
  }
  
  requestsList.innerHTML = requests.map(req => `
    <div class="dm-list-item">
      <div class="dm-list-item-info">
        <div class="dm-list-item-name">${escapeHtml(req.display_name)}</div>
        <div class="dm-list-item-meta">${req.grade || ''}</div>
      </div>
      <div class="dm-list-item-actions">
        <button class="dm-btn dm-btn-primary" onclick="handleAcceptRequest('${req.friendship_id}')">Accept</button>
      </div>
    </div>
  `).join('');
}

/**
 * Render people suggestions list
 * @param {Array} suggestions - Array of suggestion objects
 */
function renderSuggestions(suggestions) {
  const peopleList = document.getElementById('people-list');
  if (!peopleList) return;
  
  if (suggestions.length === 0) {
    peopleList.innerHTML = '<div style="padding: 12px; color: #86868b; font-size: 14px;">No suggestions</div>';
    return;
  }
  
  peopleList.innerHTML = suggestions.map(person => `
    <div class="dm-list-item">
      <div class="dm-list-item-info">
        <div class="dm-list-item-name">${escapeHtml(person.display_name)}</div>
        <div class="dm-list-item-meta">${person.grade || ''} ${person.mutual_count > 0 ? `• ${person.mutual_count} mutual` : ''}</div>
      </div>
      <div class="dm-list-item-actions">
        <button class="dm-btn" onclick="handleSendRequest('${person.user_id}')">Add</button>
      </div>
    </div>
  `).join('');
}

/**
 * Handle sending a friend request
 * @param {string} targetId - Target user ID
 */
window.handleSendRequest = async function(targetId) {
  try {
    const result = await sendFriendRequest(targetId);
    
    // If friendship already exists, the function returns the existing one
    // Refresh suggestions list to remove them from the list
    const suggestions = await fetchSuggestions(currentUser.id);
    renderSuggestions(suggestions);
    
    // Also refresh friends list in case they became friends
    await loadFriendsUI();
  } catch (error) {
    console.error('Error sending friend request:', error);
    alert('Error sending friend request: ' + (error.message || 'Unknown error'));
  }
};

/**
 * Handle accepting a friend request
 * @param {string} friendshipId - Friendship ID to accept
 */
window.handleAcceptRequest = async function(friendshipId) {
  try {
    await acceptFriendRequest(friendshipId);
    // Refresh all lists
    await loadFriendsUI();
  } catch (error) {
    console.error('Error accepting friend request:', error);
  }
};


/**
 * Open or create a DM conversation with a friend
 * @param {string} friendId - Friend's user ID
 */
async function openOrCreateConversation(friendId) {
  if (!currentUser) {
    console.error('openOrCreateConversation: No current user');
    return;
  }
  
  console.log('openOrCreateConversation: Starting for friendId', friendId);
  
  // Get friend's profile for display name FIRST
  let friendName = 'Unknown';
  try {
    const { data: friendProfile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', friendId)
      .single();
    
    if (friendProfile) {
      friendName = friendProfile.display_name;
    } else if (profileError) {
      console.error('Error fetching friend profile:', profileError);
    }
  } catch (error) {
    console.error('Error fetching friend profile:', error);
  }
  
  // Update UI IMMEDIATELY - before any database operations
  const emptyState = document.getElementById('dm-empty-state');
  const chatActive = document.getElementById('dm-chat-active');
  const friendNameEl = document.getElementById('dm-friend-name');
  
  console.log('openOrCreateConversation: UI elements check', {
    emptyState: !!emptyState,
    chatActive: !!chatActive,
    friendNameEl: !!friendNameEl,
    messagesView: !!messagesView,
    messagesViewActive: messagesView?.classList.contains('active')
  });
  
  if (!emptyState || !chatActive || !friendNameEl) {
    console.error('openOrCreateConversation: Critical UI elements missing!', {
      emptyState: !!emptyState,
      chatActive: !!chatActive,
      friendNameEl: !!friendNameEl
    });
    alert('Error: Chat UI elements not found. Please refresh the page.');
    return;
  }
  
  // Hide empty state and show chat
  emptyState.style.display = 'none';
  chatActive.style.display = 'flex';
  friendNameEl.textContent = friendName;
  
  console.log('openOrCreateConversation: UI updated', {
    emptyStateHidden: emptyState.style.display === 'none',
    chatActiveShown: chatActive.style.display === 'flex',
    friendName: friendName
  });
  
  // Set active friend item in sidebar
  const activeItem = document.querySelector(`.dm-friend-item[data-friend-id="${friendId}"]`);
  if (activeItem) {
    setActiveFriendItem(activeItem);
  }
  
  // Now try to find or create conversation
  try {
    // 1) Find existing conversation
    const { data: myMemberships, error: myError } = await supabase
      .from('dm_members')
      .select('conversation_id')
      .eq('user_id', currentUser.id);
    
    const { data: friendMemberships, error: friendError } = await supabase
      .from('dm_members')
      .select('conversation_id')
      .eq('user_id', friendId);
    
    let conversationId = null;
    
    if (!myError && !friendError) {
      // Find common conversation_id
      const myConvIds = new Set((myMemberships || []).map(m => m.conversation_id));
      const friendConvIds = new Set((friendMemberships || []).map(m => m.conversation_id));
      const existing = Array.from(myConvIds).filter(id => friendConvIds.has(id));
      
      console.log('openOrCreateConversation: Existing conversations', existing);
      
      if (existing && existing.length > 0) {
        conversationId = existing[0];
        console.log('openOrCreateConversation: Found existing conversation', conversationId);
      }
    } else {
      console.warn('openOrCreateConversation: Error finding conversations', myError || friendError);
    }
    
    // 2) Create if needed - Use database function to bypass RLS
    if (!conversationId) {
      console.log('openOrCreateConversation: Creating new conversation using database function');
      
      // Use the database function which has SECURITY DEFINER and bypasses RLS
      const { data: newConvId, error: rpcError } = await supabase.rpc('create_dm_conversation', {
        user1_id: currentUser.id,
        user2_id: friendId
      });
      
      if (rpcError) {
        console.error('create_dm_conversation RPC error', rpcError);
        
        // Fallback: try direct insert if function doesn't exist
        console.log('openOrCreateConversation: Falling back to direct insert');
        const { data: conv, error: convError } = await supabase
          .from('dm_conversations')
          .insert({})
          .select()
          .single();
        
        if (convError) {
          console.error('create conversation error', convError);
          
          // Check if it's an RLS error
          if (convError.code === '42501' || convError.message?.includes('row-level security')) {
            alert('Error: Row Level Security policy violation. Please run the setup-dm-rls.sql script in your Supabase dashboard. Make sure you run the ENTIRE script including the create_dm_conversation function.');
            console.error('RLS Policy Error: Please ensure setup-dm-rls.sql has been run completely.');
          } else {
            alert('Error creating conversation: ' + (convError.message || 'Unknown error'));
          }
          return;
        } else if (conv) {
          conversationId = conv.id;
          console.log('openOrCreateConversation: Created conversation via fallback', conversationId);
          
          // Use the database function to add both members
          const { error: membersError } = await supabase.rpc('add_conversation_members', {
            conv_id: conversationId,
            user1_id: currentUser.id,
            user2_id: friendId
          });
          
          if (membersError) {
            console.error('add members error', membersError);
          }
        }
      } else if (newConvId) {
        conversationId = newConvId;
        console.log('openOrCreateConversation: Created conversation via function', conversationId);
      }
    }
    
    currentDmConversationId = conversationId;
    currentDmFriend = friendId;
    
    // Load messages if we have a conversation ID
    if (conversationId) {
      await loadDmMessages();
      await subscribeToDmMessages();
      setupDmMessageForm();
    } else {
      console.warn('openOrCreateConversation: No conversation ID, messages not loaded');
    }
    
    console.log('openOrCreateConversation: Completed');
  } catch (error) {
    console.error('openOrCreateConversation: Error in conversation setup', error);
    // UI is already shown, so user can still see the chat interface
  }
}

/**
 * Load DM messages for the current conversation
 */
async function loadDmMessages() {
  if (!currentDmConversationId) {
    console.log('loadDmMessages: No conversation ID');
    return;
  }
  
  const container = document.getElementById('dm-messages');
  if (!container) {
    console.error('loadDmMessages: Container not found');
    return;
  }
  
  console.log('loadDmMessages: Loading messages for conversation', currentDmConversationId);
  
  // Load only the 12 most recent messages (ordered by newest first, then reverse for display)
  const { data, error } = await supabase
    .from('dm_messages')
    .select('*')
    .eq('conversation_id', currentDmConversationId)
    .order('created_at', { ascending: false })
    .limit(12);
  
  if (error) {
    console.error('load dm messages error', error);
    return;
  }
  
  console.log('loadDmMessages: Found', data?.length || 0, 'messages', data);
  
  container.innerHTML = '';
  
  if (data && data.length > 0) {
    // Reverse the array so newest messages appear at the bottom
    const reversedData = data.reverse();
    reversedData.forEach(message => {
      console.log('loadDmMessages: Appending message', message);
      appendDmMessage(message, false); // Don't auto-scroll during initial load
    });
    scrollDmToBottom(true);
  } else {
    console.log('loadDmMessages: No messages found - showing empty state');
    // Show a message indicating no messages yet
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'dm-empty-message';
    emptyMsg.style.cssText = 'padding: 20px; text-align: center; color: #86868b; font-size: 14px;';
    emptyMsg.textContent = 'No messages yet. Start the conversation!';
    container.appendChild(emptyMsg);
  }
}

/**
 * Append a DM message to the chat
 * @param {Object} message - Message object
 * @param {boolean} autoScroll - Whether to auto-scroll after appending (default: true)
 */
function appendDmMessage(message, autoScroll = true) {
  const dmMessagesContainer = document.getElementById('dm-messages');
  if (!dmMessagesContainer) {
    console.error('appendDmMessage: Container not found');
    return;
  }
  
  if (!message || !message.id) {
    console.error('appendDmMessage: Invalid message', message);
    return;
  }
  
  // Check for duplicates
  const existingMessage = dmMessagesContainer.querySelector(`[data-dm-message-id="${message.id}"]`);
  if (existingMessage) {
    console.log('appendDmMessage: Message already exists', message.id);
    return;
  }
  
  if (!currentUser) {
    console.error('appendDmMessage: No current user');
    return;
  }
  
  const isMine = message.sender_id === currentUser.id;
  
  console.log('appendDmMessage: Appending message', { id: message.id, isMine, content: message.content });
  
  // Create message row
  const messageRow = document.createElement('div');
  messageRow.className = `dm-message-row ${isMine ? 'mine' : 'other'}`;
  messageRow.setAttribute('data-dm-message-id', message.id);
  
  // Create message bubble
  const messageBubble = document.createElement('div');
  messageBubble.className = 'message-bubble';
  
  // Create message meta
  const messageMeta = document.createElement('div');
  messageMeta.className = 'message-meta';
  
  // Format time
  const date = new Date(message.created_at);
  const timeString = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  messageMeta.innerHTML = `
    <span class="message-time">${timeString}</span>
  `;
  
  // Create message content
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  messageContent.textContent = message.content || '';
  
  // Assemble
  messageBubble.appendChild(messageMeta);
  messageBubble.appendChild(messageContent);
  messageRow.appendChild(messageBubble);
  dmMessagesContainer.appendChild(messageRow);
  
  console.log('appendDmMessage: Message appended successfully');
  
  // Auto-scroll to bottom after appending message
  // Always scroll for own messages, otherwise only if near bottom
  if (autoScroll) {
    scrollDmToBottom(isMine); // Force scroll for own messages
  }
}

/**
 * Scroll DM messages to bottom
 * @param {boolean} force - Force scroll
 */
function scrollDmToBottom(force = false) {
  const dmMessagesContainer = document.getElementById('dm-messages');
  if (!dmMessagesContainer) return;
  
  if (!force && dmMessagesContainer.scrollHeight <= dmMessagesContainer.clientHeight) {
    return;
  }
  
  setTimeout(() => {
    requestAnimationFrame(() => {
      dmMessagesContainer.scrollTop = dmMessagesContainer.scrollHeight;
    });
  }, 10);
}

/**
 * Set up real-time subscription for DM messages
 * @param {string} conversationId - Conversation ID
 */
/**
 * Subscribe to real-time DM messages for the current conversation
 */
async function subscribeToDmMessages() {
  if (dmMessagesChannel) {
    await supabase.removeChannel(dmMessagesChannel);
    dmMessagesChannel = null;
  }
  
  if (!currentDmConversationId) return;
  
  dmMessagesChannel = supabase
    .channel(`dm-messages-${currentDmConversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `conversation_id=eq.${currentDmConversationId}`
      },
      payload => {
        appendDmMessage(payload.new, true); // Auto-scroll for new real-time messages
      }
    )
    .subscribe();
}

/**
 * Set up DM message form handler
 */
// Keep track of the handler function so we can remove it
let dmFormHandler = null;

function setupDmMessageForm() {
  const form = document.getElementById('dm-message-form');
  const input = document.getElementById('dm-message-input');
  
  if (!form || !input) {
    console.error('setupDmMessageForm: Form or input not found', { form: !!form, input: !!input });
    return;
  }
  
  // Remove existing listener if it exists
  if (dmFormHandler) {
    form.removeEventListener('submit', dmFormHandler);
    dmFormHandler = null;
  }
  
  // Create new handler
  dmFormHandler = async function handleDmSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('handleDmSubmit: Form submitted');
    
    const textInput = document.getElementById('dm-message-input');
    if (!textInput) {
      console.error('handleDmSubmit: Input not found');
      return false;
    }
    
    const text = textInput.value.trim();
    
    if (!text) {
      console.log('handleDmSubmit: Empty message, ignoring');
      return false;
    }
    
    // Enforce character limit (750 characters)
    if (text.length > 750) {
      alert('Message is too long. Maximum 750 characters allowed.');
      textInput.value = text.substring(0, 750);
      return false;
    }
    
    if (!currentDmConversationId) {
      console.error('handleDmSubmit: No conversation ID - attempting to create conversation');
      
      // Try to create conversation if it doesn't exist
      if (!currentDmFriend) {
        alert('Error: No friend selected. Please select a friend to chat with.');
        return false;
      }
      
      try {
        // Try to create conversation using database function (bypasses RLS)
        const { data: newConvId, error: rpcError } = await supabase.rpc('create_dm_conversation', {
          user1_id: currentUser.id,
          user2_id: currentDmFriend
        });
        
        if (rpcError) {
          console.error('handleDmSubmit: Error creating conversation via RPC', rpcError);
          alert('Error: Database function not found. Please run the setup-dm-rls.sql script in your Supabase dashboard.');
          return false;
        }
        
        if (newConvId) {
          currentDmConversationId = newConvId;
          console.log('handleDmSubmit: Created conversation', currentDmConversationId);
          // Conversation and members are already created by the function
          // Continue to send message below
        } else {
          alert('Error: Failed to create conversation.');
          return false;
        }
      } catch (error) {
        console.error('handleDmSubmit: Exception creating conversation', error);
        alert('Error creating conversation: ' + (error.message || 'Unknown error'));
        return false;
      }
    }
    
    if (!currentUser) {
      console.error('handleDmSubmit: No current user');
      return false;
    }
    
    console.log('handleDmSubmit: Sending message', { 
      text: text.substring(0, 50) + '...', 
      conversationId: currentDmConversationId,
      userId: currentUser.id
    });
    
    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: currentDmConversationId,
          sender_id: currentUser.id,
          content: text
        })
        .select()
        .single();
      
      if (error) {
        console.error('handleDmSubmit: Error sending DM', error);
        alert('Error sending message: ' + (error.message || 'Unknown error'));
        return false;
      }
      
      console.log('handleDmSubmit: Message sent successfully', data);
      
      // Optimistically append the message immediately (force scroll for own messages)
      if (data) {
        appendDmMessage(data, true);
      }
      
      // Clear input
      textInput.value = '';
      textInput.focus();
      
      return false;
    } catch (error) {
      console.error('handleDmSubmit: Exception sending message', error);
      alert('Error sending message: ' + (error.message || 'Unknown error'));
      return false;
    }
  };
  
  // Add the listener
  form.addEventListener('submit', dmFormHandler, { capture: true });
  console.log('setupDmMessageForm: Form handler set up successfully');
}

