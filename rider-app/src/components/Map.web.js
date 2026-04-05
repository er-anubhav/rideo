import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { CONFIG } from '@/config/config';

/**
 * Web Map component powered by Leaflet + OpenStreetMap.
 * Dynamically loads leaflet from CDN so it doesn't affect the native bundle.
 */

// Mock no-op components for web platform
export const Marker = ({ children }) => (children ? <>{children}</> : null);
export const Polyline = () => null;
export const UrlTile = () => null;

let leafletLoadPromise = null;

function loadLeaflet() {
    if (leafletLoadPromise) return leafletLoadPromise;
    leafletLoadPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return resolve(null);
        if (window.L) return resolve(window.L);

        // Load Leaflet CSS
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => resolve(window.L);
        script.onerror = () => reject(new Error('Failed to load Leaflet'));
        document.head.appendChild(script);
    });
    return leafletLoadPromise;
}

const Map = React.forwardRef(({
    region,
    initialRegion,
    style,
    showsUserLocation,
    children,
}, ref) => {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const userMarkerRef = useRef(null);

    const lat = region?.latitude ?? initialRegion?.latitude ?? 12.9716;
    const lng = region?.longitude ?? initialRegion?.longitude ?? 77.5946;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let cancelled = false;

        loadLeaflet().then((L) => {
            if (cancelled || !L || !mapContainerRef.current) return;

            if (!mapInstanceRef.current) {
                // Fix default icon paths for Leaflet on web
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                });

                mapInstanceRef.current = L.map(mapContainerRef.current, {
                    zoomControl: false,
                    attributionControl: false,
                }).setView([lat, lng], 14);

                L.tileLayer(CONFIG.MAP_TILE_URL_TEMPLATE, {
                    maxZoom: 19,
                }).addTo(mapInstanceRef.current);
            } else {
                mapInstanceRef.current.setView([lat, lng]);
            }

            if (showsUserLocation) {
                if (userMarkerRef.current) {
                    userMarkerRef.current.setLatLng([lat, lng]);
                } else {
                    const userIcon = L.divIcon({
                        html: `<div style="
                            width:16px;height:16px;background:#9333EA;
                            border:3px solid white;border-radius:50%;
                            box-shadow:0 0 0 4px rgba(147,51,234,0.25)">
                        </div>`,
                        className: '',
                        iconSize: [22, 22],
                        iconAnchor: [11, 11],
                    });
                    userMarkerRef.current = L.marker([lat, lng], { icon: userIcon })
                        .addTo(mapInstanceRef.current);
                }
            }
        }).catch(() => {});

        return () => { cancelled = true; };
    }, [lat, lng, showsUserLocation]);

    // Invalidate map size whenever style changes (fixes grey tiles on layout changes)
    useEffect(() => {
        if (mapInstanceRef.current) {
            setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
        }
    }, [style]);

    return (
        <View ref={ref} style={[styles.container, style]}>
            {/* eslint-disable-next-line react/no-unknown-property */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </View>
    );
});

Map.displayName = 'Map';
export default Map;

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: '#E9E9E9',
    },
});
