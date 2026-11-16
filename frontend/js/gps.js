/**
 * CafeteriaTrail — GPS & Location Module
 * High-compatibility geolocation handler designed for Apple (iOS Safari),
 * Samsung Internet, Android Chrome, and desktop browsers.
 * Features fast fallback, secure-context checks, and error resilience.
 */
const GPS = (() => {
    let current = { lat: null, lng: null, accuracy: null, timestamp: null };
    let watchId = null;
    let isRequesting = false;
    const listeners = [];

    function isSecure() {
        if (typeof window === 'undefined') return true;
        if (window.isSecureContext !== undefined) {
            return window.isSecureContext;
        }
        const host = window.location.hostname;
        return window.location.protocol === 'https:' ||
            host === 'localhost' || host === '127.0.0.1';
    }

    function isSupported() {
        return typeof navigator !== 'undefined' && 'geolocation' in navigator;
    }

    function onChange(fn) {
        if (typeof fn === 'function') listeners.push(fn);
    }

    function notify() {
        listeners.forEach(fn => {
            try { fn(current); } catch (e) { console.error('GPS listener error:', e); }
        });
    }

    function set(pos) {
        if (!pos || !pos.coords) return;
        current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy || null,
            timestamp: pos.timestamp || Date.now(),
        };
        notify();
    }

    function get() {
        return current;
    }

    function hasLocation() {
        return current.lat !== null && current.lng !== null &&
            !isNaN(current.lat) && !isNaN(current.lng);
    }

    function friendlyError(err) {
        if (!isSecure()) {
            return 'Location requires HTTPS on mobile devices (iOS Safari & Samsung Browser). Please use HTTPS.';
        }
        if (!err) return 'Location could not be determined.';
        switch (err.code) {
            case 1: // PERMISSION_DENIED
                return 'Location permission was denied. Please allow location in your browser settings to find cafeterias near you.';
            case 2: // POSITION_UNAVAILABLE
                return 'GPS signal unavailable. Trying Wi-Fi / network location...';
            case 3: // TIMEOUT
                return 'Location request timed out. Please tap "Locate me" again.';
            default:
                return err.message || 'Unknown location error.';
        }
    }

    function requestOnce(options) {
        return new Promise((resolve, reject) => {
            if (!isSupported()) {
                reject(new Error('Geolocation is not supported by this browser.'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    }

    /**
     * Get current location with fast dual-tier fallback:
     * 1. Try quick cached or network location (faster, works indoors)
     * 2. If needed, request GPS with graceful timeout
     */
    async function getCurrent(forceHighAccuracy = false) {
        if (!isSupported()) {
            throw new Error('Geolocation is not supported by your browser.');
        }

        if (isRequesting) {
            // Already resolving a request, return current if available
            if (hasLocation()) return current;
        }

        isRequesting = true;

        try {
            // Step 1: Try with 8-second timeout
            const pos = await requestOnce({
                enableHighAccuracy: forceHighAccuracy,
                timeout: 8000,
                maximumAge: 60000, // Accept cached position up to 1 min old for instant speed
            });
            set(pos);
            isRequesting = false;
            return current;
        } catch (err) {
            // Step 2: If timed out or unavailable, fallback to low accuracy (Wi-Fi / Cell tower)
            if (err.code === 2 || err.code === 3) {
                try {
                    const fallbackPos = await requestOnce({
                        enableHighAccuracy: false,
                        timeout: 7000,
                        maximumAge: 120000,
                    });
                    set(fallbackPos);
                    isRequesting = false;
                    return current;
                } catch (err2) {
                    isRequesting = false;
                    throw new Error(friendlyError(err2));
                }
            }
            isRequesting = false;
            throw new Error(friendlyError(err));
        }
    }

    function startWatch() {
        if (!isSupported() || watchId !== null) return;
        try {
            watchId = navigator.geolocation.watchPosition(
                pos => set(pos),
                err => {
                    // Non-fatal watch error (e.g. temporary signal drop when going indoors)
                    console.warn('GPS watch warning:', err.message);
                },
                {
                    enableHighAccuracy: false, // Use standard accuracy for continuous watch to save battery
                    maximumAge: 10000,
                    timeout: 20000,
                }
            );
        } catch (e) {
            console.warn('Failed to start watchPosition:', e.message);
        }
    }

    function stopWatch() {
        if (watchId !== null && isSupported()) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    function setManual(lat, lng) {
        set({
            coords: { latitude: Number(lat), longitude: Number(lng), accuracy: 10 },
            timestamp: Date.now(),
        });
    }

    function distanceTo(lat, lng) {
        if (current.lat == null || current.lng == null || lat == null || lng == null) return null;
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
        if (m == null || isNaN(m) || m === Infinity) return '';
        if (m < 1000) return `${Math.round(m)} m`;
        return `${(m / 1000).toFixed(1)} km`;
    }

    return {
        get,
        hasLocation,
        getCurrent,
        startWatch,
        stopWatch,
        onChange,
        distanceTo,
        formatDistance,
        setManual,
        isSupported,
        isSecure,
    };
})();
