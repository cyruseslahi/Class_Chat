// ============================================
// SUPABASE INITIALIZATION
// ============================================
// IMPORTANT: Replace 'YOUR_SUPABASE_ANON_KEY' with your actual Supabase anon key
// Get it from: Supabase Dashboard > Project Settings > API > anon/public key

const supabaseUrl = 'https://wajonnuqudzgjivsgiam.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indham9ubnVxdWR6Z2ppdnNnaWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMzc2NzcsImV4cCI6MjA3NzYxMzY3N30.ljne1SPpDli8H8OQ_y4vxN3qrqwlaxzEt5cKxUZmfeI'; 
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// ============================================
// AUTH STATE MANAGEMENT
// ============================================

let currentUser = null;

// Check if user is logged in on page load
async function checkAuthState() {
    const storedUser = localStorage.getItem('retype_user');

    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            updateHeaderForLoggedInUser(currentUser.username, currentUser.level);
        } catch (e) {
            console.error('Error parsing stored user:', e);
            localStorage.removeItem('retype_user');
            updateHeaderForLoggedOutUser();
        }
    } else {
        updateHeaderForLoggedOutUser();
    }
}

// Update header to show logged-in state
function updateHeaderForLoggedInUser(username, level) {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');
    const usernameEl = document.getElementById('username');
    const levelNumberEl = document.getElementById('levelNumber');

    loginBtn.style.display = 'none';
    userSection.style.display = 'flex';
    usernameEl.textContent = username;
    levelNumberEl.textContent = level;
}

// Update header to show logged-out state
function updateHeaderForLoggedOutUser() {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');

    loginBtn.style.display = 'block';
    userSection.style.display = 'none';
}

// Sample book text - Harry Potter and the Sorcerer's Stone (first chapter excerpt)
const bookTextRaw = [
    "While Mrs. Dursley was in the bathroom, Mr. Dursley crept to the bedroom window and peered down into the front garden.",
    "The cat was still there. It was staring down Privet Drive as though it were waiting for something.",
    "Was he imagining things? Could all this have something to do with the Potters?",
    "He didn't think he could bear it if anyone found out about the Potters.",
    "Mrs. Dursley came back into the bedroom and he had to pretend to be asleep.",
    "The next morning, Mr. Dursley woke to a bright, clear Tuesday.",
    "There was not a cloud in the sky, and the sun shone brightly on the neat front gardens of Privet Drive.",
    "Mr. Dursley hummed as he picked out his most boring tie for work.",
    "At half past eight, Mr. Dursley picked up his briefcase, pecked Mrs. Dursley on the cheek, and tried to kiss Dudley goodbye.",
    "He missed, because Dudley was now having a tantrum and throwing his cereal at the walls.",
    "Little tyke, chortled Mr. Dursley as he left the house.",
    "He got into his car and backed out of number four's drive.",
    "It was on the corner of the street that he noticed the first sign of something peculiar.",
    "A cat reading a map. For a second, Mr. Dursley didn't realize what he had seen.",
    "Then he jerked his head around to look again.",
    "There was a tabby cat standing on the corner of Privet Drive, but there wasn't a map in sight.",
    "What could he have been thinking of? It must have been a trick of the light.",
    "Mr. Dursley blinked and stared at the cat. It stared back.",
    "As Mr. Dursley drove around the corner and up the road, he watched the cat in his mirror.",
    "It was now reading the sign that said Privet Drive—no, looking at the sign.",
];

// Normalize text to use standard keyboard characters
function normalizeText(text) {
    return text
        // Em dash and en dash → regular hyphen
        .replace(/—/g, '-')
        .replace(/–/g, '-')
        // Smart quotes → regular quotes
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/'/g, "'")
        // Ellipsis → three periods
        .replace(/…/g, '...');
}

// Normalize all book text on load
const bookText = bookTextRaw.map(sentence => normalizeText(sentence));

// App State
let state = {
    currentSentenceIndex: 0,
    currentCharIndex: 0,
    totalWordsTyped: 0,
    correctChars: 0,
    totalChars: 0,
    startTime: null,
    wpm: 0,
    accuracy: 100,
    fontSize: 24,
    isTyping: false,
    typingTimeout: null,

    // Rolling history for smooth stats
    sentenceHistory: [], // Array of {wpm, correctChars, totalChars, duration} for last 25 sentences
    currentSentenceStartTime: null,
    currentSentenceCorrectChars: 0,
    currentSentenceTotalChars: 0,
};

