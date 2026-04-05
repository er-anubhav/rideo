import React from 'react';
import { Platform } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { CONFIG } from '@/config/config';

const Map = React.forwardRef(({ children, mapType, ...props }, ref) => {
    const resolvedMapType = Platform.OS === 'android' ? 'none' : mapType;

    return (
        <MapView ref={ref} mapType={resolvedMapType} {...props}>
            <UrlTile
                urlTemplate={CONFIG.MAP_TILE_URL_TEMPLATE}
                maximumZ={19}
                flipY={false}
                shouldReplaceMapContent={Platform.OS === 'ios'}
            />
            {children}
        </MapView>
    );
});

Map.displayName = 'Map';

export default Map;
export { Marker, Polyline, UrlTile };
