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
    const levelBadgeEl = document.getElementById('levelBadge');

    loginBtn.style.display = 'none';
    userSection.style.display = 'flex';
    usernameEl.textContent = username;
    levelBadgeEl.textContent = level;
}

// Update header to show logged-out state
function updateHeaderForLoggedOutUser() {
    const loginBtn = document.getElementById('loginBtn');
    const userSection = document.getElementById('userSection');

    loginBtn.style.display = 'block';
    userSection.style.display = 'none';
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

// Get notifications from localStorage
function getNotifications() {
    const notifications = localStorage.getItem('retype_notifications');
    return notifications ? JSON.parse(notifications) : [];
}

// Save notifications to localStorage
function saveNotifications(notifications) {
    localStorage.setItem('retype_notifications', JSON.stringify(notifications));
}

// Add a new notification
function addNotification(title, message, time = 'just now') {
    const notifications = getNotifications();
    notifications.unshift({
        id: Date.now(),
        title,
        message,
        time,
        read: false
    });
    saveNotifications(notifications);
    updateNotificationBadge();
    renderNotifications();
}

// Update the notification badge
function updateNotificationBadge() {
    const notifications = getNotifications();
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');

    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// Mark all notifications as read
function markAllNotificationsAsRead() {
    const notifications = getNotifications();
    notifications.forEach(n => n.read = true);
    saveNotifications(notifications);
    updateNotificationBadge();
}

// Render notifications in the panel
function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    const notifications = getNotifications();

    if (!notificationList) return;

    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="notification-empty">No notifications yet.</div>';
        return;
    }

    notificationList.innerHTML = notifications.map(notif => `
        <div class="notification-item">
            <div class="notification-icon">${getNotificationIcon(notif.title)}</div>
            <div class="notification-content">
                <p class="notification-item-title">${notif.title}</p>
                <p class="notification-item-message">${notif.message}</p>
                <span class="notification-time">${notif.time}</span>
            </div>
        </div>
    `).join('');
}

// Get icon based on notification title
function getNotificationIcon(title) {
    if (title.includes('Welcome') || title.includes('account')) return '🎉';
    if (title.includes('Verify')) return '✉️';
    if (title.includes('best') || title.includes('WPM')) return '⚡';
    if (title.includes('completed')) return '🎯';
    return '📚';
}

// Check if user hit 67 WPM (trigger notification once)
function checkWPMMilestone(wpm) {
    const hasNotified = localStorage.getItem('notif_hit_67');

    if (!hasNotified && wpm >= 67) {
        localStorage.setItem('notif_hit_67', 'true');
        addNotification(
            'New personal best!',
            'You hit 67+ WPM — great job!',
            'today'
        );
    }
}

// ============================================
// PROFILE SYSTEM
// ============================================

// Load and display profile data
async function loadProfileData() {
    const user = currentUser || JSON.parse(localStorage.getItem('retype_user') || 'null');

    // Get real data from localStorage and Supabase
    const streakData = getStreakData();
    const testsStats = getTestsStats();
    const totalTime = getTotalTypingTime();
    const activityLog = getActivityLog();

    // Update header info
    const username = user ? (user.username || 'Guest') : 'Guest';
    const level = user ? (user.level || 1) : 1;

    document.getElementById('profileUsername').textContent = username;
    document.getElementById('profileLevelBadge').textContent = level;
    document.getElementById('profileAvatarInitial').textContent = username[0].toUpperCase();

    // Update join date
    if (user && user.created_at) {
        const joinDate = new Date(user.created_at);
        const day = joinDate.getDate();
        const month = joinDate.toLocaleDateString('en-US', { month: 'short' });
        const year = joinDate.getFullYear();
        document.getElementById('profileJoinDate').textContent = `${day} ${month} ${year}`;
    } else {
        document.getElementById('profileJoinDate').textContent = 'guest session';
    }

    // Update streak
    document.getElementById('profileStreak').textContent = `${streakData.current} days`;

    // Update total time typed
    document.getElementById('profileTotalTime').textContent = formatTime(totalTime);

    // Update tests started/completed
    document.getElementById('profileTestsStarted').textContent = testsStats.started;
    document.getElementById('profileTestsCompleted').textContent = testsStats.completed;

    // Calculate average WPM from activity (placeholder - we'll improve this later)
    const avgWPM = 0; // TODO: Calculate from test history
    document.getElementById('profileAvgWPM').textContent = avgWPM;

    // Update XP progress (mock calculation: level * 1000 XP per level)
    const xpForNextLevel = level * 1000;
    const currentXP = (testsStats.completed * 50) % xpForNextLevel; // 50 XP per test
    const xpProgress = (currentXP / xpForNextLevel) * 100;
    document.getElementById('profileXPFill').style.width = `${xpProgress}%`;
    document.getElementById('profileXPText').textContent = `${currentXP} / ${xpForNextLevel} XP`;

    // Load bio
    await loadProfileBio();

    // Render personal bests (placeholder for now)
    renderPersonalBestsPlaceholder();

    // Render activity heatmap with real data
    renderActivityHeatmap(activityLog);

    // Render performance graph (placeholder for now)
    renderPerformanceGraphPlaceholder();
}