// Caret element
let caretEl = null;

// DOM Elements
const passageEl = document.getElementById('passage');
const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const totalWordsEl = document.getElementById('totalWords');
const hiddenInput = document.getElementById('hiddenInput');
const menuBtn = document.getElementById('menuBtn');
const settingsBtn = document.getElementById('settingsBtn');
const notificationBtn = document.getElementById('notificationBtn');
const menuModal = document.getElementById('menuModal');
const settingsModal = document.getElementById('settingsModal');
const notificationPanel = document.getElementById('notificationPanel');
const closeMenuBtn = document.getElementById('closeMenu');
const closeSettingsBtn = document.getElementById('closeSettings');
const resetProgressBtn = document.getElementById('resetProgress');
const fontSizeSlider = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const startHint = document.getElementById('startHint');

// Auth DOM Elements
const loginBtn = document.getElementById('loginBtn');
const authModal = document.getElementById('authModal');
const authCloseBtn = document.getElementById('authCloseBtn');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const usernameInput = document.getElementById('usernameInput');
const authError = document.getElementById('authError');
const toggleAuthMode = document.getElementById('toggleAuthMode');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const googleAuthBtn = document.getElementById('googleAuthBtn');
const usernameEl = document.getElementById('username');
const logoutDropdown = document.getElementById('logoutDropdown');
const logoutBtn = document.getElementById('logoutBtn');

// Auth state
let isSignupMode = false;
let isModalOpen = false; // Global flag to pause typing when modal is open

// Initialize
function init() {
    checkAuthState(); // Check if user is logged in
    loadProgress();
    loadSettings();
    displayCurrentSentence();
    setupEventListeners();

    // Focus input after a short delay to ensure DOM is ready
    setTimeout(() => {
        focusInput();
        console.log('App initialized, input focused, caret visible');
    }, 100);

    // Additional focus attempt after animation completes
    setTimeout(() => {
        focusInput();
    }, 700);
}

// Load progress from localStorage
function loadProgress() {
    const saved = localStorage.getItem('retypeProgress');
    if (saved) {
        const progress = JSON.parse(saved);
        state.currentSentenceIndex = progress.currentSentenceIndex || 0;
        state.totalWordsTyped = progress.totalWordsTyped || 0;
        state.sentenceHistory = progress.sentenceHistory || [];

        // Ensure we don't load more than 25 sentences
        if (state.sentenceHistory.length > 25) {
            state.sentenceHistory = state.sentenceHistory.slice(-25);
        }
    }
}

// Save progress to localStorage
function saveProgress() {
    localStorage.setItem('retypeProgress', JSON.stringify({
        currentSentenceIndex: state.currentSentenceIndex,
        totalWordsTyped: state.totalWordsTyped,
        sentenceHistory: state.sentenceHistory,
    }));
}

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('retypeSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        state.fontSize = settings.fontSize || 24;
        fontSizeSlider.value = state.fontSize;
        fontSizeValue.textContent = state.fontSize + 'px';
        passageEl.style.fontSize = state.fontSize + 'px';
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('retypeSettings', JSON.stringify({
        fontSize: state.fontSize,
    }));
}

// Display current sentence
function displayCurrentSentence() {
    const sentence = bookText[state.currentSentenceIndex];
    passageEl.innerHTML = '';

    // Create character spans
    for (let i = 0; i < sentence.length; i++) {
        const span = document.createElement('span');
        const char = sentence[i];

        // Add base class
        span.className = 'char';

        // Add space class for space characters
        if (char === ' ') {
            span.classList.add('space');
        }

        span.textContent = char;
        span.dataset.index = i;
        passageEl.appendChild(span);
    }

    // Create caret element
    if (caretEl) {
        caretEl.remove();
    }
    caretEl = document.createElement('div');
    caretEl.className = 'caret always-visible';
    caretEl.style.display = 'block';
    caretEl.style.visibility = 'visible';
    passageEl.appendChild(caretEl);

    // Reset state for new sentence
    state.currentCharIndex = 0;
    state.currentSentenceStartTime = null;
    state.currentSentenceCorrectChars = 0;
    state.currentSentenceTotalChars = 0;

    // Position caret at first character after DOM updates
    requestAnimationFrame(() => {
        updateCaret();
    });
}

