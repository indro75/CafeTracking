/**
 * App controller — ties everything together. (FIXED version with Nearby & Back buttons)
 */
const App = (() => {
    let cafeterias = [];
    let visitedIds = new Set();
    let currentFilter = 'all';
    let searchQuery = '';
    let currentDetail = null;
    let firstNav = true;

    function init() {
        bindAuthForms();
        bindNavigation();
        bindExplore();
        bindDetail();
        bindProfile();
        document.getElementById('locate-btn').onclick = locateMe;
         window.addEventListener('popstate', (e) => {
            const page = (e.state && e.state.page) ? e.state.page : 'home';
            navigate(page, false);
        });
        Auth.init();
    }


    function locateMe() {
        UI.showLoading('Finding your location...');
        GPS.getCurrent()
            .then(() => { UI.hideLoading(); UI.toast('Location updated.', 'success'); refreshDistances(); })
            .catch(err => { UI.hideLoading(); UI.toast(err.message, 'error'); });
    }

    async function onAuthSuccess() {
        GPS.startWatch();
        GPS.onChange(refreshDistances); // FIX: Re-sorts lists instantly whenever GPS updates!
        try { await GPS.getCurrent(); } catch (e) { console.warn(e.message); }
        Map.init();
        await loadAll();
        navigate('home');
    }

    async function loadAll() {
        UI.showLoading('Loading cafeterias...');
        try {
            const pos = GPS.get();
            const q = pos.lat != null ? { lat: pos.lat, lng: pos.lng } : {};
            const [list, visits, stats] = await Promise.all([
                API.listCafeterias(q),
                API.listVisits(),
                API.getStats(),
            ]);
            cafeterias = list;
            visitedIds = new Set(visits.map(v => v.cafeteria));
            applyDistances();  
            Map.setCafeterias(cafeterias);
            Map.setVisited(visitedIds);
            updateStats(stats);
            renderHome();
            renderExplore();
            renderVisited();
        } catch (err) {
            UI.toast(err.message || 'Failed to load data.', 'error');
        } finally {
            UI.hideLoading();
        }
    }

    function applyDistances() {
        const pos = GPS.get();
        if (pos.lat == null) return;
        cafeterias.forEach(c => {
            c.distance = GPS.distanceTo(c.latitude, c.longitude);
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
        document.getElementById('stat-total').textContent = s.total;
        document.getElementById('stat-visited').textContent = s.visited;
        document.getElementById('stat-remaining').textContent = s.remaining;
        document.getElementById('stat-completion').textContent = s.completion + '%';
        document.getElementById('progress-fill').style.width = s.completion + '%';
        document.getElementById('journey-sub').textContent = s.visited + ' / ' + s.total + ' Cafeterias Visited';
        document.getElementById('journey-fill').style.width = s.completion + '%';
        document.getElementById('profile-visited').textContent = s.visited;
        document.getElementById('profile-completion').textContent = s.completion + '%';
        document.getElementById('profile-checkins').textContent = s.visited;
    }

    // ============ Navigation ============
    function bindNavigation() {
        document.querySelectorAll('[data-nav]').forEach(btn => {
            btn.onclick = () => navigate(btn.dataset.nav);
        });
        document.querySelectorAll('[data-nav-back]').forEach(btn => {
            btn.onclick = () => navigate('home');
        });
        document.getElementById('profile-btn').onclick = () => navigate('profile');
    }

    function navigate(page, push = true) {
        document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.remove('hidden');

        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navBtn = document.querySelector('.nav-item[data-nav="' + page + '"]');
        if (navBtn) navBtn.classList.add('active');

        if (page === 'map') Map.ensureInit();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Phone/browser back button support
        if (push) {
            if (firstNav) {
                history.replaceState({ page: page }, '', '#' + page);
                firstNav = false;
            } else {
                history.pushState({ page: page }, '', '#' + page);
            }
        }
    }

    // ============ Auth forms ============
    function bindAuthForms() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.onclick = () => {
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const which = tab.dataset.tab;
                document.getElementById('login-form').classList.toggle('hidden', which !== 'login');
                document.getElementById('register-form').classList.toggle('hidden', which !== 'register');
            };
        });

        document.getElementById('login-form').onsubmit = async (e) => {
            e.preventDefault();
            const errEl = document.getElementById('login-error');
            errEl.textContent = '';
            const fd = new FormData(e.target);
            try {
                await Auth.login(fd.get('username'), fd.get('password'));
            } catch (err) {
                errEl.textContent = err.message;
            }
        };

        document.getElementById('register-form').onsubmit = async (e) => {
            e.preventDefault();
            const errEl = document.getElementById('register-error');
            errEl.textContent = '';
            const fd = new FormData(e.target);
            try {
                await Auth.register({
                    username: fd.get('username'),
                    email: fd.get('email'),
                    password: fd.get('password'),
                    password_confirm: fd.get('password_confirm'),
                });
            } catch (err) {
                if (err.data && typeof err.data === 'object') {
                    errEl.textContent = Object.values(err.data).flat().join(' ');
                } else {
                    errEl.textContent = err.message;
                }
            }
        };
    }

    // ============ Home ============
    function renderHome() {
        const container = document.getElementById('home-cards');
        const list = cafeterias
            .filter(c => !visitedIds.has(c.id))
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
            .slice(0, 6);
        const finalList = list.length ? list : cafeterias.slice(0, 6);
        container.innerHTML = finalList.map(c => UI.cafeteriaCard(c)).join('');
        bindCardActions(container);
    }

    // ============ Explore ============
    function bindExplore() {
        document.getElementById('search-input').oninput = e => {
            searchQuery = e.target.value.trim().toLowerCase();
            renderExplore();
        };
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
        if (searchQuery) {
            list = list.filter(c =>
                c.name.toLowerCase().includes(searchQuery) ||
                (c.address || '').toLowerCase().includes(searchQuery)
            );
        }
        if (currentFilter === 'visited') {
            list = list.filter(c => visitedIds.has(c.id));
        } else if (currentFilter === 'not-visited') {
            list = list.filter(c => !visitedIds.has(c.id));
        }

        if (currentFilter === 'top-rated') {
            list.sort((a, b) => b.rating - a.rating);
        } else {
            // DEFAULT & NEARBY: lowest distance first, then sequentially
            list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }

        const container = document.getElementById('explore-cards');
        const empty = document.getElementById('explore-empty');
        if (!list.length) {
            container.innerHTML = '';
            empty.classList.remove('hidden');
        } else {
            empty.classList.add('hidden');
            container.innerHTML = list.map(c => UI.cafeteriaCard(c)).join('');
            bindCardActions(container);
        }
    }

    // ============ Visited ============
    function renderVisited() {
        const container = document.getElementById('visited-cards');
        const empty = document.getElementById('visited-empty');
        const sort = document.getElementById('visited-sort').value;
        const visits = cafeterias.filter(c => visitedIds.has(c.id));
        if (!visits.length) {
            container.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        const sorted = [...visits];
        if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
        container.innerHTML = sorted.map(c => UI.cafeteriaCard(c)).join('');
        bindCardActions(container);
    }

    function bindCardActions(container) {
        container.querySelectorAll('.card').forEach(card => {
            const id = Number(card.dataset.id);
            card.querySelector('[data-action="details"]').onclick = () => openDetail(id);
            card.querySelector('[data-action="directions"]').onclick = () => openDetail(id, true);
        });
    }

    // ============ Detail page ============
    function bindDetail() {
        document.getElementById('detail-directions-btn').onclick = () => {
            if (!currentDetail) return;
            navigate('map');
            setTimeout(() => Map.getDirectionsTo(currentDetail), 300);
        };
        document.getElementById('detail-checkin-btn').onclick = doCheckin;
        document.getElementById('visited-sort').onchange = renderVisited;
    }

    async function openDetail(id, autoDirections = false) {
        UI.showLoading('Loading details...');
        try {
            const pos = GPS.get();
            const q = pos.lat != null ? { lat: pos.lat, lng: pos.lng } : {};
            const c = await API.getCafeteria(id, q);
            currentDetail = c;
            renderDetail(c);
            navigate('detail');
            Map.showDetailMap(c);
            if (autoDirections) {
                navigate('map');
                setTimeout(() => Map.getDirectionsTo(c), 400);
            }
        } catch (err) {
            UI.toast(err.message, 'error');
        } finally {
            UI.hideLoading();
        }
    }

    function renderDetail(c) {
        const imgUrl = c.image || ('https://picsum.photos/seed/caf-' + c.id + '/1200/600');
        document.getElementById('detail-hero').style.backgroundImage = "url('" + imgUrl + "')";
        document.getElementById('detail-name').textContent = c.name;
        document.getElementById('detail-rating').innerHTML =
            UI.renderStars(c.rating) + ' <span style="color:var(--gray-700)">' + c.rating + '</span>';
        document.getElementById('detail-address').textContent = c.address || '';
        document.getElementById('detail-description').textContent = c.description || '';
        renderDetailDistance(c);

        const meta = [];
        if (c.opening_time && c.closing_time) meta.push('🕒 ' + c.opening_time + ' – ' + c.closing_time);
        document.getElementById('detail-meta').innerHTML = meta.join(' · ');

        const visitedEl = document.getElementById('detail-visited');
        if (c.is_visited) {
            visitedEl.classList.remove('hidden');
            visitedEl.innerHTML = '✓ Visited';
        } else {
            visitedEl.classList.add('hidden');
        }

        const checkinBtn = document.getElementById('detail-checkin-btn');
        if (c.is_visited) {
            checkinBtn.disabled = true;
            checkinBtn.textContent = 'Already Visited';
        } else {
            checkinBtn.disabled = false;
            checkinBtn.textContent = 'Check In';
        }
    }
    
    function renderDetailDistance(c) {
        const pos = GPS.get();
        const el = document.getElementById('detail-distance');
        if (pos.lat == null) {
            el.textContent = 'Enable location to see distance.';
            return;
        }
        const d = c.distance ?? GPS.distanceTo(c.latitude, c.longitude);
        el.textContent = GPS.formatDistance(d);
    }

    // ============ Check-in ============
    async function doCheckin() {
        if (!currentDetail) return;
        UI.showLoading('Checking your location...');
        try {
            const pos = await GPS.getCurrent();
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
            const stats = await API.getStats();
            updateStats(stats);
            UI.showCheckinSuccess(currentDetail);
        } catch (err) {
            UI.hideLoading();
            const msg = (err.data && err.data.message) || err.message || 'Check-in failed.';
            UI.toast(msg, 'error');
        }
    }

    // ============ Profile ============
    function bindProfile() {
        document.getElementById('logout-btn').onclick = async () => {
            await Auth.logout();
            UI.toast('Logged out.', 'info');
        };
    }

    return { init, onAuthSuccess, openDetail };
})();

document.addEventListener('DOMContentLoaded', () => App.init());