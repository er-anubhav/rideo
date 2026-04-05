import React, { useEffect, useMemo, useRef } from 'react';
import { View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';

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

type LocationPoint = {
    coords: {
        latitude: number;
        longitude: number;
    };
};

type DriverMapProps = {
    style?: ViewStyle;
    region?: Region;
    location?: LocationPoint | null;
    destination?: { lat: number; lon: number; name?: string } | null;
    driverLocation?: { latitude?: number; longitude?: number; lat?: number; lng?: number } | null;
    routeCoordinates?: Point[];
    tileUrlTemplate: string;
    mapplsRestKey?: string;
    interactive?: boolean;
};

const DEFAULT_CENTER = {
    latitude: 28.6139,
    longitude: 77.2090,
};

const sanitizeRoutePath = (
    routePath: Array<{ lat: number; lng: number }>,
    referencePoints: Array<{ lat: number; lng: number } | null>,
) => {
    const refs = (referencePoints || []).filter(
        (point): point is { lat: number; lng: number } =>
            !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng),
    );
    if (!Array.isArray(routePath) || routePath.length <= 1) {
        return refs;
    }

    const cleaned = routePath.filter(
        (point) =>
            point &&
            Number.isFinite(point.lat) &&
            Number.isFinite(point.lng) &&
            Math.abs(point.lat) <= 90 &&
            Math.abs(point.lng) <= 180,
    );

    if (cleaned.length <= 1) {
        return refs;
    }

    if (refs.length === 0) {
        return cleaned;
    }

    const refCenter = refs.reduce(
        (acc, point) => ({
            lat: acc.lat + point.lat / refs.length,
            lng: acc.lng + point.lng / refs.length,
        }),
        { lat: 0, lng: 0 },
    );

    const tooFar = cleaned.some(
        (point) =>
            Math.abs(point.lat - refCenter.lat) > 2 ||
            Math.abs(point.lng - refCenter.lng) > 2,
    );

    if (tooFar) {
        return refs;
    }

    const latitudes = cleaned.map((point) => point.lat);
    const longitudes = cleaned.map((point) => point.lng);
    const latSpan = Math.max(...latitudes) - Math.min(...latitudes);
    const lngSpan = Math.max(...longitudes) - Math.min(...longitudes);

    if (latSpan > 2 || lngSpan > 2) {
        return refs;
    }

    return cleaned;
};

const buildHtml = ({ mapplsRestKey, interactive }: { mapplsRestKey?: string; interactive: boolean }) => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #f6f1e8;
      }
      #map {
        opacity: 0;
        transition: opacity 180ms ease;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      (function () {
        var key = ${JSON.stringify(mapplsRestKey || '')};
        var interactive = ${interactive ? 'true' : 'false'};
        var mapNode = document.getElementById('map');
        var map = null;
        var overlayItems = [];
        var pendingPayload = null;

        function revealMap() {
          mapNode.style.opacity = '1';
        }

        function clearOverlays() {
          while (overlayItems.length > 0) {
            var item = overlayItems.pop();
            if (!item) continue;
            try {
              if (typeof item.remove === 'function') {
                item.remove();
              } else if (typeof item.setMap === 'function') {
                item.setMap(null);
              } else if (typeof item.setVisibility === 'function') {
                item.setVisibility(false);
              }
            } catch (_error) {}
          }
        }

        function createCircleIcon(fillColor, size) {
          var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
            '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + ((size / 2) - 2) + '" fill="' + fillColor + '" stroke="#ffffff" stroke-width="2" />' +
            '</svg>';
          return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
        }

        function addMarker(point, color, size) {
          if (!map || !point || typeof mappls.Marker !== 'function') {
            return;
          }

          var marker = new mappls.Marker({
            map: map,
            position: point,
            icon: createCircleIcon(color, size),
            width: size,
            height: size,
            fitbounds: false,
          });
          overlayItems.push(marker);
        }

        function fitMap(points, padding) {
          if (!map || !Array.isArray(points) || points.length === 0) {
            return;
          }

          if (points.length === 1) {
            map.setCenter([points[0].lng, points[0].lat]);
            map.setZoom(15);
            return;
          }

          var minLng = points[0].lng;
          var maxLng = points[0].lng;
          var minLat = points[0].lat;
          var maxLat = points[0].lat;

          for (var i = 1; i < points.length; i += 1) {
            minLng = Math.min(minLng, points[i].lng);
            maxLng = Math.max(maxLng, points[i].lng);
            minLat = Math.min(minLat, points[i].lat);
            maxLat = Math.max(maxLat, points[i].lat);
          }

          if (typeof map.fitBounds === 'function') {
            map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: padding || 56, duration: 0 });
          }
        }

        function updateMap(payload) {
          if (!payload) return;
          if (!map) {
            pendingPayload = payload;
            return;
          }

          clearOverlays();

          var pointsForFit = [];
          var pickup = payload.pickupMarker;
          var drop = payload.dropMarker;
          var driver = payload.driverMarker;
          var routePath = Array.isArray(payload.routePath) ? payload.routePath : [];

          if (pickup) {
            addMarker(pickup, '#2563eb', 12);
            pointsForFit.push(pickup);
          }
          if (drop) {
            addMarker(drop, '#7c3aed', 12);
            pointsForFit.push(drop);
          }
          if (driver) {
            addMarker(driver, '#111827', 12);
            pointsForFit.push(driver);
          }

          if (routePath.length > 1 && typeof mappls.Polyline === 'function') {
            var polyline = new mappls.Polyline({
              map: map,
              path: routePath,
              strokeColor: '#7c3aed',
              strokeOpacity: 1,
              strokeWeight: interactive ? 4 : 3,
              fitbounds: true,
              fitboundOptions: { padding: interactive ? 72 : 56, duration: 0 },
              lineCap: 'round',
            });
            overlayItems.push(polyline);
          } else {
            fitMap(pointsForFit, interactive ? 72 : 56);
          }

          if (routePath.length <= 1 && pointsForFit.length === 0 && payload.center) {
            map.setCenter([payload.center.lng, payload.center.lat]);
            map.setZoom(payload.zoom || 14);
          }

          revealMap();
        }

        window.__rideoUpdateMap = updateMap;

        function handleMessage(event) {
          try {
            var payload = JSON.parse(event.data);
            updateMap(payload);
          } catch (_error) {}
        }

        document.addEventListener('message', handleMessage);
        window.addEventListener('message', handleMessage);

        if (!key) return;

        var script = document.createElement('script');
        script.src = 'https://apis.mappls.com/advancedmaps/api/' + key + '/map_sdk?layer=vector&v=3.0';
        script.async = true;
        script.onload = function () {
          try {
            map = new mappls.Map(mapNode, {
              center: [${DEFAULT_CENTER.longitude}, ${DEFAULT_CENTER.latitude}],
              zoom: 14,
              zoomControl: false,
              attributionControl: false,
              fullscreenControl: false,
              draggable: interactive,
              scrollZoom: interactive,
              doubleClickZoom: interactive,
              touchZoomRotate: interactive,
              keyboard: false,
              boxZoom: false,
            });

            if (typeof map.on === 'function') {
              map.on('load', function () {
                if (pendingPayload) {
                  updateMap(pendingPayload);
                  pendingPayload = null;
                } else {
                  revealMap();
                }
              });
            } else {
              revealMap();
            }
          } catch (error) {
            console.warn('Mappls init failed', error);
          }
        };
        script.onerror = function () {
          console.warn('Mappls SDK failed to load');
        };
        document.body.appendChild(script);
      })();
    </script>
  </body>