// Update caret position with smooth animation
function updateCaret() {
    if (!caretEl) return;

    const chars = passageEl.querySelectorAll('.char');

    // Remove current class from all chars (don't highlight any character)
    chars.forEach(char => char.classList.remove('current'));

    if (state.currentCharIndex < chars.length) {
        const currentChar = chars[state.currentCharIndex];

        // DO NOT add 'current' class - we don't want to highlight the character
        // The caret position is enough to show where the user should type
        // Only typed characters should be white, untyped should stay gray

        // Get position of current character
        const charRect = currentChar.getBoundingClientRect();
        const passageRect = passageEl.getBoundingClientRect();

        // Calculate relative position
        const leftOffset = charRect.left - passageRect.left;
        const topOffset = charRect.top - passageRect.top;
        const height = charRect.height;

        // Update caret position and height
        caretEl.style.height = height + 'px';
        caretEl.style.transform = `translate(${leftOffset}px, ${topOffset}px)`;

        // Ensure caret is always visible
        caretEl.style.display = 'block';
        caretEl.style.visibility = 'visible';

        // Show typing state (stop blinking)
        if (state.isTyping) {
            caretEl.classList.add('typing');

            // Clear existing timeout
            if (state.typingTimeout) {
                clearTimeout(state.typingTimeout);
            }

            // Reset to blinking after 500ms of no typing
            state.typingTimeout = setTimeout(() => {
                state.isTyping = false;
                caretEl.classList.remove('typing');
            }, 500);
        }
    }
}

// Handle typing - renamed from handleInput
function handleKeyPress(typedChar) {
    const sentence = bookText[state.currentSentenceIndex];

    // Ignore null or empty input
    if (typedChar === null || typedChar === undefined) {
        return;
    }

    // Hide start hint on first keystroke
    if (startHint && !startHint.classList.contains('hidden')) {
        startHint.classList.add('hidden');
    }

    // Start timer on first keystroke of session
    if (state.startTime === null) {
        state.startTime = Date.now();
    }

    // Start timer for current sentence on first keystroke
    if (state.currentSentenceStartTime === null) {
        state.currentSentenceStartTime = Date.now();
    }

    // Set typing state
    state.isTyping = true;

    // Ignore if sentence is complete
    if (state.currentCharIndex >= sentence.length) {
        return;
    }

    const expectedChar = sentence[state.currentCharIndex];
    const charEl = passageEl.querySelector(`[data-index="${state.currentCharIndex}"]`);

    if (!charEl) {
        console.error('Character element not found at index:', state.currentCharIndex);
        return; // Safety check
    }

    // Debug logging
    console.log('Typed:', JSON.stringify(typedChar), 'Expected:', JSON.stringify(expectedChar), 'Match:', typedChar === expectedChar);

    // Track stats for current sentence
    state.currentSentenceTotalChars++;

    // Track global stats (for total words display)
    state.totalChars++;

    if (typedChar === expectedChar) {
        // Correct character
        charEl.classList.add('typed');
        charEl.classList.remove('error');

        // Track stats
        state.currentSentenceCorrectChars++;
        state.correctChars++;
        state.currentCharIndex++;

        // Check if sentence is complete
        if (state.currentCharIndex >= sentence.length) {
            handleSentenceComplete();
        } else {
            updateCaret();
        }
    } else {
        // Incorrect character - show error but keep caret in place
        charEl.classList.add('error');
        setTimeout(() => {
            charEl.classList.remove('error');
        }, 300);

        // Keep caret visible and in the same position (don't move it)
        // The caret should stay at the current character until user types correctly
        if (caretEl) {
            caretEl.style.display = 'block';
            caretEl.style.visibility = 'visible';
        }
    }

    updateStats();
}

