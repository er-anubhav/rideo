import React from 'react';
import MapView, { MapViewProps, PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';

const Map = React.forwardRef<MapView, MapViewProps>((props, ref) => {
    return <MapView ref={ref} provider={PROVIDER_GOOGLE} {...props} />;
});

Map.displayName = 'Map';

export default Map;
export { Marker, Polyline };