// Load bio from Supabase or localStorage
async function loadProfileBio() {
    const user = currentUser || JSON.parse(localStorage.getItem('retype_user') || 'null');
    if (!user) return;

    // Try to load from Supabase first
    if (supabase && user.id) {
        const { data, error } = await supabase
            .from('profiles')
            .select('bio')
            .eq('id', user.id)
            .single();

        if (!error && data && data.bio) {
            document.getElementById('profileBioText').textContent = data.bio;
            return;
        }
    }

    // Fallback to localStorage
    const localBio = localStorage.getItem('retype_profile_bio');
    if (localBio) {
        document.getElementById('profileBioText').textContent = localBio;
    }
}

// Save bio to Supabase and localStorage
async function saveProfileBio(bioText) {
    const user = currentUser || JSON.parse(localStorage.getItem('retype_user') || 'null');

    // Save to localStorage
    localStorage.setItem('retype_profile_bio', bioText);

    // Save to Supabase if available
    if (supabase && user && user.id) {
        await supabase
            .from('profiles')
            .update({ bio: bioText })
            .eq('id', user.id);
    }
}

// Render personal bests placeholder
function renderPersonalBestsPlaceholder() {
    const grid = document.getElementById('profileStatsGrid');
    const durations = [
        { label: '15 seconds' },
        { label: '30 seconds' },
        { label: '60 seconds' },
        { label: '120 seconds' }
    ];

    grid.innerHTML = durations.map(({ label }) => {
        return `
            <div class="profile-stat-card" style="opacity: 0.5;">
                <div class="stat-card-time">${label}</div>
                <div class="stat-card-wpm" style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.5);">coming soon</div>
                <div class="stat-card-acc">--% acc</div>
            </div>
        `;
    }).join('');
}