// Handle sentence completion
function handleSentenceComplete() {
    // Count words in completed sentence (split by space and filter empty strings)
    const sentence = bookText[state.currentSentenceIndex];
    const words = sentence.split(' ').filter(w => w.trim().length > 0).length;
    state.totalWordsTyped += words;

    // Calculate stats for this sentence
    const sentenceDuration = (Date.now() - state.currentSentenceStartTime) / 1000 / 60; // in minutes
    const sentenceWPM = sentenceDuration > 0 ? (words / sentenceDuration) : 0;

    // Add sentence data to history
    const sentenceData = {
        wpm: sentenceWPM,
        correctChars: state.currentSentenceCorrectChars,
        totalChars: state.currentSentenceTotalChars,
        duration: sentenceDuration,
        words: words
    };

    state.sentenceHistory.push(sentenceData);

    // Keep only last 25 sentences for accuracy calculation
    if (state.sentenceHistory.length > 25) {
        state.sentenceHistory.shift(); // Remove oldest
    }

    console.log('Sentence complete! Words:', words, 'WPM:', Math.round(sentenceWPM), 'Total words:', state.totalWordsTyped);
    console.log('History length:', state.sentenceHistory.length);

    // Update stats one final time
    updateStats();

    // Save progress
    saveProgress();

    // Fade out current sentence
    passageEl.classList.add('fade-out');

    setTimeout(() => {
        passageEl.classList.remove('fade-out');

        // Move to next sentence
        state.currentSentenceIndex++;

        // Loop back to start if at end
        if (state.currentSentenceIndex >= bookText.length) {
            state.currentSentenceIndex = 0;
        }

        displayCurrentSentence();
        saveProgress();
    }, 400);
}

// Update stats with rolling averages
function updateStats() {
    // Calculate WPM based on rolling average of last 4 completed sentences
    if (state.sentenceHistory.length > 0) {
        // Get last 4 sentences (or fewer if we don't have 4 yet)
        const last4Sentences = state.sentenceHistory.slice(-4);

        // Calculate average WPM from these sentences
        const totalWPM = last4Sentences.reduce((sum, s) => sum + s.wpm, 0);
        const avgWPM = totalWPM / last4Sentences.length;

        // If currently typing, blend in current sentence progress
        if (state.currentSentenceStartTime && state.currentCharIndex > 0) {
            const currentDuration = (Date.now() - state.currentSentenceStartTime) / 1000 / 60;
            const currentWords = state.currentCharIndex / 5; // 5 chars = 1 word
            const currentWPM = currentDuration > 0 ? (currentWords / currentDuration) : 0;

            // Blend: 70% historical average, 30% current sentence
            state.wpm = Math.round(avgWPM * 0.7 + currentWPM * 0.3);
        } else {
            state.wpm = Math.round(avgWPM);
        }
    } else if (state.currentSentenceStartTime && state.currentCharIndex > 0) {
        // No history yet, use current sentence only
        const currentDuration = (Date.now() - state.currentSentenceStartTime) / 1000 / 60;
        const currentWords = state.currentCharIndex / 5;
        state.wpm = currentDuration > 0 ? Math.round(currentWords / currentDuration) : 0;
    } else {
        state.wpm = 0;
    }

    // Calculate accuracy based on rolling average of last 25 sentences
    if (state.sentenceHistory.length > 0) {
        // Sum up all correct and total chars from history
        const totalCorrect = state.sentenceHistory.reduce((sum, s) => sum + s.correctChars, 0);
        const totalTyped = state.sentenceHistory.reduce((sum, s) => sum + s.totalChars, 0);

        // Add current sentence progress
        const combinedCorrect = totalCorrect + state.currentSentenceCorrectChars;
        const combinedTotal = totalTyped + state.currentSentenceTotalChars;

        state.accuracy = combinedTotal > 0
            ? Math.round((combinedCorrect / combinedTotal) * 100)
            : 100;
    } else if (state.currentSentenceTotalChars > 0) {
        // No history yet, use current sentence only
        state.accuracy = Math.round((state.currentSentenceCorrectChars / state.currentSentenceTotalChars) * 100);
    } else {
        state.accuracy = 100;
    }

    // Update UI
    wpmEl.textContent = `${state.wpm} WPM`;
    accuracyEl.textContent = `Accuracy: ${state.accuracy}%`;
    totalWordsEl.textContent = `Words: ${state.totalWordsTyped}`;
}

