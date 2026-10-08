/**
 * API client — wraps fetch() with CSRF handling and JSON parsing.
 */
const API = (() => {
    const BASE = 'http://localhost:8000/api';

    function getCookie(name) {
        const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? m.pop() : '';
    }

    async function request(path, options = {}) {
        const url = path.startsWith('http') ? path : `${BASE}${path}`;
        const headers = {
            'Accept': 'application/json',
            ...(options.headers || {}),
        };
        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        // CSRF for mutating requests
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes((options.method || 'GET').toUpperCase())) {
            headers['X-CSRFToken'] = getCookie('csrftoken');
        }
        const res = await fetch(url, {
            credentials: 'include',
            ...options,
            headers,
        });
        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = text; }
        if (!res.ok) {
            const err = new Error((data && (data.detail || data.message)) || `Request failed (${res.status})`);
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    }

    return {
        get: (p, q) => request(p + (q ? '?' + new URLSearchParams(q).toString() : '')),
        post: (p, body) => request(p, { method: 'POST', body }),
        patch: (p, body) => request(p, { method: 'PATCH', body }),

        // Auth
        register: (d) => request('/auth/register/', { method: 'POST', body: d }),
        login: (d) => request('/auth/login/', { method: 'POST', body: d }),
        logout: () => request('/auth/logout/', { method: 'POST' }),
        me: () => request('/auth/me/'),
        updateProfile: (d) => request('/auth/profile/', { method: 'PATCH', body: d }),

        // Cafeterias
        listCafeterias: (q) => request('/cafeterias/', q),
        getCafeteria: (id, q) => request(`/cafeterias/${id}/`, q),
        nearbyCafeterias: (q) => request('/cafeterias/nearby/', q),

        // Visits
        listVisits: () => request('/visits/'),
        getStats: () => request('/visits/stats/'),
        checkin: (d) => request('/visits/checkin/', { method: 'POST', body: d }),
    };
})();