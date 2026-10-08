/**
 * Map controller — Leaflet + markers + popups + user location.
 */
const Map = (() => {
    let map = null;
    let detailMap = null;
    let userMarker = null;
    let markers = {}; // id -> L.Marker
    let currentFilter = 'all';
    let allCafeterias = [];
    let visitedIds = new Set();

    const defaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
    });

    function init() {
        if (map) return;
        map = L.map('map', { zoomControl: true }).setView([22.55, 88.35], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        document.getElementById('locate-map-btn').onclick = centerOnUser;

        // Map filter chips
        document.querySelectorAll('[data-map-filter]').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('[data-map-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.mapFilter;
                renderMarkers();
            };
        });

        GPS.onChange(pos => {
            if (pos.lat != null) updateUserMarker(pos.lat, pos.lng);
        });
    }

    function ensureInit() {
        if (!map) init();
        // Leaflet needs invalidateSize when the map container becomes visible
        setTimeout(() => map && map.invalidateSize(), 50);
    }

    function updateUserMarker(lat, lng) {
        if (!userMarker) {
            const icon = L.divIcon({
                className: '',
                html: '<div class="marker-user"></div>',
                iconSize: [22, 22], iconAnchor: [11, 11],
            });
            userMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 })
                .addTo(map).bindPopup('You are here');
            map.setView([lat, lng], 15);
        } else {
            userMarker.setLatLng([lat, lng]);
        }
    }

    function centerOnUser() {
        GPS.getCurrent().then(pos => {
            if (map) map.setView([pos.lat, pos.lng], 15);
        }).catch(err => UI.toast(err.message, 'error'));
    }

    function setCafeterias(list) {
        allCafeterias = list;
        renderMarkers();
    }

    function setVisited(ids) {
        visitedIds = new Set(ids);
        renderMarkers();
    }

    function renderMarkers() {
        if (!map) return;
        // Remove existing
        Object.values(markers).forEach(m => map.removeLayer(m));
        markers = {};

        const userPos = GPS.get();

        allCafeterias.forEach(c => {
            const isVisited = visitedIds.has(c.id);
            if (currentFilter === 'visited' && !isVisited) return;
            if (currentFilter === 'not-visited' && isVisited) return;

            const icon = isVisited
                ? L.divIcon({
                    className: '',
                    html: '<div class="marker-visited">✓</div>',
                    iconSize: [32, 32], iconAnchor: [16, 16],
                })
                : defaultIcon;

            const marker = L.marker([c.latitude, c.longitude], { icon }).addTo(map);

            let distText = '';
            if (userPos.lat != null && c.distance != null) {
                distText = GPS.formatDistance(c.distance);
            } else if (userPos.lat != null) {
                const d = GPS.distanceTo(c.latitude, c.longitude);
                distText = GPS.formatDistance(d);
            }

            const stars = '★'.repeat(Math.round(c.rating)) + '☆'.repeat(5 - Math.round(c.rating));
            marker.bindPopup(`
                <div class="popup-title">${UI.escapeHtml(c.name)}</div>
                <div class="popup-rating">${stars} ${c.rating}</div>
                <div class="popup-distance">${distText || ''}${isVisited ? ' · <span style="color:#16a34a;font-weight:600">✓ Visited</span>' : ''}</div>
                <div class="popup-actions">
                    <button class="popup-btn-primary" data-action="directions" data-id="${c.id}">Directions</button>
                    <button class="popup-btn-ghost" data-action="details" data-id="${c.id}">Details</button>
                </div>
            `);

            marker.on('popupopen', e => {
                const popupEl = e.popup.getElement();
                popupEl.querySelector('[data-action="details"]').onclick = () => App.openDetail(c.id);
                popupEl.querySelector('[data-action="directions"]').onclick = () => {
                    App.openDetail(c.id, true);
                };
            });

            markers[c.id] = marker;
        });
    }

    function getDirectionsTo(cafeteria) {
        if (!map) return;
        const userPos = GPS.get();
        if (userPos.lat == null) {
            UI.toast('Enable location to get directions.', 'error');
            return;
        }
        Routing.showRoute(map, userPos, { lat: cafeteria.latitude, lng: cafeteria.longitude }, cafeteria);
    }

    // Detail page mini-map
    function showDetailMap(cafeteria) {
        if (detailMap) {
            detailMap.remove();
            detailMap = null;
        }
        detailMap = L.map('detail-map').setView([cafeteria.latitude, cafeteria.longitude], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OSM', maxZoom: 19,
        }).addTo(detailMap);

        const isVisited = visitedIds.has(cafeteria.id);
        const icon = isVisited
            ? L.divIcon({
                className: '',
                html: '<div class="marker-visited">✓</div>',
                iconSize: [32, 32], iconAnchor: [16, 16],
            })
            : defaultIcon;
        L.marker([cafeteria.latitude, cafeteria.longitude], { icon }).addTo(detailMap);

        const userPos = GPS.get();
        if (userPos.lat != null) {
            const uIcon = L.divIcon({
                className: '',
                html: '<div class="marker-user"></div>',
                iconSize: [22, 22], iconAnchor: [11, 11],
            });
            L.marker([userPos.lat, userPos.lng], { icon: uIcon }).addTo(detailMap);
            detailMap.fitBounds(L.latLngBounds(
                [userPos.lat, userPos.lng],
                [cafeteria.latitude, cafeteria.longitude]
            ).pad(0.3));
        }
        setTimeout(() => detailMap.invalidateSize(), 100);
    }

    function fitAll() {
        if (!map || !allCafeterias.length) return;
        const bounds = L.latLngBounds(allCafeterias.map(c => [c.latitude, c.longitude]));
        map.fitBounds(bounds.pad(0.2));
    }

    return {
        init, ensureInit, setCafeterias, setVisited,
        getDirectionsTo, showDetailMap, centerOnUser, fitAll,
    };
})();