// Focus hidden input - aggressive focus management
function focusInput() {
    if (!hiddenInput) return;

    // Clear the input to prevent any stale values
    hiddenInput.value = '';

    // Force focus
    hiddenInput.focus();

    // Ensure caret stays visible even if focus is lost
    if (caretEl) {
        caretEl.style.display = 'block';
        caretEl.style.visibility = 'visible';
    }
}

// Setup event listeners
function setupEventListeners() {
    // Keep focus on hidden input - click anywhere to refocus
    document.addEventListener('click', (e) => {
        // Close notification panel if clicking outside
        if (notificationPanel.classList.contains('active') &&
            !e.target.closest('.notification-panel') &&
            !e.target.closest('#notificationBtn')) {
            notificationPanel.classList.remove('active');
            notificationBtn.classList.remove('active');
        }

        // Don't refocus if modal is open or clicking on modal/panel elements
        if (isModalOpen) return;

        if (!e.target.closest('.modal-content') &&
            !e.target.closest('.auth-modal') &&
            !e.target.closest('button') &&
            !e.target.closest('.notification-panel')) {
            focusInput();
        }
    });

    // Also handle mousedown to catch focus before it's lost
    document.addEventListener('mousedown', (e) => {
        // Don't refocus if modal is open
        if (isModalOpen) return;

        if (!e.target.closest('.modal-content') &&
            !e.target.closest('.auth-modal') &&
            !e.target.closest('button') &&
            !e.target.closest('.notification-panel') &&
            e.target !== hiddenInput) {
            // Refocus after mousedown completes
            setTimeout(() => focusInput(), 0);
        }
    });

    // Prevent input from losing focus - aggressive refocus
    hiddenInput.addEventListener('blur', () => {
        console.log('Input lost focus, refocusing...');
        // Don't refocus if modal is open or if any modal/panel is active
        if (isModalOpen || document.querySelector('.modal.active') || notificationPanel.classList.contains('active')) {
            return;
        }
        // Use multiple methods to ensure focus is regained
        setTimeout(() => focusInput(), 0);
        setTimeout(() => focusInput(), 10);
        setTimeout(() => focusInput(), 50);
    });

    // Periodically check focus (safety net)
    setInterval(() => {
        // Don't refocus if modal is open or any panel is active
        if (isModalOpen || document.querySelector('.modal.active') || notificationPanel.classList.contains('active')) {
            return;
        }
        if (document.activeElement !== hiddenInput) {
            console.log('Focus lost, recovering...');
            focusInput();
        }
    }, 100);

    // Track last processed character to prevent duplicates
    let lastProcessedChar = null;
    let lastProcessedTime = 0;

    // Use input event ONLY - this prevents double processing
    hiddenInput.addEventListener('input', () => {
        // Pause typing when modal is open
        if (isModalOpen) {
            hiddenInput.value = '';
            return;
        }

        // Get the input value
        const value = hiddenInput.value;

        // Clear the input immediately to prevent accumulation
        hiddenInput.value = '';

        // Process only if we have a value
        if (!value || value.length === 0) {
            return;
        }

        // Get the last character typed
        const typedChar = value[value.length - 1];

        // Prevent duplicate processing (within 50ms window)
        const now = Date.now();
        if (typedChar === lastProcessedChar && (now - lastProcessedTime) < 50) {
            console.log('Duplicate character detected, ignoring:', typedChar);
            return;
        }

        // Update tracking
        lastProcessedChar = typedChar;
        lastProcessedTime = now;

        // Process the character
        handleKeyPress(typedChar);
    });

    // Handle keydown only for special keys (prevent default behavior)
    hiddenInput.addEventListener('keydown', (e) => {
        // Prevent unwanted keys
        if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Home' || e.key === 'End' ||
            e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            return;
        }
    });
    
    // Menu button
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        menuModal.classList.add('active');
        menuBtn.classList.add('active');
        hiddenInput.blur(); // Temporarily blur to allow modal interaction
    });

    // Settings button
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsModal.classList.add('active');
        settingsBtn.classList.add('active');
        hiddenInput.blur(); // Temporarily blur to allow modal interaction
    });

    // Notification button
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = notificationPanel.classList.contains('active');

        if (isActive) {
            // Close panel
            notificationPanel.classList.remove('active');
            notificationBtn.classList.remove('active');
            setTimeout(focusInput, 100);
        } else {
            // Open panel
            notificationPanel.classList.add('active');
            notificationBtn.classList.add('active');
            hiddenInput.blur(); // Temporarily blur to allow panel interaction
        }
    });

    // Close modals and refocus
    closeMenuBtn.addEventListener('click', () => {
        menuModal.classList.remove('active');
        menuBtn.classList.remove('active');
        setTimeout(focusInput, 100);
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.remove('active');
        settingsBtn.classList.remove('active');
        setTimeout(focusInput, 100);
    });

    // Close modal on backdrop click
    menuModal.addEventListener('click', (e) => {
        if (e.target === menuModal) {
            menuModal.classList.remove('active');
            menuBtn.classList.remove('active');
            setTimeout(focusInput, 100);
        }
    });

    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('active');
            settingsBtn.classList.remove('active');
            setTimeout(focusInput, 100);
        }
    });
    
    // Reset progress
    resetProgressBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset your progress? This will clear all your typing history.')) {
            // Clear all localStorage data
            localStorage.removeItem('retypeProgress');
            localStorage.removeItem('retypeSettings');

            // Reset all state variables to initial values
            state.currentSentenceIndex = 0;
            state.currentCharIndex = 0;
            state.totalWordsTyped = 0;
            state.correctChars = 0;
            state.totalChars = 0;
            state.startTime = null;
            state.wpm = 0;
            state.accuracy = 100;
            state.isTyping = false;
            state.typingTimeout = null;

            // Reset rolling history
            state.sentenceHistory = [];
            state.currentSentenceStartTime = null;
            state.currentSentenceCorrectChars = 0;
            state.currentSentenceTotalChars = 0;

            // Reset font size to default
            state.fontSize = 24;
            fontSizeSlider.value = 24;
            fontSizeValue.textContent = '24px';
            passageEl.style.fontSize = '24px';

            // Save the reset state
            saveProgress();
            saveSettings();

            // Display first sentence (fresh start)
            displayCurrentSentence();

            // Update stats display to show defaults
            updateStats();

            // Close modal
            menuModal.classList.remove('active');

            // Refocus input
            setTimeout(() => focusInput(), 100);

            console.log('Progress reset - starting fresh!');
        }
    });
    
    // Font size slider
    fontSizeSlider.addEventListener('input', (e) => {
        state.fontSize = parseInt(e.target.value);
        fontSizeValue.textContent = state.fontSize + 'px';
        passageEl.style.fontSize = state.fontSize + 'px';
        saveSettings();
        // Recalculate caret position after font size change
        setTimeout(() => updateCaret(), 50);
    });

    // Recalculate caret position on window resize
    window.addEventListener('resize', () => {
        if (caretEl) {
            updateCaret();
        }
    });

    // Ensure focus and caret visibility when window gains focus
    window.addEventListener('focus', () => {
        console.log('Window gained focus');
        focusInput();
        if (caretEl) {
            caretEl.style.display = 'block';
            caretEl.style.visibility = 'visible';
        }
    });

    // Keep caret visible even when window loses focus
    window.addEventListener('blur', () => {
        console.log('Window lost focus');
        if (caretEl) {
            caretEl.style.display = 'block';
            caretEl.style.visibility = 'visible';
        }
    });

    // Handle visibility change (tab switching)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('Tab became visible');
            focusInput();
            if (caretEl) {
                caretEl.style.display = 'block';
                caretEl.style.visibility = 'visible';
            }
        }
    });

    // ============================================
    // AUTH EVENT LISTENERS
    // ============================================

    // Open login modal
    loginBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isModalOpen = true; // Set flag to pause typing
        authModal.classList.add('active');
        hiddenInput.blur();
        // Focus the email input after modal opens
        setTimeout(() => emailInput.focus(), 100);
    });

    // Close auth modal
    authCloseBtn.addEventListener('click', () => {
        isModalOpen = false; // Clear flag to resume typing
        authModal.classList.remove('active');
        clearAuthForm();
        setTimeout(focusInput, 100);
    });

    // Close auth modal on overlay click
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal || e.target.classList.contains('auth-overlay')) {
            isModalOpen = false; // Clear flag to resume typing
            authModal.classList.remove('active');
            clearAuthForm();
            setTimeout(focusInput, 100);
        }
    });

    // Toggle between login and signup
    toggleAuthMode.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;

        if (isSignupMode) {
            authTitle.textContent = 'Create your ReType account';
            authSubmitBtn.textContent = 'Create Account';
            toggleAuthMode.textContent = 'Already have an account? Log in';
            usernameInput.style.display = 'block';
            forgotPasswordLink.style.display = 'none';
        } else {
            authTitle.textContent = 'Log into ReType';
            authSubmitBtn.textContent = 'Log In';
            toggleAuthMode.textContent = 'Create an Account';
            usernameInput.style.display = 'none';
            forgotPasswordLink.style.display = 'inline';
        }

        clearAuthForm();
    });

    // Handle auth form submission
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const username = usernameInput.value.trim();

        authError.textContent = '';
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = isSignupMode ? 'Creating account...' : 'Logging in...';

        try {
            if (isSignupMode) {
                await handleSignup(email, password, username);
            } else {
                await handleLogin(email, password);
            }
        } catch (error) {
            authError.textContent = error.message;
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = isSignupMode ? 'Create Account' : 'Log In';
        }
    });

    // Forgot password (placeholder)
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Password reset functionality coming soon!');
    });

    // Google auth (placeholder)
    googleAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Google authentication coming soon!');
    });

    // Username dropdown toggle
    usernameEl.addEventListener('click', (e) => {
        e.stopPropagation();
        logoutDropdown.classList.toggle('active');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.username-container')) {
            logoutDropdown.classList.remove('active');
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await handleLogout();
        logoutDropdown.classList.remove('active');
    });
}

