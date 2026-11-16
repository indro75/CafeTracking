/**
 * CafeteriaTrail — UI Components & Rendering Helpers
 * Clean, modern design system components, cards, popups, and toast notifications.
 */
const UI = (() => {

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function toast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const el = document.createElement('div');
        el.className = `toast ${type}`;

        const iconMap = {
            success: '✓',
            error: '✕',
            info: 'ℹ',
            warning: '⚠'
        };

        el.innerHTML = `
            <span class="toast-icon">${iconMap[type] || 'ℹ'}</span>
            <span class="toast-message">${escapeHtml(message)}</span>
            <button class="toast-close" aria-label="Dismiss">&times;</button>
        `;

        const closeBtn = el.querySelector('.toast-close');
        const removeToast = () => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px) scale(0.95)';
            setTimeout(() => el.remove(), 250);
        };

        closeBtn.onclick = removeToast;
        container.appendChild(el);

        const timer = setTimeout(removeToast, duration);
        el.addEventListener('mouseenter', () => clearTimeout(timer));
    }

    function showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const label = document.getElementById('loading-text');
        if (label) label.textContent = text;
        if (overlay) overlay.classList.remove('hidden');
    }

    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    }

    function showCheckinSuccess(cafeteria) {
        const overlay = document.createElement('div');
        overlay.className = 'checkin-success';
        overlay.innerHTML = `
            <div class="checkin-success-inner">
                <div class="checkin-success-icon">🎉</div>
                <h3>Check-in Confirmed!</h3>
                <p class="checkin-caf-name">${escapeHtml(cafeteria.name)}</p>
                <div class="checkin-badge">+1 Cafeteria Visited</div>
                <button class="btn btn-primary" id="checkin-done-btn">Awesome!</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const dismiss = () => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 250);
        };

        const doneBtn = overlay.querySelector('#checkin-done-btn');
        if (doneBtn) doneBtn.onclick = dismiss;
        overlay.onclick = (e) => {
            if (e.target === overlay) dismiss();
        };

        setTimeout(dismiss, 3500);
    }

    function renderStars(rating) {
        const num = parseFloat(rating) || 0;
        const fullStars = Math.floor(num);
        const hasHalf = num % 1 >= 0.3 && num % 1 <= 0.8;
        let starStr = '★'.repeat(fullStars);
        if (hasHalf) starStr += '½';
        while (starStr.replace('½', ' ').length < 5) starStr += '☆';
        return starStr;
    }

    function isCafeteriaOpen(openingTime, closingTime) {
        if (!openingTime || !closingTime) return null;
        try {
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();

            const [oH, oM] = openingTime.split(':').map(Number);
            const [cH, cM] = closingTime.split(':').map(Number);

            const openMinutes = oH * 60 + (oM || 0);
            const closeMinutes = cH * 60 + (cM || 0);

            if (closeMinutes > openMinutes) {
                return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
            } else {
                // Crosses midnight
                return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
            }
        } catch {
            return null;
        }
    }

    function cafeteriaCard(c, { visited, distance } = {}) {
        const isVisited = visited ?? c.is_visited;
        const dist = distance ?? c.distance;
        const distText = dist != null ? GPS.formatDistance(dist) : '';
        const imgUrl = c.image && c.image.startsWith('http')
            ? c.image
            : `https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80`;

        const openStatus = isCafeteriaOpen(c.opening_time, c.closing_time);
        let openBadge = '';
        if (openStatus === true) {
            openBadge = '<span class="badge badge-open">Open Now</span>';
        } else if (openStatus === false) {
            openBadge = '<span class="badge badge-closed">Closed</span>';
        }

        const ratingNum = (Number(c.rating) || 0).toFixed(1);

        return `
            <article class="card ${isVisited ? 'is-visited' : ''}" data-id="${c.id}">
                <div class="card-img-wrap">
                    <div class="card-img" style="background-image:url('${imgUrl}')"></div>
                    <div class="card-badges-top">
                        ${openBadge}
                        ${isVisited ? '<span class="badge badge-visited"><span class="badge-icon">✓</span> Visited</span>' : ''}
                    </div>
                    <div class="card-rating-pill">
                        <span class="star-icon">★</span>
                        <span class="rating-num">${ratingNum}</span>
                    </div>
                </div>
                <div class="card-body">
                    <h3 class="card-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</h3>
                    
                    <div class="card-info-row">
                        ${distText ? `
                            <span class="card-distance" title="Distance from you">
                                <span class="info-icon">📍</span> ${distText}
                            </span>
                        ` : `
                            <span class="card-distance muted">
                                <span class="info-icon">📍</span> Locating...
                            </span>
                        `}
                        ${c.address ? `
                            <span class="card-address" title="${escapeHtml(c.address)}">
                                • ${escapeHtml(c.address)}
                            </span>
                        ` : ''}
                    </div>

                    ${c.description ? `
                        <p class="card-snippet">${escapeHtml(c.description)}</p>
                    ` : ''}

                    <div class="card-actions">
                        <button class="btn btn-outline" data-action="details">
                            Details
                        </button>
                        <button class="btn btn-primary" data-action="directions">
                            <span class="btn-icon">🧭</span> Directions
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    return {
        escapeHtml,
        toast,
        showLoading,
        hideLoading,
        showCheckinSuccess,
        renderStars,
        isCafeteriaOpen,
        cafeteriaCard,
    };
})();
