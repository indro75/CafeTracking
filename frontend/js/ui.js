/**
 * UI helpers — toasts, loading, card rendering.
 */
const UI = (() => {

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function toast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.style.transition = 'opacity 0.3s, transform 0.3s';
            el.style.opacity = '0';
            el.style.transform = 'translateX(120%)';
            setTimeout(() => el.remove(), 300);
        }, duration);
    }

    function showLoading(text = 'Loading...') {
        document.getElementById('loading-text').textContent = text;
        document.getElementById('loading-overlay').classList.remove('hidden');
    }
    function hideLoading() {
        document.getElementById('loading-overlay').classList.add('hidden');
    }

    function showCheckinSuccess(cafeteria) {
        const overlay = document.createElement('div');
        overlay.className = 'checkin-success';
        overlay.innerHTML = `
            <div class="checkin-success-inner">
                <div class="checkin-success-icon">✓</div>
                <h3>Cafeteria Visited!</h3>
                <p>${escapeHtml(cafeteria.name)}</p>
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.onclick = () => overlay.remove();
        setTimeout(() => overlay.remove(), 2500);
    }

    function renderStars(rating) {
        const r = Math.round(Number(rating) || 0);
        return '★'.repeat(r) + '☆'.repeat(5 - r);
    }

    function cafeteriaCard(c, { visited, distance } = {}) {
        const isVisited = visited ?? c.is_visited;
        const dist = distance ?? c.distance;
        const distText = dist != null ? GPS.formatDistance(dist) : '';
        const imgUrl = c.image || `https://picsum.photos/seed/caf-${c.id}/600/400`;

        return `
            <article class="card" data-id="${c.id}">
                <div class="card-img" style="background-image:url('${imgUrl}')">
                    ${isVisited ? '<span class="card-visited-badge">✓ Visited</span>' : ''}
                </div>
                <div class="card-body">
                    <h3 class="card-name">${escapeHtml(c.name)}</h3>
                    <div class="card-rating">${renderStars(c.rating)} ${c.rating}</div>
                    ${distText ? `<div class="card-distance">${distText}</div>` : ''}
                    <div class="card-address">${escapeHtml(c.address || '')}</div>
                    <div class="card-actions">
                        <button class="btn btn-primary" data-action="details">View Details</button>
                        <button class="btn btn-ghost" data-action="directions">Directions</button>
                    </div>
                </div>
            </article>
        `;
    }

    return { escapeHtml, toast, showLoading, hideLoading, showCheckinSuccess, renderStars, cafeteriaCard };
})();