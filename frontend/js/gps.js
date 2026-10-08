/**
 * GPS manager — wraps browser Geolocation API.
 */
const GPS = (() => {
    let current = { lat: null, lng: null, accuracy: null };
    let watchId = null;
    const listeners = new Set();

    function onChange(fn) { listeners.add(fn); fn(current); }
    function offChange(fn) { listeners.delete(fn); }
    function notify() { listeners.forEach(fn => fn(current)); }

    function isSupported() { return 'geolocation' in navigator; }

    function friendlyError(code) {
        switch (code) {
            case 1: return 'Location access is required to calculate your distance and verify visits.';
            case 2: return 'Location unavailable. Please check your device settings.';
            case 3: return 'Location request timed out. Please try again.';
            default: return 'Unable to determine your location.';
        }
    }

    function getCurrent() {
        return new Promise((resolve, reject) => {
            if (!isSupported()) return reject(new Error('Geolocation not supported.'));
            navigator.geolocation.getCurrentPosition(
                pos => {
                    current = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    };
                    notify();
                    resolve(current);
                },
                err => reject(new Error(friendlyError(err.code))),
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    function startWatch() {
        if (!isSupported() || watchId !== null) return;
        watchId = navigator.geolocation.watchPosition(
            pos => {
                current = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                };
                notify();
            },
            err => console.warn('GPS watch error:', friendlyError(err.code)),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );
    }

    function stopWatch() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    function get() { return current; }

    // Haversine distance in meters
    function distanceTo(lat2, lng2) {
        if (current.lat == null) return null;
        const R = 6371000;
        const toRad = x => x * Math.PI / 180;
        const dLat = toRad(lat2 - current.lat);
        const dLng = toRad(lng2 - current.lng);
        const a = Math.sin(dLat/2)**2 +
                  Math.cos(toRad(current.lat)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLng/2)**2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    function formatDistance(m) {
        if (m == null) return '';
        if (m < 1000) return `${Math.round(m)} m away`;
        return `${(m/1000).toFixed(1)} km away`;
    }

    return { getCurrent, startWatch, stopWatch, get, distanceTo, formatDistance, onChange, offChange, isSupported };
})();