// ============================================
// AUTH HANDLER FUNCTIONS
// ============================================

// Handle user login
async function handleLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw new Error('Invalid email or password');
    }

    // Fetch user profile from profiles table
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, level')
        .eq('id', data.user.id)
        .single();

    if (profileError || !profile) {
        throw new Error('Could not load user profile');
    }

    // Store user data
    const userData = {
        id: data.user.id,
        email: data.user.email,
        username: profile.username,
        level: profile.level
    };

    localStorage.setItem('retype_user', JSON.stringify(userData));
    currentUser = userData;

    // Update UI
    updateHeaderForLoggedInUser(userData.username, userData.level);
    isModalOpen = false; // Clear flag to resume typing
    authModal.classList.remove('active');
    clearAuthForm();

    setTimeout(focusInput, 100);
}

// Handle user signup
async function handleSignup(email, password, username) {
    if (!username) {
        throw new Error('Username is required');
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .single();

    if (existingUser) {
        throw new Error('Username already taken');
    }

    // Create auth user
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username }
        }
    });

    if (error) {
        throw new Error(error.message);
    }

    // Create profile entry
    const { error: profileError } = await supabase
        .from('profiles')
        .insert([
            {
                id: data.user.id,
                username: username,
                level: 1
            }
        ]);

    if (profileError) {
        throw new Error('Could not create user profile');
    }

    // Store user data
    const userData = {
        id: data.user.id,
        email: data.user.email,
        username: username,
        level: 1
    };

    localStorage.setItem('retype_user', JSON.stringify(userData));
    currentUser = userData;

    // Update UI
    updateHeaderForLoggedInUser(userData.username, userData.level);
    isModalOpen = false; // Clear flag to resume typing
    authModal.classList.remove('active');
    clearAuthForm();

    setTimeout(focusInput, 100);
}

// Handle user logout
async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('retype_user');
    currentUser = null;

    updateHeaderForLoggedOutUser();
    setTimeout(focusInput, 100);
}

// Clear auth form
function clearAuthForm() {
    emailInput.value = '';
    passwordInput.value = '';
    usernameInput.value = '';
    authError.textContent = '';
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = isSignupMode ? 'Create Account' : 'Log In';
}

// Start the app
init();

