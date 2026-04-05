import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

type Region = {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
};

type Point = {
    latitude: number;
    longitude: number;
};

type DriverMapProps = {
    style?: any;
    region?: Region;
    location?: { coords: { latitude: number; longitude: number } } | null;
    destination?: { lat: number; lon: number; name?: string } | null;
    driverLocation?: { latitude?: number; longitude?: number; lat?: number; lng?: number } | null;
    routeCoordinates?: Point[];
    tileUrlTemplate: string;
    interactive?: boolean;
};

declare global {
    interface Window {
        L?: any;
    }
}

let leafletLoadPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
    if (leafletLoadPromise) return leafletLoadPromise;

    leafletLoadPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return resolve(null);
        if (window.L) return resolve(window.L);

        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => resolve(window.L);
        script.onerror = () => reject(new Error('Failed to load Leaflet'));
        document.head.appendChild(script);
    });

    return leafletLoadPromise;
}

const DriverMap = ({
    style,
    region,
    location,
    destination,
    driverLocation,
    routeCoordinates,
    tileUrlTemplate,
    interactive = true,
}: DriverMapProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const layerGroupRef = useRef<any>(null);

    const centerLat = region?.latitude ?? location?.coords?.latitude ?? 28.6139;
    const centerLng = region?.longitude ?? location?.coords?.longitude ?? 77.2090;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        let cancelled = false;

        loadLeaflet()
            .then((L) => {
                if (cancelled || !L || !mapContainerRef.current) return;

                if (!mapInstanceRef.current) {
                    mapInstanceRef.current = L.map(mapContainerRef.current, {
                        zoomControl: false,
                        attributionControl: false,
                        dragging: interactive,
                        touchZoom: interactive,
                        doubleClickZoom: interactive,
                        scrollWheelZoom: interactive,
                        boxZoom: interactive,
                        keyboard: interactive,
                    }).setView([centerLat, centerLng], 14);

                    L.tileLayer(tileUrlTemplate, {
                        maxZoom: 19,
                    }).addTo(mapInstanceRef.current);

                    layerGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
                }

                const map = mapInstanceRef.current;
                const layerGroup = layerGroupRef.current;
                layerGroup.clearLayers();

                const bounds: [number, number][] = [];

                if (routeCoordinates && routeCoordinates.length > 1) {
                    L.polyline(
                        routeCoordinates.map((coord) => [coord.latitude, coord.longitude]),
                        { color: '#7c3aed', weight: 4, opacity: 0.95 },
                    ).addTo(layerGroup);
                    routeCoordinates.forEach((coord) => bounds.push([coord.latitude, coord.longitude]));
                }

                if (location?.coords) {
                    L.circleMarker([location.coords.latitude, location.coords.longitude], {
                        radius: 8,
                        color: '#ffffff',
                        weight: 3,
                        fillColor: '#2563eb',
                        fillOpacity: 1,
                    }).addTo(layerGroup);
                    bounds.push([location.coords.latitude, location.coords.longitude]);
                }

                if (destination) {
                    L.circleMarker([destination.lat, destination.lon], {
                        radius: 8,
                        color: '#ffffff',
                        weight: 3,
                        fillColor: '#7c3aed',
                        fillOpacity: 1,
                    }).addTo(layerGroup);
                    bounds.push([destination.lat, destination.lon]);
                }

                const driverLat = Number(driverLocation?.latitude ?? driverLocation?.lat);
                const driverLng = Number(driverLocation?.longitude ?? driverLocation?.lng);
                if (Number.isFinite(driverLat) && Number.isFinite(driverLng)) {
                    L.circleMarker([driverLat, driverLng], {
                        radius: 9,
                        color: '#ffffff',
                        weight: 3,
                        fillColor: '#111827',
                        fillOpacity: 1,
                    }).addTo(layerGroup);
                    bounds.push([driverLat, driverLng]);
                }

                if (bounds.length > 1) {
                    map.fitBounds(bounds, { padding: [36, 36] });
                } else if (bounds.length === 1) {
                    map.setView(bounds[0], 15);
                } else {
                    map.setView([centerLat, centerLng], 14);
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [centerLat, centerLng, destination, driverLocation, interactive, location, routeCoordinates, tileUrlTemplate]);

    return (
        <View style={[styles.container, style]}>
            {/* @ts-ignore web-only div */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </View>
    );
};

export default DriverMap;

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: '#E9E9E9',
    },
});
