/**
 * CafeteriaTrail — API Client
 * Robust, cross-device compatible fetch wrapper with dynamic base URL,
 * CSRF management, query serialization, and network error handling.
 */
const API = (() => {
    let cachedCsrfToken = null;

    function getBaseUrl() {
        if (window.API_BASE_URL) return window.API_BASE_URL;
        const stored = localStorage.getItem('cafeteria_api_base');
        if (stored) return stored;

        // If opened directly from local disk (file:///...)
        if (window.location.protocol === 'file:' || !window.location.hostname) {
            return 'http://localhost:8000/api';
        }

        const host = window.location.hostname;
        const port = window.location.port;

        // When testing via Live Server (port 5500) or Vite (5173) or Next/React (3000) on local Wi-Fi / LAN IP:
        const isLan = host === 'localhost' || host === '127.0.0.1' ||
            /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

        if (isLan && port && port !== '8000') {
            return `http://${host}:8000/api`;
        }

        return '/api';
    }

    const BASE = getBaseUrl();

    function getCookie(name) {
        if (typeof document === 'undefined') return '';
        const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? decodeURIComponent(m.pop()) : '';
    }

    function buildQuery(params) {
        if (!params || typeof params !== 'object') return '';
        const search = new URLSearchParams();
        for (const [key, val] of Object.entries(params)) {
            if (val !== null && val !== undefined && val !== '') {
                search.append(key, String(val));
            }
        }
        const qs = search.toString();
        return qs ? `?${qs}` : '';
    }

    async function ensureCsrf() {
        if (cachedCsrfToken) return cachedCsrfToken;
        const cookieToken = getCookie('csrftoken');
        if (cookieToken) {
            cachedCsrfToken = cookieToken;
            return cachedCsrfToken;
        }
        try {
            const res = await fetch(`${BASE}/auth/csrf/`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                if (data && data.csrfToken) {
                    cachedCsrfToken = data.csrfToken;
                    return cachedCsrfToken;
                }
            }
        } catch (e) {
            console.warn('Could not pre-fetch CSRF token:', e.message);
        }
        return getCookie('csrftoken') || '';
    }

    async function request(path, options = {}) {
        const url = path.startsWith('http') ? path : `${BASE}${path}`;
        const method = (options.method || 'GET').toUpperCase();
        const headers = {
            'Accept': 'application/json',
            ...(options.headers || {}),
        };

        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }

        // Include CSRF token for mutating requests
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            const csrf = await ensureCsrf();
            if (csrf) {
                headers['X-CSRFToken'] = csrf;
            }
        }

        let res;
        try {
            res = await fetch(url, {
                credentials: 'include',
                ...options,
                headers,
            });
        } catch (netErr) {
            let friendly;
            if (window.navigator && !window.navigator.onLine) {
                friendly = 'You appear to be offline. Please check your internet connection.';
            } else if (window.location.protocol === 'file:') {
                friendly = 'App opened as file://. Please run the server and open http://localhost:8000 in your browser.';
            } else if (BASE.includes('localhost') || BASE.includes('127.0.0.1') || BASE === '/api') {
                friendly = `Unable to connect to the backend (${BASE}). Please ensure your Django server is running: "python backend/manage.py runserver 8000"`;
            } else {
                friendly = 'Unable to connect to the server. If starting up on Render, please allow 30 seconds for wake-up.';
            }
            const err = new Error(friendly);
            err.isNetwork = true;
            throw err;
        }

        const text = await res.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        // Cache CSRF token if returned in response JSON
        if (data && typeof data === 'object' && data.csrfToken) {
            cachedCsrfToken = data.csrfToken;
        }

        if (!res.ok) {
            let errorMsg = `Request failed (${res.status})`;
            if (data && typeof data === 'object') {
                if (data.detail) errorMsg = data.detail;
                else if (data.message) errorMsg = data.message;
                else if (data.non_field_errors) errorMsg = data.non_field_errors.join(' ');
                else {
                    const firstVal = Object.values(data)[0];
                    if (Array.isArray(firstVal)) errorMsg = firstVal.join(' ');
                    else if (typeof firstVal === 'string') errorMsg = firstVal;
                }
            }
            const err = new Error(errorMsg);
            err.status = res.status;
            err.data = data;
            throw err;
        }

        return data;
    }

    return {
        BASE,
        get: (p, q) => request(`${p}${buildQuery(q)}`, { method: 'GET' }),
        post: (p, body) => request(p, { method: 'POST', body }),
        patch: (p, body) => request(p, { method: 'PATCH', body }),
        delete: (p) => request(p, { method: 'DELETE' }),

        // Auth
        csrf: () => ensureCsrf(),
        register: (d) => request('/auth/register/', { method: 'POST', body: d }),
        login: (d) => request('/auth/login/', { method: 'POST', body: d }),
        logout: () => request('/auth/logout/', { method: 'POST' }),
        me: () => request('/auth/me/'),
        updateProfile: (d) => request('/auth/profile/', { method: 'PATCH', body: d }),

        // Cafeterias
        listCafeterias: (q) => request(`/cafeterias/${buildQuery(q)}`),
        getCafeteria: (id, q) => request(`/cafeterias/${id}/${buildQuery(q)}`),
        nearbyCafeterias: (q) => request(`/cafeterias/nearby/${buildQuery(q)}`),

        // Visits
        listVisits: () => request('/visits/'),
        getStats: () => request('/visits/stats/'),
        checkin: (d) => request('/visits/checkin/', { method: 'POST', body: d }),
    };
})();