// Render activity heatmap
function renderActivityHeatmap(activityDays) {
    const heatmap = document.getElementById('profileHeatmap');

    // Generate last 12 months of data
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 12);

    // Create month structure
    const months = [];
    let currentMonth = new Date(startDate);

    while (currentMonth <= today) {
        const monthData = {
            label: currentMonth.toLocaleDateString('en-US', { month: 'short' }),
            weeks: []
        };

        const monthStart = new Date(currentMonth);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        // Generate weeks for this month
        let weekStart = new Date(monthStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start from Sunday

        while (weekStart <= monthEnd) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const day = new Date(weekStart);
                day.setDate(day.getDate() + i);

                if (day >= monthStart && day <= monthEnd && day <= today) {
                    const dateKey = day.toISOString().split('T')[0];
                    const count = activityDays[dateKey] || 0;
                    const level = count === 0 ? 0 : Math.min(4, Math.ceil(count / 2));

                    week.push({ date: dateKey, level, count });
                } else {
                    week.push(null);
                }
            }
            monthData.weeks.push(week);
            weekStart.setDate(weekStart.getDate() + 7);
        }

        months.push(monthData);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
    }

    // Render heatmap HTML
    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    heatmap.innerHTML = `
        <div class="heatmap-grid">
            <div class="heatmap-weekdays">
                ${weekdayLabels.map(day => `<div class="heatmap-weekday">${day}</div>`).join('')}
            </div>
            <div class="heatmap-months">
                ${months.map(month => `
                    <div class="heatmap-month">
                        <div class="heatmap-month-label">${month.label}</div>
                        ${month.weeks.map(week => `
                            <div class="heatmap-week">
                                ${week.map(day => day
                                    ? `<div class="heatmap-day" data-level="${day.level}" title="${day.date}: ${day.count} tests"></div>`
                                    : `<div class="heatmap-day" style="opacity: 0;"></div>`
                                ).join('')}
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Render performance graph
function renderPerformanceGraph(testHistory) {
    const canvas = document.getElementById('profilePerformanceGraph');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 300;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (testHistory.length === 0) {
        // Show "No data" message
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('No test data yet', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Prepare data
    const data = testHistory.slice(-30); // Last 30 tests
    const maxWPM = Math.max(...data.map(t => t.wpm), 100);
    const minWPM = Math.min(...data.map(t => t.wpm), 0);

    const padding = 40;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;

    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();

    // Draw grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding + (graphHeight / 5) * i;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(canvas.width - padding, y);
        ctx.stroke();

        // Y-axis labels
        const wpm = Math.round(maxWPM - (maxWPM - minWPM) * (i / 5));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(wpm, padding - 10, y + 4);
    }

    // Draw area under curve
    ctx.fillStyle = 'rgba(255, 216, 77, 0.1)';
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);

    data.forEach((test, index) => {
        const x = padding + (graphWidth / (data.length - 1)) * index;
        const y = canvas.height - padding - ((test.wpm - minWPM) / (maxWPM - minWPM)) * graphHeight;
        ctx.lineTo(x, y);
    });

    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.closePath();
    ctx.fill();

    // Draw line
    ctx.strokeStyle = '#FFD84D';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((test, index) => {
        const x = padding + (graphWidth / (data.length - 1)) * index;
        const y = canvas.height - padding - ((test.wpm - minWPM) / (maxWPM - minWPM)) * graphHeight;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.stroke();

    // Draw points
    data.forEach((test, index) => {
        const x = padding + (graphWidth / (data.length - 1)) * index;
        const y = canvas.height - padding - ((test.wpm - minWPM) / (maxWPM - minWPM)) * graphHeight;

        ctx.fillStyle = '#FFD84D';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Add glow
        ctx.shadowColor = '#FFD84D';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

// Render performance graph placeholder
function renderPerformanceGraphPlaceholder() {
    const canvas = document.getElementById('profilePerformanceGraph');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = 300;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Show "Coming soon" message
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Performance tracking coming soon', canvas.width / 2, canvas.height / 2);
}

// Open profile view
function openProfileView() {
    const profileView = document.getElementById('profileView');
    const typingContainer = document.querySelector('.container');

    // Load profile data
    loadProfileData();

    // Fade out typing screen
    if (typingContainer) {
        typingContainer.style.opacity = '0';
        typingContainer.style.transition = 'opacity 0.25s ease-out';
    }

    // Fade in profile view
    setTimeout(() => {
        profileView.classList.add('active');
        hiddenInput.blur(); // Remove focus from typing input
    }, 250);
}

// Close profile view
function closeProfileView() {
    const profileView = document.getElementById('profileView');
    const typingContainer = document.querySelector('.container');

    // Fade out profile view
    profileView.classList.remove('active');

    // Fade in typing screen
    setTimeout(() => {
        if (typingContainer) {
            typingContainer.style.opacity = '1';
        }
        focusInput(); // Refocus typing input
    }, 250);
}

// ============================================
// STATS TRACKING SYSTEM
// ============================================

// Get total typing time from localStorage
function getTotalTypingTime() {
    return Number(localStorage.getItem('retype_total_time') || 0);
}

// Save total typing time to localStorage
function saveTotalTypingTime(seconds) {
    localStorage.setItem('retype_total_time', seconds);
}

// Add session time to total time
function addSessionTime(sessionSeconds) {
    const prev = getTotalTypingTime();
    const newTotal = prev + sessionSeconds;
    saveTotalTypingTime(newTotal);

    // Sync to Supabase if logged in
    syncTotalTimeToSupabase(newTotal);
}

// Sync total time to Supabase
async function syncTotalTimeToSupabase(totalSeconds) {
    const user = currentUser || JSON.parse(localStorage.getItem('retype_user') || 'null');
    if (supabase && user && user.id) {
        await supabase
            .from('profiles')
            .update({ total_time_typed: totalSeconds })
            .eq('id', user.id);
    }
}

// Get streak data
function getStreakData() {
    return {
        current: Number(localStorage.getItem('retype_streak') || 0),
        best: Number(localStorage.getItem('retype_streak_best') || 0),
        lastActive: localStorage.getItem('retype_last_active_day') || null
    };
}

// Update streak on activity
function updateStreak() {
    const today = new Date().toISOString().slice(0, 10); // "2025-11-02"
    const streakData = getStreakData();
    const lastActive = streakData.lastActive;

    let newStreak = streakData.current;

    if (lastActive === today) {
        // Already counted today, no change
        return;
    }

    if (lastActive) {
        const lastDate = new Date(lastActive);
        const todayDate = new Date(today);
        const diffTime = todayDate - lastDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Yesterday - continue streak
            newStreak += 1;
        } else {
            // Streak broken - start new
            newStreak = 1;
        }
    } else {
        // First activity ever
        newStreak = 1;
    }

    // Update best streak if needed
    const newBest = Math.max(newStreak, streakData.best);

    // Save to localStorage
    localStorage.setItem('retype_streak', newStreak);
    localStorage.setItem('retype_streak_best', newBest);
    localStorage.setItem('retype_last_active_day', today);

    // Sync to Supabase
    syncStreakToSupabase(newStreak, newBest);
}

// Sync streak to Supabase
async function syncStreakToSupabase(current, best) {
    const user = currentUser || JSON.parse(localStorage.getItem('retype_user') || 'null');
    if (supabase && user && user.id) {
        await supabase
            .from('profiles')
            .update({
                streak_current: current,
                streak_best: best
            })
            .eq('id', user.id);
    }
}

// Get activity log
function getActivityLog() {
    const activity = localStorage.getItem('retype_activity');
    return activity ? JSON.parse(activity) : {};
}

// Log activity for today
function logActivity() {
    const today = new Date().toISOString().slice(0, 10);
    const activity = getActivityLog();
    activity[today] = (activity[today] || 0) + 1;
    localStorage.setItem('retype_activity', JSON.stringify(activity));

    // Sync to Supabase
    syncActivityToSupabase(activity);
}

// Sync activity to Supabase
async function syncActivityToSupabase(activity) {
    const user = currentUser || JSON.parse(localStorage.getItem('retype_user') || 'null');
    if (supabase && user && user.id) {
        await supabase
            .from('profiles')
            .update({ activity_log: activity })
            .eq('id', user.id);
    }
}

// Get tests started/completed
function getTestsStats() {
    return {
        started: Number(localStorage.getItem('retype_tests_started') || 0),
        completed: Number(localStorage.getItem('retype_tests_completed') || 0)
    };
}

// Increment tests started
function incrementTestsStarted() {
    const stats = getTestsStats();
    const newStarted = stats.started + 1;
    localStorage.setItem('retype_tests_started', newStarted);

    // Sync to Supabase
    syncTestsStatsToSupabase(newStarted, stats.completed);
}

// Increment tests completed
function incrementTestsCompleted() {
    const stats = getTestsStats();
    const newCompleted = stats.completed + 1;
    localStorage.setItem('retype_tests_completed', newCompleted);

    // Sync to Supabase
    syncTestsStatsToSupabase(stats.started, newCompleted);
}

// Sync tests stats to Supabase
async function syncTestsStatsToSupabase(started, completed) {
    const user = currentUser || JSON.parse(localStorage.getItem('retype_user') || 'null');
    if (supabase && user && user.id) {
        await supabase
            .from('profiles')
            .update({
                tests_started: started,
                tests_completed: completed
            })
            .eq('id', user.id);
    }
}

// Format seconds to hh:mm:ss
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ============================================
// MODE CUSTOMIZATION SYSTEM
// ============================================

// Get current mode settings
function getModeSettings() {
    return {
        mode: localStorage.getItem('retype_mode') || 'book',
        value: localStorage.getItem('retype_value') || 'harry-potter'
    };
}

// Save mode settings
function saveModeSettings(mode, value) {
    localStorage.setItem('retype_mode', mode);
    localStorage.setItem('retype_value', value);
}

// Initialize mode bar
function initModeBar() {
    const modeItems = document.querySelectorAll('.mode-item');
    const submenus = document.querySelectorAll('.mode-submenu');

    // Load saved mode
    const settings = getModeSettings();
    setActiveMode(settings.mode, settings.value);

    // Mode item click handlers
    modeItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const mode = item.dataset.mode;

            // Close all submenus first
            closeAllSubmenus();

            // Handle different modes
            if (mode === 'zen') {
                // Zen mode - no submenu, just activate
                setActiveMode('zen', null);
                saveModeSettings('zen', null);
                applyZenMode();
            } else if (mode === 'custom') {
                // Custom mode - show placeholder
                const submenu = document.getElementById('submenuCustom');
                positionSubmenu(submenu, item);
                submenu.classList.add('active');
            } else {
                // Time, Words, Book - show submenu
                const submenu = document.getElementById(`submenu${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
                positionSubmenu(submenu, item);
                submenu.classList.add('active');
            }
        });
    });

    // Submenu option click handlers
    document.querySelectorAll('.submenu-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = option.dataset.value;
            const submenu = option.closest('.mode-submenu');
            const mode = submenu.id.replace('submenu', '').toLowerCase();

            if (value === 'custom') {
                // TODO: Show custom input modal
                console.log('Custom value input coming soon');
                return;
            }

            setActiveMode(mode, value);
            saveModeSettings(mode, value);
            applyMode(mode, value);
            closeAllSubmenus();
        });
    });

    // Book dropdown option click handler
    document.querySelectorAll('.dropdown-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = option.dataset.value;

            setActiveMode('book', value);
            saveModeSettings('book', value);
            applyMode('book', value);
            closeAllSubmenus();
        });
    });

    // Close submenus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mode-submenu') && !e.target.closest('.mode-item')) {
            closeAllSubmenus();
        }
    });
}

