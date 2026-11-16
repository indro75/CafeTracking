/**
 * CafeteriaTrail — Main Application Controller
 * Optimized coordinator with asynchronous non-blocking GPS startup,
 * accurate page history back-navigation, debounced search, and check-in radius logic.
 */
const App = (() => {
    let cafeterias = [];
    let visitedIds = new Set();
    let currentFilter = 'all';
    let searchQuery = '';
    let currentDetail = null;
    let currentPage = 'home';
    let previousPage = 'home';
    let searchDebounceTimer = null;
    let hasLoadedData = false;

    function init() {
        bindAuthForms();
        bindNavigation();
        bindExplore();
        bindDetail();
        bindProfile();

        const locateBtn = document.getElementById('locate-btn');
        if (locateBtn) locateBtn.onclick = locateMe;

        // Browser history support
        window.addEventListener('popstate', (e) => {
            const page = (e.state && e.state.page) ? e.state.page : 'home';
            navigate(page, false);
        });

        // Initialize Authentication & Session
        Auth.init();
    }

    function locateMe() {
        UI.showLoading('Finding your location...');
        GPS.getCurrent(true)
            .then(pos => {
                UI.hideLoading();
                UI.toast('Location updated successfully.', 'success');
                refreshDistances();
                if (currentPage === 'map') {
                    Map.centerOnUser();
                }
            })
            .catch(err => {
                UI.hideLoading();
                UI.toast(err.message, 'warning');
            });
    }

    /**
     * Called when Auth completes or Guest continues.
     * Starts data loading and GPS in parallel without blocking UI rendering!
     */
    async function onAuthSuccess() {
        // 1. Immediately initialize Map & load data in parallel
        Map.init();
        loadAll();

        // 2. Start GPS in background (non-blocking!)
        GPS.startWatch();
        GPS.onChange(onLocationUpdate);

        // Try getting initial GPS position asynchronously without blocking UI
        GPS.getCurrent(false)
            .then(() => refreshDistances())
            .catch(err => console.log('Initial location notice:', err.message));

        navigate('home');
    }

    function onLocationUpdate() {
        applyDistances();
        Map.setCafeterias(cafeterias);
        // Only re-render if active page uses distance
        if (currentPage === 'home') renderHome();
        if (currentPage === 'explore' && (currentFilter === 'nearby' || !searchQuery)) renderExplore();
        if (currentPage === 'detail' && currentDetail) renderDetailDistance(currentDetail);
    }

    async function loadAll() {
        if (!hasLoadedData) {
            UI.showLoading('Discovering cafeterias...');
        }
        try {
            const pos = GPS.get();
            const q = pos.lat != null ? { lat: pos.lat, lng: pos.lng } : {};

            const [list, visits, stats] = await Promise.all([
                API.listCafeterias(q),
                API.listVisits().catch(() => []),
                API.getStats().catch(() => ({ total: 0, visited: 0, remaining: 0, completion: 0 })),
            ]);

            cafeterias = Array.isArray(list) ? list : [];
            visitedIds = new Set((visits || []).map(v => v.cafeteria));
            hasLoadedData = true;

            applyDistances();
            Map.setCafeterias(cafeterias);
            Map.setVisited(visitedIds);
            updateStats(stats);

            renderHome();
            renderExplore();
            renderVisited();
        } catch (err) {
            console.error('loadAll error:', err);
            UI.toast(err.message || 'Failed to load cafeteria data.', 'error');
        } finally {
            UI.hideLoading();
        }
    }

    function applyDistances() {
        const pos = GPS.get();
        cafeterias.forEach(c => {
            if (pos.lat != null && c.latitude && c.longitude) {
                c.distance = GPS.distanceTo(c.latitude, c.longitude);
            }
        });
    }

    function refreshDistances() {
        applyDistances();
        Map.setCafeterias(cafeterias);
        renderHome();
        renderExplore();
        if (currentDetail) renderDetailDistance(currentDetail);
    }

    function updateStats(s) {
        if (!s) return;
        const total = s.total ?? cafeterias.length;
        const visited = s.visited ?? visitedIds.size;
        const remaining = s.remaining ?? Math.max(total - visited, 0);
        const completion = s.completion ?? (total ? Math.round((visited / total) * 100) : 0);

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setVal('stat-total', total);
        setVal('stat-visited', visited);
        setVal('stat-remaining', remaining);
        setVal('stat-completion', `${completion}%`);

        const fill = document.getElementById('progress-fill');
        if (fill) fill.style.width = `${completion}%`;

        setVal('journey-sub', `${visited} of ${total} Cafeterias Visited`);
        const jFill = document.getElementById('journey-fill');
        if (jFill) jFill.style.width = `${completion}%`;

        setVal('profile-visited', visited);
        setVal('profile-completion', `${completion}%`);
        setVal('profile-checkins', visited);
    }

    // ============ Navigation ============
    function bindNavigation() {
        // Bottom nav & Desktop header nav
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                navigate(btn.dataset.nav);
            };
        });

        // Smart Back buttons: return to previous page
        document.querySelectorAll('[data-nav-back]').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                navigate(previousPage || 'home');
            };
        });

        const profileBtn = document.getElementById('profile-btn');
        if (profileBtn) {
            profileBtn.onclick = () => navigate('profile');
        }
    }

    function navigate(page, push = true) {
        if (!page) page = 'home';
        if (currentPage !== page && currentPage !== 'detail') {
            previousPage = currentPage;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));

        // Show target page
        const target = document.getElementById('page-' + page);
        if (target) {
            target.classList.remove('hidden');
        } else {
            const home = document.getElementById('page-home');
            if (home) home.classList.remove('hidden');
            page = 'home';
        }

        currentPage = page;

        // Update active class on both bottom nav and desktop topbar nav
        document.querySelectorAll('[data-nav]').forEach(item => {
            item.classList.toggle('active', item.dataset.nav === page);
        });

        // Initialize or re-size map when switching to map tab
        if (page === 'map') {
            Map.ensureInit();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (push) {
            try {
                history.pushState({ page }, '', '#' + page);
            } catch {}
        }
    }

    // ============ Auth Forms ============
    function bindAuthForms() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const which = tab.dataset.tab;
                const loginForm = document.getElementById('login-form');
                const registerForm = document.getElementById('register-form');
                if (loginForm) loginForm.classList.toggle('hidden', which !== 'login');
                if (registerForm) registerForm.classList.toggle('hidden', which !== 'register');
            };
        });

        // Guest continue button
        const guestBtn = document.getElementById('guest-continue-btn');
        if (guestBtn) {
            guestBtn.onclick = (e) => {
                e.preventDefault();
                Auth.continueAsGuest();
            };
        }

        // Login form submit
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const errEl = document.getElementById('login-error');
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                if (errEl) errEl.textContent = '';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in...'; }

                const fd = new FormData(loginForm);
                try {
                    await Auth.login(fd.get('username'), fd.get('password'));
                    UI.toast('Welcome back!', 'success');
                } catch (err) {
                    if (errEl) errEl.textContent = err.message || 'Login failed.';
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Sign in'; }
                }
            };
        }

        // Register form submit
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.onsubmit = async (e) => {
                e.preventDefault();
                const errEl = document.getElementById('register-error');
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                if (errEl) errEl.textContent = '';
                if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating account...'; }

                const fd = new FormData(registerForm);
                try {
                    await Auth.register({
                        username: fd.get('username'),
                        email: fd.get('email'),
                        password: fd.get('password'),
                        password_confirm: fd.get('password_confirm'),
                    });
                    UI.toast('Account created successfully!', 'success');
                } catch (err) {
                    if (errEl) {
                        if (err.data && typeof err.data === 'object') {
                            errEl.textContent = Object.values(err.data).flat().join(' ');
                        } else {
                            errEl.textContent = err.message || 'Registration failed.';
                        }
                    }
                } finally {
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create account'; }
                }
            };
        }
    }

    // ============ Home ============
    function renderHome() {
        const container = document.getElementById('home-cards');
        if (!container) return;

        const unvisited = cafeterias.filter(c => !visitedIds.has(c.id));
        const listToDisplay = unvisited.length ? unvisited : cafeterias;

        // Sort nearest first if distance is known
        const sorted = [...listToDisplay].sort((a, b) => {
            const dA = a.distance ?? Infinity;
            const dB = b.distance ?? Infinity;
            return dA - dB;
        }).slice(0, 6);

        container.innerHTML = sorted.map(c => UI.cafeteriaCard(c)).join('');
        bindCardActions(container);
    }

    // ============ Explore ============
    function bindExplore() {
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('search-clear-btn');

        if (searchInput) {
            searchInput.oninput = (e) => {
                clearTimeout(searchDebounceTimer);
                const query = e.target.value.trim().toLowerCase();
                if (clearBtn) clearBtn.classList.toggle('hidden', !query);

                searchDebounceTimer = setTimeout(() => {
                    searchQuery = query;
                    renderExplore();
                }, 180);
            };
        }

        if (clearBtn) {
            clearBtn.onclick = () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                clearBtn.classList.add('hidden');
                searchQuery = '';
                renderExplore();
            };
        }

        document.querySelectorAll('#filters .chip').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('#filters .chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderExplore();
            };
        });
    }

    function renderExplore() {
        let list = [...cafeterias];

        // Search query filter
        if (searchQuery) {
            list = list.filter(c =>
                c.name.toLowerCase().includes(searchQuery) ||
                (c.address || '').toLowerCase().includes(searchQuery) ||
                (c.description || '').toLowerCase().includes(searchQuery)
            );
        }

        // Category filter chips
        if (currentFilter === 'visited') {
            list = list.filter(c => visitedIds.has(c.id));
        } else if (currentFilter === 'not-visited') {
            list = list.filter(c => !visitedIds.has(c.id));
        } else if (currentFilter === 'open-now') {
            list = list.filter(c => UI.isCafeteriaOpen(c.opening_time, c.closing_time) === true);
        }

        // Sorting
        if (currentFilter === 'top-rated') {
            list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        } else {
            // Default & Nearby: nearest first
            list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }

        const container = document.getElementById('explore-cards');
        const empty = document.getElementById('explore-empty');
        const countLabel = document.getElementById('explore-count');

        if (countLabel) {
            countLabel.textContent = `${list.length} cafeteria${list.length === 1 ? '' : 's'} found`;
        }

        if (!container) return;

        if (!list.length) {
            container.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
        } else {
            if (empty) empty.classList.add('hidden');
            container.innerHTML = list.map(c => UI.cafeteriaCard(c)).join('');
            bindCardActions(container);
        }
    }

    // ============ Visited ============
    function renderVisited() {
        const container = document.getElementById('visited-cards');
        const empty = document.getElementById('visited-empty');
        const sortSelect = document.getElementById('visited-sort');
        const sort = sortSelect ? sortSelect.value : 'recent';

        const visits = cafeterias.filter(c => visitedIds.has(c.id));

        if (!container) return;

        if (!visits.length) {
            container.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }

        if (empty) empty.classList.add('hidden');

        const sorted = [...visits];
        if (sort === 'name') {
            sorted.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'rating') {
            sorted.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
        }

        container.innerHTML = sorted.map(c => UI.cafeteriaCard(c, { visited: true })).join('');
        bindCardActions(container);
    }

    function bindCardActions(container) {
        container.querySelectorAll('.card').forEach(card => {
            const id = Number(card.dataset.id);
            const cafeteria = cafeterias.find(c => c.id === id);

            const detailsBtn = card.querySelector('[data-action="details"]');
            const directionsBtn = card.querySelector('[data-action="directions"]');

            if (detailsBtn) {
                detailsBtn.onclick = (e) => {
                    e.stopPropagation();
                    openDetail(id);
                };
            }

            if (directionsBtn) {
                directionsBtn.onclick = (e) => {
                    e.stopPropagation();
                    // Go straight to map with directions without flashing detail page!
                    navigate('map');
                    if (cafeteria) {
                        setTimeout(() => Map.getDirectionsTo(cafeteria), 300);
                    } else {
                        openDetail(id, true);
                    }
                };
            }

            // Click entire card body to open details
            card.onclick = (e) => {
                if (!e.target.closest('button') && !e.target.closest('a')) {
                    openDetail(id);
                }
            };
        });
    }

    // ============ Detail Page ============
    function bindDetail() {
        const dirBtn = document.getElementById('detail-directions-btn');
        if (dirBtn) {
            dirBtn.onclick = () => {
                if (!currentDetail) return;
                navigate('map');
                setTimeout(() => Map.getDirectionsTo(currentDetail), 300);
            };
        }

        const checkinBtn = document.getElementById('detail-checkin-btn');
        if (checkinBtn) checkinBtn.onclick = doCheckin;

        const sortSelect = document.getElementById('visited-sort');
        if (sortSelect) sortSelect.onchange = renderVisited;
    }

    async function openDetail(id, autoDirections = false) {
        UI.showLoading('Loading details...');
        try {
            const pos = GPS.get();
            const q = pos.lat != null ? { lat: pos.lat, lng: pos.lng } : {};
            const c = await API.getCafeteria(id, q);

            currentDetail = c;
            renderDetail(c);

            if (autoDirections) {
                navigate('map');
                setTimeout(() => Map.getDirectionsTo(c), 350);
            } else {
                navigate('detail');
                Map.showDetailMap(c);
            }
        } catch (err) {
            UI.toast(err.message || 'Could not load details.', 'error');
        } finally {
            UI.hideLoading();
        }
    }

    function renderDetail(c) {
        const heroEl = document.getElementById('detail-hero');
        const imgUrl = c.image && c.image.startsWith('http')
            ? c.image
            : `https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80`;

        if (heroEl) heroEl.style.backgroundImage = `url('${imgUrl}')`;

        const nameEl = document.getElementById('detail-name');
        if (nameEl) nameEl.textContent = c.name;

        const ratingEl = document.getElementById('detail-rating');
        if (ratingEl) {
            const ratingNum = (Number(c.rating) || 0).toFixed(1);
            ratingEl.innerHTML = `
                <span class="detail-stars">${UI.renderStars(c.rating)}</span>
                <span class="detail-rating-score">${ratingNum}</span>
            `;
        }

        const addrEl = document.getElementById('detail-address');
        if (addrEl) addrEl.textContent = c.address || 'Address not listed';

        const descEl = document.getElementById('detail-description');
        if (descEl) descEl.textContent = c.description || 'Welcome to this cafeteria! Discover great snacks, beverages, and cozy atmosphere.';

        renderDetailDistance(c);

        // Hours & metadata
        const metaEl = document.getElementById('detail-meta');
        if (metaEl) {
            const parts = [];
            if (c.opening_time && c.closing_time) {
                const openStatus = UI.isCafeteriaOpen(c.opening_time, c.closing_time);
                const statusPill = openStatus === true
                    ? '<span class="badge badge-open">Open Now</span>'
                    : (openStatus === false ? '<span class="badge badge-closed">Closed</span>' : '');

                parts.push(`
                    <div class="meta-row">
                        <span class="meta-icon">🕒</span>
                        <span>Hours: ${c.opening_time} – ${c.closing_time}</span>
                        ${statusPill}
                    </div>
                `);
            }
            metaEl.innerHTML = parts.join('');
        }

        const isVisited = visitedIds.has(c.id) || c.is_visited;
        const visitedEl = document.getElementById('detail-visited');
        if (visitedEl) {
            visitedEl.classList.toggle('hidden', !isVisited);
        }

        const checkinBtn = document.getElementById('detail-checkin-btn');
        if (checkinBtn) {
            if (isVisited) {
                checkinBtn.disabled = true;
                checkinBtn.className = 'btn btn-success full';
                checkinBtn.innerHTML = '✓ Visited Already';
            } else {
                checkinBtn.disabled = false;
                checkinBtn.className = 'btn btn-success full';
                checkinBtn.innerHTML = '<span class="btn-icon">📍</span> Check In Here';
            }
        }
    }

    function renderDetailDistance(c) {
        const el = document.getElementById('detail-distance');
        const radiusNotice = document.getElementById('detail-radius-notice');
        if (!el) return;

        const pos = GPS.get();
        if (pos.lat == null) {
            el.innerHTML = '<span class="muted">📍 Enable location to see walking distance</span>';
            if (radiusNotice) radiusNotice.innerHTML = '';
            return;
        }

        const d = c.distance ?? GPS.distanceTo(c.latitude, c.longitude);
        const distStr = GPS.formatDistance(d);

        el.innerHTML = `
            <span class="distance-pill">
                <span class="info-icon">📍</span> ${distStr} away
            </span>
        `;

        if (radiusNotice) {
            if (d !== null && d <= 100) {
                radiusNotice.innerHTML = `
                    <div class="radius-status in-range">
                        <span class="status-icon">✓</span> You are within 100m. Ready to check in!
                    </div>
                `;
            } else if (d !== null) {
                const needed = Math.round(d - 100);
                radiusNotice.innerHTML = `
                    <div class="radius-status out-range">
                        <span class="status-icon">🚶</span> Walk ${needed}m closer to check in (must be within 100m).
                    </div>
                `;
            }
        }
    }

    // ============ Check-in ============
    async function doCheckin() {
        if (!currentDetail) return;

        if (!Auth.isAuthenticated()) {
            UI.toast('Please sign in to check in and record your visits.', 'info');
            navigate('profile');
            return;
        }

        UI.showLoading('Verifying GPS proximity...');
        try {
            const pos = await GPS.getCurrent(true);
            const result = await API.checkin({
                cafeteria_id: currentDetail.id,
                latitude: pos.lat,
                longitude: pos.lng,
            });

            UI.hideLoading();

            visitedIds.add(currentDetail.id);
            currentDetail.is_visited = true;

            Map.setVisited(visitedIds);
            renderDetail(currentDetail);
            renderHome();
            renderExplore();
            renderVisited();

            // Refresh stats from backend
            API.getStats().then(stats => updateStats(stats)).catch(() => {});

            UI.showCheckinSuccess(currentDetail);
        } catch (err) {
            UI.hideLoading();
            const msg = (err.data && err.data.message) || err.message || 'Check-in failed.';
            UI.toast(msg, 'warning');
        }
    }

    // ============ Profile ============
    function bindProfile() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = async () => {
                if (Auth.isAuthenticated()) {
                    await Auth.logout();
                    UI.toast('Logged out successfully.', 'info');
                } else {
                    Auth.showAuth();
                }
            };
        }
    }

    return {
        init,
        onAuthSuccess,
        openDetail,
        navigate,
        locateMe,
    };
})();

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    App.init();
}
