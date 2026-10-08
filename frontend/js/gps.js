/**
 * GPS module — location with smart fallback (GPS chip → Wi-Fi/network).
 */
const GPS = (() => {
    let current = { lat: null, lng: null, accuracy: null };
    let watchId = null;
    const listeners = [];

    function onChange(fn) { listeners.push(fn); }
    function notify() { listeners.forEach(fn => fn(current)); }

    function set(pos) {
        current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || null,
        };
        notify();
    }

    function get() { return current; }

    function friendlyError(err) {
        switch (err.code) {
            case err.PERMISSION_DENIED:
                return 'Location permission denied. Allow location access to use this app.';
            case err.POSITION_UNAVAILABLE:
                return 'Location unavailable. Try again near a window or outdoors.';
            case err.TIMEOUT:
                return 'Location request timed out. Please try again.';
            default:
                return 'Unknown location error.';
        }
    }

    function requestOnce(options) {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    }

    async function getCurrent() {
        if (!('geolocation' in navigator)) {
            throw new Error('Geolocation is not supported by this browser.');
        }
        // Try 1: high accuracy (real GPS chip)
        try {
            const pos = await requestOnce({ enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
            set(pos);
            return current;
        } catch (err) {
            // Try 2: fallback to Wi-Fi / network location (works indoors & on laptops)
            if (err.code === err.TIMEOUT || err.code === err.POSITION_UNAVAILABLE) {
                try {
                    const pos = await requestOnce({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
                    set(pos);
                    return current;
                } catch (err2) {
                    throw new Error(friendlyError(err2));
                }
            }
            throw new Error(friendlyError(err));
        }
    }

    function startWatch() {
        if (!('geolocation' in navigator) || watchId !== null) return;
        watchId = navigator.geolocation.watchPosition(
            set,
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
        );
    }

    function distanceTo(lat, lng) {
        if (current.lat == null || current.lng == null) return null;
        const R = 6371000;
        const toRad = x => (x * Math.PI) / 180;
        const dLat = toRad(lat - current.lat);
        const dLng = toRad(lng - current.lng);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(current.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function formatDistance(m) {
        if (m == null || isNaN(m)) return '';
        return m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(1) + ' km';
    }

    return { get, getCurrent, startWatch, onChange, distanceTo, formatDistance };
})();