// Position submenu below mode item
function positionSubmenu(submenu, modeItem) {
    const rect = modeItem.getBoundingClientRect();
    submenu.style.left = `${rect.left}px`;
    submenu.style.top = `${rect.bottom + 8}px`;
}

// Close all submenus
function closeAllSubmenus() {
    document.querySelectorAll('.mode-submenu').forEach(submenu => {
        submenu.classList.remove('active');
    });
}

// Set active mode visually
function setActiveMode(mode, value) {
    // Update mode items
    document.querySelectorAll('.mode-item').forEach(item => {
        item.classList.remove('active');
    });

    const activeItem = document.querySelector(`.mode-item[data-mode="${mode}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }

    // Update submenu options
    document.querySelectorAll('.submenu-option, .dropdown-option').forEach(option => {
        option.classList.remove('active');
    });

    if (value) {
        const activeOption = document.querySelector(`.submenu-option[data-value="${value}"], .dropdown-option[data-value="${value}"]`);
        if (activeOption) {
            activeOption.classList.add('active');
        }
    }
}

// Apply mode to typing session
function applyMode(mode, value) {
    console.log(`Applying mode: ${mode}, value: ${value}`);

    // Reset typing state
    resetTypingState();

    switch (mode) {
        case 'time':
            // TODO: Implement time-based mode
            console.log(`Time mode: ${value} seconds`);
            break;
        case 'words':
            // TODO: Implement word-based mode
            console.log(`Words mode: ${value} words`);
            break;
        case 'book':
            // Book mode is default - already implemented
            console.log(`Book mode: ${value}`);
            displayCurrentSentence();
            break;
        case 'zen':
            applyZenMode();
            break;
    }
}

// Apply zen mode
function applyZenMode() {
    console.log('Zen mode activated');
    // TODO: Hide timer, notifications, etc.
    // For now, just display current sentence
    displayCurrentSentence();
}

// Reset typing state
function resetTypingState() {
    state.currentCharIndex = 0;
    state.currentSentenceStartTime = null;
    state.currentSentenceCorrectChars = 0;
    state.currentSentenceTotalChars = 0;
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

    // Session time tracking
    sessionStartTime: null,
    sessionActiveTime: 0, // Total active typing time in seconds
    sessionPaused: false,
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
const headerUser = document.getElementById('headerUser');
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
    initModeBar(); // Initialize mode customization bar
    displayCurrentSentence();
    renderNotifications(); // Render notifications on load
    updateNotificationBadge(); // Update badge on load
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
        // Increment tests started counter
        incrementTestsStarted();
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

    // Track stats
    const sessionSeconds = Math.floor(sentenceDuration * 60); // Convert minutes to seconds
    addSessionTime(sessionSeconds);
    incrementTestsCompleted();
    updateStreak();
    logActivity();

    // Check WPM milestone
    checkWPMMilestone(state.wpm);

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

    // Check for WPM milestone
    checkWPMMilestone(state.wpm);
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

        // Don't refocus if modal is open or profile view is active
        const profileView = document.getElementById('profileView');
        if (isModalOpen || (profileView && profileView.classList.contains('active'))) return;

        if (!e.target.closest('.modal-content') &&
            !e.target.closest('.auth-modal') &&
            !e.target.closest('button') &&
            !e.target.closest('.notification-panel') &&
            !e.target.closest('.profile-view')) {
            focusInput();
        }
    });

    // Also handle mousedown to catch focus before it's lost
    document.addEventListener('mousedown', (e) => {
        // Don't refocus if modal is open or profile view is active
        const profileView = document.getElementById('profileView');
        if (isModalOpen || (profileView && profileView.classList.contains('active'))) return;

        if (!e.target.closest('.modal-content') &&
            !e.target.closest('.auth-modal') &&
            !e.target.closest('button') &&
            !e.target.closest('.notification-panel') &&
            !e.target.closest('.profile-view') &&
            e.target !== hiddenInput) {
            // Refocus after mousedown completes
            setTimeout(() => focusInput(), 0);
        }
    });

    // Prevent input from losing focus - aggressive refocus
    hiddenInput.addEventListener('blur', () => {
        console.log('Input lost focus, refocusing...');
        // Don't refocus if modal is open, profile view is active, or if any modal/panel is active
        const profileView = document.getElementById('profileView');
        if (isModalOpen ||
            (profileView && profileView.classList.contains('active')) ||
            document.querySelector('.modal.active') ||
            notificationPanel.classList.contains('active')) {
            return;
        }
        // Use multiple methods to ensure focus is regained
        setTimeout(() => focusInput(), 0);
        setTimeout(() => focusInput(), 10);
        setTimeout(() => focusInput(), 50);
    });

    // Periodically check focus (safety net)
    setInterval(() => {
        // Don't refocus if modal is open, profile view is active, or any panel is active
        const profileView = document.getElementById('profileView');
        if (isModalOpen ||
            (profileView && profileView.classList.contains('active')) ||
            document.querySelector('.modal.active') ||
            notificationPanel.classList.contains('active')) {
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

            // Mark all notifications as read when panel opens
            markAllNotificationsAsRead();
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

    // Header user click - open profile
    if (headerUser) {
        headerUser.addEventListener('click', (e) => {
            e.stopPropagation();
            openProfileView();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.header-user')) {
            logoutDropdown.classList.remove('active');
        }
    });

    // Profile back button
    const profileBackBtn = document.getElementById('profileBackBtn');
    if (profileBackBtn) {
        profileBackBtn.addEventListener('click', () => {
            closeProfileView();
        });
    }

    // Bio edit button
    const bioEditBtn = document.getElementById('profileBioEditBtn');
    const bioText = document.getElementById('profileBioText');
    const bioTextarea = document.getElementById('profileBioTextarea');
    const bioSaveBtn = document.getElementById('profileBioSaveBtn');

    if (bioEditBtn && bioText && bioTextarea && bioSaveBtn) {
        bioEditBtn.addEventListener('click', () => {
            // Enter edit mode
            bioTextarea.value = bioText.textContent === 'No bio yet. Click the edit button to add one!'
                ? ''
                : bioText.textContent;
            bioText.style.display = 'none';
            bioTextarea.style.display = 'block';
            bioSaveBtn.style.display = 'block';
            bioTextarea.focus();
        });

        bioSaveBtn.addEventListener('click', async () => {
            // Save bio
            const newBio = bioTextarea.value.trim();
            const displayBio = newBio || 'No bio yet. Click the edit button to add one!';

            bioText.textContent = displayBio;
            await saveProfileBio(newBio);

            // Exit edit mode
            bioText.style.display = 'block';
            bioTextarea.style.display = 'none';
            bioSaveBtn.style.display = 'none';
        });
    }

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

    // Add welcome notifications
    addNotification(
        'Welcome to ReType!',
        'Your account has been created.',
        'just now'
    );

    addNotification(
        'Verify your account',
        'Check your email to confirm your account.',
        'just now'
    );

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

