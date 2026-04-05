import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './CustomText';
import { MaterialIcons } from '@expo/vector-icons';

// Mappls REST key from env (used for the JS SDK)
const MAPPLS_REST_KEY = process.env.EXPO_PUBLIC_MAPPLS_REST_KEY || '';

// Extend Window to include the mappls SDK
declare global {
    interface Window {
        mappls: any;
        mapplsInitCallback?: () => void;
    }
}

// Mock no-op components for web platform
export const Marker = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export const Polyline = () => null;

interface MapProps {
    region?: {
        latitude: number;
        longitude: number;
        latitudeDelta?: number;
        longitudeDelta?: number;
    };
    style?: any;
    showsUserLocation?: boolean;
    children?: React.ReactNode;
    [key: string]: any;
}

let sdkLoadPromise: Promise<void> | null = null;

function loadMapplsSDK(): Promise<void> {
    if (sdkLoadPromise) return sdkLoadPromise;
    sdkLoadPromise = new Promise<void>((resolve, reject) => {
        if (typeof window === 'undefined') return resolve();
        if (window.mappls) return resolve();

        const script = document.createElement('script');
        script.src = `https://apis.mappls.com/advancedmaps/api/${MAPPLS_REST_KEY}/map_sdk?layer=vector&v=3.0`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Mappls SDK'));
        document.head.appendChild(script);
    });
    return sdkLoadPromise;
}

const Map = React.forwardRef<View, MapProps>(({ region, style, showsUserLocation }, ref) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    const latitude = region?.latitude ?? 28.6139;
    const longitude = region?.longitude ?? 77.2090;

    useEffect(() => {
        if (!MAPPLS_REST_KEY) return;

        let cancelled = false;

        loadMapplsSDK()
            .then(() => {
                if (cancelled || !mapContainerRef.current || !window.mappls) return;

                if (!mapInstanceRef.current) {
                    mapInstanceRef.current = new window.mappls.Map(mapContainerRef.current, {
                        center: [longitude, latitude],
                        zoom: 14,
                        zoomControl: false,
                        fullscreenControl: false,
                        attributionControl: false,
                    });

                    if (showsUserLocation) {
                        markerRef.current = new window.mappls.Marker({
                            map: mapInstanceRef.current,
                            position: { lat: latitude, lng: longitude },
                        });
                    }
                } else {
                    mapInstanceRef.current.setCenter([longitude, latitude]);
                    if (markerRef.current) {
                        markerRef.current.setPosition({ lat: latitude, lng: longitude });
                    }
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [latitude, longitude, showsUserLocation]);

    if (!MAPPLS_REST_KEY) {
        return (
            <View ref={ref} style={[style, styles.container]}>
                <View style={styles.placeholder}>
                    <MaterialIcons name="map" size={40} color="#9333EA" style={{ opacity: 0.4 }} />
                    <Text style={styles.text}>Map key not configured</Text>
                </View>
            </View>
        );
    }

    return (
        <View ref={ref} style={[style, styles.container]}>
            {/* @ts-ignore — HTMLDivElement ref is fine here inside a web-only file */}
            <div
                ref={mapContainerRef}
                style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden' }}
            />
        </View>
    );
});

Map.displayName = 'Map';
export default Map;

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#E9E9E9',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
    },
    text: {
        marginTop: 8,
        color: '#9CA3AF',
        fontSize: 13,
    },
});
