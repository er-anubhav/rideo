import React from 'react';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';

const Map = React.forwardRef((props, ref) => {
    return <MapView ref={ref} provider={PROVIDER_GOOGLE} {...props} />;
});

Map.displayName = 'Map';

export default Map;
export { Marker, Polyline, UrlTile, PROVIDER_GOOGLE };
