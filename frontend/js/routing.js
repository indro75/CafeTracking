/**
 * Routing — uses OSRM via Leaflet Routing Machine.
 */
const Routing = (() => {
    let control = null;
    let panelEl = null;

    function showRoute(map, from, to, cafeteria) {
        clearRoute(map);

        control = L.Routing.control({
            waypoints: [
                L.latLng(from.lat, from.lng),
                L.latLng(to.lat, to.lng),
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'foot', // walking
            }),
            lineOptions: {
                styles: [
                    { color: '#2563eb', weight: 6, opacity: 0.85 },
                    { color: '#ffffff', weight: 2, opacity: 0.4 },
                ],
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            showAlternatives: false,
            createMarker: () => null, // we already have markers
            show: false, // we build our own panel
        }).addTo(map);

        control.on('routesfound', e => {
            const route = e.routes[0];
            const distKm = route.summary.totalDistance / 1000;
            const distM = route.summary.totalDistance;
            const timeMin = Math.max(1, Math.round(route.summary.totalTime / 60));
            showPanel(cafeteria, distM, timeMin, map);
        });

        control.on('routingerror', () => {
            UI.toast('Could not calculate route. Please try again.', 'error');
        });
    }

    function showPanel(cafeteria, distM, timeMin, map) {
        removePanel();
        panelEl = document.createElement('div');
        panelEl.className = 'routing-panel';
        panelEl.innerHTML = `
            <h4>Route to ${UI.escapeHtml(cafeteria.name)}</h4>
            <div class="routing-stats">
                <span>📏 ${distM < 1000 ? Math.round(distM) + ' m' : (distM/1000).toFixed(1) + ' km'}</span>
                <span>🚶 ${timeMin} min walking</span>
            </div>
            <div class="routing-actions">
                <button class="btn btn-primary" id="routing-clear">Clear Route</button>
            </div>
        `;
        document.querySelector('.map-wrap').appendChild(panelEl);
        document.getElementById('routing-clear').onclick = () => {
            clearRoute(map);
        };
    }

    function removePanel() {
        if (panelEl && panelEl.parentNode) panelEl.parentNode.removeChild(panelEl);
        panelEl = null;
    }

    function clearRoute(map) {
        if (control) {
            map.removeControl(control);
            control = null;
        }
        removePanel();
    }

    return { showRoute, clearRoute };
})();