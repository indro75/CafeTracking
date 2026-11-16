/**
 * CafeteriaTrail — Map Controller
 * Leaflet map manager with high-DPI custom markers, responsive layout fixes,
 * Apple Safari / Samsung Internet WebKit tile sizing fixes, and route rendering.
 */
const Map = (() => {
    let map = null;
    let detailMap = null;
    let userMarker = null;
    let markers = {}; // id -> L.Marker
    let currentFilter = 'all';
    let allCafeterias = [];
    let visitedIds = new Set();
    let hasCenteredInitial = false;

    // Default fallback coordinate (cluster center)
    const DEFAULT_CENTER = [22.822, 89.551];

    function createCustomMarkerIcon(isVisited) {
        if (isVisited) {
            return L.divIcon({
                className: 'custom-map-marker-wrap',
                html: `
                    <div class="custom-marker visited-marker" title="Visited">
                        <span class="marker-symbol">✓</span>
                    </div>
                `,
                iconSize: [36, 36],
                iconAnchor: [18, 36],
                popupAnchor: [0, -36],
            });
        }

        return L.divIcon({
            className: 'custom-map-marker-wrap',
            html: `
                <div class="custom-marker standard-marker" title="Cafeteria">
                    <span class="marker-symbol">☕</span>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
        });
    }

    function createUserMarkerIcon() {
        return L.divIcon({
            className: 'user-marker-wrap',
            html: `
                <div class="user-pulse"></div>
                <div class="user-dot"></div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
        });
    }

    function init() {
        if (map) return;
        const container = document.getElementById('map');
        if (!container) return;

        map = L.map('map', {
            zoomControl: false, // Repositioned cleanly for mobile thumb reach
            attributionControl: true,
            tap: true, // Fix for iOS Safari tap event handling
        }).setView(DEFAULT_CENTER, 14);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
            maxZoom: 19,
            keepBuffer: 4,
        }).addTo(map);

        const locateBtn = document.getElementById('locate-map-btn');
        if (locateBtn) locateBtn.onclick = centerOnUser;

        // Map filter chips
        document.querySelectorAll('[data-map-filter]').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('[data-map-filter]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.mapFilter;
                renderMarkers();
            };
        });

        // Listen for GPS updates
        GPS.onChange(pos => {
            if (pos.lat != null && pos.lng != null) {
                updateUserMarker(pos.lat, pos.lng);
            }
        });
    }

    function ensureInit() {
        if (!map) init();
        // WebKit (Safari / Samsung) needs multi-stage invalidateSize to avoid blank tiles
        requestAnimationFrame(() => {
            if (map) map.invalidateSize();
        });
        setTimeout(() => {
            if (map) {
                map.invalidateSize();
                if (!hasCenteredInitial && allCafeterias.length > 0) {
                    fitAll();
                    hasCenteredInitial = true;
                }
            }
        }, 150);
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 400);
    }

    function updateUserMarker(lat, lng) {
        if (!map) return;
        if (!userMarker) {
            userMarker = L.marker([lat, lng], {
                icon: createUserMarkerIcon(),
                zIndexOffset: 2000,
            }).addTo(map).bindPopup('<strong>Your Location</strong>');
        } else {
            userMarker.setLatLng([lat, lng]);
        }
    }

    function centerOnUser() {
        UI.showLoading('Locating you...');
        GPS.getCurrent(true)
            .then(pos => {
                UI.hideLoading();
                if (map && pos.lat != null) {
                    map.flyTo([pos.lat, pos.lng], 16, { duration: 1.2 });
                    updateUserMarker(pos.lat, pos.lng);
                }
            })
            .catch(err => {
                UI.hideLoading();
                UI.toast(err.message, 'warning');
            });
    }

    function setCafeterias(list) {
        allCafeterias = Array.isArray(list) ? list : [];
        renderMarkers();
        if (allCafeterias.length > 0 && !hasCenteredInitial) {
            fitAll();
        }
    }

    function setVisited(ids) {
        visitedIds = new Set(ids);
        renderMarkers();
    }

    function renderMarkers() {
        if (!map) return;

        // Clear existing markers
        Object.values(markers).forEach(m => {
            try { map.removeLayer(m); } catch {}
        });
        markers = {};

        const userPos = GPS.get();

        allCafeterias.forEach(c => {
            if (!c.latitude || !c.longitude) return;

            const isVisited = visitedIds.has(c.id);
            if (currentFilter === 'visited' && !isVisited) return;
            if (currentFilter === 'not-visited' && isVisited) return;

            const icon = createCustomMarkerIcon(isVisited);
            const marker = L.marker([c.latitude, c.longitude], { icon }).addTo(map);

            let distText = '';
            if (userPos.lat != null) {
                const distM = c.distance ?? GPS.distanceTo(c.latitude, c.longitude);
                distText = GPS.formatDistance(distM);
            }

            const imgUrl = c.image && c.image.startsWith('http')
                ? c.image
                : `https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=400&q=80`;

            const ratingFormatted = (Number(c.rating) || 0).toFixed(1);

            marker.bindPopup(`
                <div class="map-popup-card">
                    <div class="popup-header-img" style="background-image:url('${imgUrl}')">
                        ${isVisited ? '<span class="popup-visited-badge">✓ Visited</span>' : ''}
                    </div>
                    <div class="popup-content-body">
                        <h4 class="popup-title">${UI.escapeHtml(c.name)}</h4>
                        <div class="popup-meta">
                            <span class="popup-rating">★ ${ratingFormatted}</span>
                            ${distText ? `<span class="popup-distance">• 📍 ${distText}</span>` : ''}
                        </div>
                        ${c.address ? `<p class="popup-address">${UI.escapeHtml(c.address)}</p>` : ''}
                        <div class="popup-actions">
                            <button class="btn btn-outline btn-sm" data-action="details" data-id="${c.id}">
                                Details
                            </button>
                            <button class="btn btn-primary btn-sm" data-action="directions" data-id="${c.id}">
                                Directions
                            </button>
                        </div>
                    </div>
                </div>
            `, {
                maxWidth: 280,
                minWidth: 240,
                className: 'custom-leaflet-popup',
            });

            marker.on('popupopen', e => {
                const popupEl = e.popup.getElement();
                if (!popupEl) return;
                const detailsBtn = popupEl.querySelector('[data-action="details"]');
                const directionsBtn = popupEl.querySelector('[data-action="directions"]');

                if (detailsBtn) {
                    detailsBtn.onclick = () => App.openDetail(c.id);
                }
                if (directionsBtn) {
                    directionsBtn.onclick = () => {
                        map.closePopup();
                        getDirectionsTo(c);
                    };
                }
            });

            markers[c.id] = marker;
        });
    }

    async function getDirectionsTo(cafeteria) {
        if (!map) ensureInit();
        let userPos = GPS.get();

        if (userPos.lat == null) {
            UI.showLoading('Finding your location for route...');
            try {
                userPos = await GPS.getCurrent(true);
                UI.hideLoading();
            } catch (e) {
                UI.hideLoading();
                UI.toast('Please enable GPS location to get walking directions.', 'warning');
                return;
            }
        }

        Routing.showRoute(map, userPos, { lat: cafeteria.latitude, lng: cafeteria.longitude }, cafeteria);
    }

    function showDetailMap(cafeteria) {
        if (detailMap) {
            try { detailMap.remove(); } catch {}
            detailMap = null;
        }

        const container = document.getElementById('detail-map');
        if (!container) return;

        detailMap = L.map('detail-map', {
            zoomControl: true,
            tap: true,
        }).setView([cafeteria.latitude, cafeteria.longitude], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OSM',
            maxZoom: 19,
        }).addTo(detailMap);

        const isVisited = visitedIds.has(cafeteria.id);
        const icon = createCustomMarkerIcon(isVisited);
        L.marker([cafeteria.latitude, cafeteria.longitude], { icon }).addTo(detailMap);

        const userPos = GPS.get();
        if (userPos.lat != null && userPos.lng != null) {
            L.marker([userPos.lat, userPos.lng], { icon: createUserMarkerIcon() }).addTo(detailMap);
            try {
                const bounds = L.latLngBounds(
                    [userPos.lat, userPos.lng],
                    [cafeteria.latitude, cafeteria.longitude]
                );
                detailMap.fitBounds(bounds.pad(0.3));
            } catch {}
        }

        setTimeout(() => {
            if (detailMap) detailMap.invalidateSize();
        }, 150);
    }

    function fitAll() {
        if (!map || !allCafeterias.length) return;
        const validCoords = allCafeterias
            .filter(c => c.latitude && c.longitude)
            .map(c => [c.latitude, c.longitude]);

        if (!validCoords.length) return;

        try {
            const bounds = L.latLngBounds(validCoords);
            const userPos = GPS.get();
            if (userPos.lat != null && userPos.lng != null) {
                bounds.extend([userPos.lat, userPos.lng]);
            }
            map.fitBounds(bounds.pad(0.15));
        } catch (e) {
            console.warn('fitAll error:', e);
        }
    }

    return {
        init,
        ensureInit,
        setCafeterias,
        setVisited,
        getDirectionsTo,
        showDetailMap,
        centerOnUser,
        fitAll,
    };
})();
