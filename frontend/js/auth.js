/**
 * CafeteriaTrail — Authentication Controller
 * Manages user session, guest browsing, profile state, and auth UI transitions.
 */
const Auth = (() => {
    let currentUser = null;
    let isGuest = false;

    async function init() {
        try {
            currentUser = await API.me();
            isGuest = false;
            showApp();
        } catch {
            currentUser = null;
            // Show auth screen, but allow 1-click guest preview
            showAuth();
        }
    }

    function showAuth() {
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app');
        if (authScreen) authScreen.classList.remove('hidden');
        if (appScreen) appScreen.classList.add('hidden');
    }

    function showApp() {
        const authScreen = document.getElementById('auth-screen');
        const appScreen = document.getElementById('app');
        if (authScreen) authScreen.classList.add('hidden');
        if (appScreen) appScreen.classList.remove('hidden');
        updateProfileUI();
        App.onAuthSuccess();
    }

    function continueAsGuest() {
        currentUser = null;
        isGuest = true;
        showApp();
    }

    function updateProfileUI() {
        const avatarInitial = document.getElementById('avatar-initial');
        const profileAvatar = document.getElementById('profile-avatar');
        const profileUsername = document.getElementById('profile-username');
        const profileEmail = document.getElementById('profile-email');
        const profileJoined = document.getElementById('profile-joined');
        const profileBadge = document.getElementById('profile-role-badge');
        const logoutBtn = document.getElementById('logout-btn');

        if (currentUser) {
            const initial = (currentUser.username || 'U').charAt(0).toUpperCase();
            if (avatarInitial) avatarInitial.textContent = initial;
            if (profileAvatar) profileAvatar.textContent = initial;
            if (profileUsername) profileUsername.textContent = currentUser.username;
            if (profileEmail) profileEmail.textContent = currentUser.email || 'No email provided';
            if (profileJoined) {
                profileJoined.textContent = currentUser.date_joined
                    ? new Date(currentUser.date_joined).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Recently';
            }
            if (profileBadge) profileBadge.textContent = 'Active Explorer';
            if (logoutBtn) logoutBtn.textContent = 'Log out';
        } else {
            if (avatarInitial) avatarInitial.textContent = 'G';
            if (profileAvatar) profileAvatar.textContent = 'G';
            if (profileUsername) profileUsername.textContent = 'Guest Explorer';
            if (profileEmail) profileEmail.textContent = 'Browse mode (Sign in to save visits)';
            if (profileJoined) profileJoined.textContent = 'Today';
            if (profileBadge) profileBadge.textContent = 'Guest';
            if (logoutBtn) logoutBtn.textContent = 'Sign in / Create account';
        }
    }

    async function login(username, password) {
        const user = await API.login({ username, password });
        currentUser = user;
        isGuest = false;
        showApp();
        return user;
    }

    async function register(data) {
        const user = await API.register(data);
        currentUser = user;
        isGuest = false;
        showApp();
        return user;
    }

    async function logout() {
        try {
            await API.logout();
        } catch (e) {
            console.warn('Logout error:', e.message);
        }
        currentUser = null;
        isGuest = false;
        showAuth();
    }

    function getUser() {
        return currentUser;
    }

    function isAuthenticated() {
        return currentUser !== null;
    }

    return {
        init,
        login,
        register,
        logout,
        getUser,
        isAuthenticated,
        continueAsGuest,
        showAuth,
        showApp,
        updateProfileUI,
    };
})();
