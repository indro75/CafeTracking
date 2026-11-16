/**
 * CafeteriaTrail — Routing Module
 * Calculates walking routes using OSRM with automatic straight-line fallback
 * and native map app integration (Apple Maps / Google Maps).
 */
const Routing = (() => {
    let control = null;
    let fallbackPolyline = null;
    let panelEl = null;

    function isAppleDevice() {
        if (typeof navigator === 'undefined') return false;
        return /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    }

    function getNativeMapUrl(lat, lng, label = 'Cafeteria') {
        const encoded = encodeURIComponent(label);
        if (isAppleDevice()) {
            return `https://maps.apple.com/?daddr=${lat},${lng}&q=${encoded}`;
        }
        return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
    }

    function showRoute(map, from, to, cafeteria) {
        clearRoute(map);

        if (!L.Routing || !L.Routing.control) {
            drawFallbackLine(map, from, to, cafeteria);
            return;
        }

        try {
            control = L.Routing.control({
                waypoints: [
                    L.latLng(from.lat, from.lng),
                    L.latLng(to.lat, to.lng),
                ],
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1',
                    profile: 'foot',
                    timeout: 8000,
                }),
                lineOptions: {
                    styles: [
                        { color: '#1d4ed8', weight: 7, opacity: 0.9 },
                        { color: '#60a5fa', weight: 4, opacity: 1 },
                    ],
                },
                addWaypoints: false,
                draggableWaypoints: false,
                fitSelectedRoutes: true,
                showAlternatives: false,
                createMarker: () => null,
                show: false,
            }).addTo(map);

            control.on('routesfound', e => {
                if (!e.routes || !e.routes.length) return;
                const route = e.routes[0];
                const distM = route.summary.totalDistance;
                const timeMin = Math.max(1, Math.round(route.summary.totalTime / 60));
                showPanel(cafeteria, distM, timeMin, to, map);
            });

            control.on('routingerror', () => {
                // If public OSRM is blocked or slow, use straight-line fallback
                drawFallbackLine(map, from, to, cafeteria);
            });
        } catch (e) {
            console.warn('Routing control error:', e);
            drawFallbackLine(map, from, to, cafeteria);
        }
    }

    function drawFallbackLine(map, from, to, cafeteria) {
        if (fallbackPolyline) map.removeLayer(fallbackPolyline);

        const latlngs = [
            [from.lat, from.lng],
            [to.lat, to.lng],
        ];

        fallbackPolyline = L.polyline(latlngs, {
            color: '#2563eb',
            weight: 5,
            dashArray: '8, 8',
            opacity: 0.85,
        }).addTo(map);

        map.fitBounds(fallbackPolyline.getBounds().pad(0.25));

        const distM = GPS.distanceTo(to.lat, to.lng) || 0;
        const walkingMinutes = Math.max(1, Math.round((distM / 80))); // ~80m per minute walking
        showPanel(cafeteria, distM, walkingMinutes, to, map, true);
    }

    function showPanel(cafeteria, distM, timeMin, toCoord, map, isFallback = false) {
        removePanel();
        panelEl = document.createElement('div');
        panelEl.className = 'routing-panel';

        const nativeUrl = getNativeMapUrl(toCoord.lat, toCoord.lng, cafeteria.name);
        const nativeName = isAppleDevice() ? 'Apple Maps' : 'Google Maps';
        const distFormatted = GPS.formatDistance(distM);

        panelEl.innerHTML = `
            <div class="routing-panel-header">
                <div>
                    <h4 class="routing-title">Walking to ${UI.escapeHtml(cafeteria.name)}</h4>
                    ${isFallback ? '<div class="routing-note">Estimated direct trail route</div>' : ''}
                </div>
                <button class="routing-close-btn" id="routing-close-x" aria-label="Close route">&times;</button>
            </div>
            
            <div class="routing-stats-bar">
                <div class="routing-stat-item">
                    <span class="routing-stat-icon">📏</span>
                    <div>
                        <div class="routing-stat-val">${distFormatted}</div>
                        <div class="routing-stat-lbl">Distance</div>
                    </div>
                </div>
                <div class="routing-stat-item">
                    <span class="routing-stat-icon">🚶</span>
                    <div>
                        <div class="routing-stat-val">~${timeMin} min</div>
                        <div class="routing-stat-lbl">Walking time</div>
                    </div>
                </div>
            </div>

            <div class="routing-actions">
                <a href="${nativeUrl}" target="_blank" rel="noopener" class="btn btn-primary routing-nav-btn">
                    <span class="btn-icon">🗺</span> Open in ${nativeName}
                </a>
                <button class="btn btn-outline" id="routing-clear">
                    Clear Route
                </button>
            </div>
        `;

        const wrap = document.querySelector('.map-wrap');
        if (wrap) wrap.appendChild(panelEl);

        const clearBtn = document.getElementById('routing-clear');
        const closeX = document.getElementById('routing-close-x');
        if (clearBtn) clearBtn.onclick = () => clearRoute(map);
        if (closeX) closeX.onclick = () => clearRoute(map);
    }

    function removePanel() {
        if (panelEl && panelEl.parentNode) {
            panelEl.parentNode.removeChild(panelEl);
        }
        panelEl = null;
    }

    function clearRoute(map) {
        if (control && map) {
            try { map.removeControl(control); } catch {}
            control = null;
        }
        if (fallbackPolyline && map) {
            try { map.removeLayer(fallbackPolyline); } catch {}
            fallbackPolyline = null;
        }
        removePanel();
    }

    return { showRoute, clearRoute };
})();