</html>`;

const buildPayload = ({
    region,
    location,
    destination,
    driverLocation,
    routeCoordinates,
}: DriverMapProps) => {
    const center = {
        lat: Number(region?.latitude) || DEFAULT_CENTER.latitude,
        lng: Number(region?.longitude) || DEFAULT_CENTER.longitude,
    };
    const pickupMarker = location?.coords
        ? {
            lat: Number(location.coords.latitude),
            lng: Number(location.coords.longitude),
        }
        : null;
    const dropMarker = destination
        ? {
            lat: Number(destination.lat),
            lng: Number(destination.lon),
        }
        : null;
    const driverMarker = driverLocation
        ? {
            lat: Number(driverLocation.latitude ?? driverLocation.lat),
            lng: Number(driverLocation.longitude ?? driverLocation.lng),
        }
        : null;
    const routePath = Array.isArray(routeCoordinates)
        ? routeCoordinates
            .map((coord) => ({
                lat: Number(coord.latitude),
                lng: Number(coord.longitude),
            }))
            .filter((coord) => Number.isFinite(coord.lat) && Number.isFinite(coord.lng))
        : [];

    const fallbackPath = routePath.length > 1
        ? routePath
        : [driverMarker, pickupMarker, dropMarker].filter(Boolean);
    const sanitizedRoutePath = sanitizeRoutePath(
        fallbackPath,
        [driverMarker, pickupMarker, dropMarker],
    );

    return {
        center,
        zoom: 14,
        pickupMarker,
        dropMarker,
        driverMarker,
        routePath: sanitizedRoutePath,
    };
};

const DriverMap = (props: DriverMapProps) => {
    const interactive = props.interactive ?? false;
    const webViewRef = useRef<WebView>(null);
    const html = useMemo(
        () => buildHtml({ mapplsRestKey: props.mapplsRestKey, interactive }),
        [interactive, props.mapplsRestKey],
    );
    const payload = useMemo(() => buildPayload(props), [props]);
    const pushPayload = useMemo(
        () => `window.__rideoUpdateMap && window.__rideoUpdateMap(${JSON.stringify(payload)}); true;`,
        [payload],
    );

    useEffect(() => {
        if (!webViewRef.current) return;
        webViewRef.current.injectJavaScript(pushPayload);
    }, [pushPayload]);

    return (
        <View style={props.style}>
            <WebView
                ref={webViewRef}
                pointerEvents={interactive ? 'auto' : 'none'}
                originWhitelist={['*']}
                source={{ html }}
                style={{ flex: 1, backgroundColor: '#f6f1e8' }}
                incognito
                cacheEnabled={false}
                javaScriptEnabled
                domStorageEnabled
                mixedContentMode="always"
                scrollEnabled={false}
                overScrollMode="never"
                onLoadEnd={() => {
                    if (webViewRef.current) {
                        webViewRef.current.injectJavaScript(pushPayload);
                    }
                }}
            />
        </View>
    );
};

export default DriverMap;
