/**
 * Authentication controller.
 */
const Auth = (() => {
    let currentUser = null;

    async function init() {
        try {
            currentUser = await API.me();
            showApp();
        } catch {
            showAuth();
        }
    }

    function showAuth() {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    }

    function showApp() {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        updateProfileUI();
        App.onAuthSuccess();
    }

    function updateProfileUI() {
        if (!currentUser) return;
        const initial = (currentUser.username || 'U').charAt(0).toUpperCase();
        document.getElementById('avatar-initial').textContent = initial;
        document.getElementById('profile-avatar').textContent = initial;
        document.getElementById('profile-username').textContent = currentUser.username;
        document.getElementById('profile-email').textContent = currentUser.email || '—';
        document.getElementById('profile-joined').textContent =
            new Date(currentUser.date_joined).toLocaleDateString();
    }

    async function login(username, password) {
        const user = await API.login({ username, password });
        currentUser = user;
        showApp();
        return user;
    }

    async function register(data) {
        const user = await API.register(data);
        currentUser = user;
        showApp();
        return user;
    }

    async function logout() {
        try { await API.logout(); } catch {}
        currentUser = null;
        showAuth();
    }

    function getUser() { return currentUser; }

    return { init, login, register, logout, getUser };
})();