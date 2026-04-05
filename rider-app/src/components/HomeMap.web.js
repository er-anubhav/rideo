import React from 'react';
import MapView, { Marker, Polyline } from '@/components/Map';

const HomeMap = ({
    style,
    region,
    location,
    destination,
    driverLocation,
    routeCoordinates,
    interactive = false,
}) => (
    <MapView
        style={style}
        region={region}
        showsUserLocation
        followsUserLocation
        showsMyLocationButton={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
    >
        {location && (
            <Marker
                coordinate={{
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                }}
                title="Pickup"
                description="Current Location"
            />
        )}

        {destination && (
            <Marker
                coordinate={{
                    latitude: destination.lat,
                    longitude: destination.lon,
                }}
                title="Destination"
                description={destination.name}
                pinColor="red"
            />
        )}

        {driverLocation && (
            <Marker
                coordinate={{
                    latitude: driverLocation.lat ?? driverLocation.latitude,
                    longitude: driverLocation.lng ?? driverLocation.longitude,
                }}
                title="Driver"
                description="Driver location"
                pinColor="black"
            />
        )}

        {routeCoordinates?.length > 1 ? (
            <Polyline
                coordinates={routeCoordinates}
                strokeColor="#9333EA"
                strokeWidth={4}
            />
        ) : location && destination ? (
            <Polyline
                coordinates={[
                    {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    {
                        latitude: destination.lat,
                        longitude: destination.lon,
                    },
                ]}
                strokeColor="#9333EA"
                strokeWidth={4}
            />
        ) : null}
    </MapView>
);

export default HomeMap;
