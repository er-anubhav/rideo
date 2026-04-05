import React from 'react';
import Svg, { Path } from 'react-native-svg';

const LineIcon = ({ name, size = 24, color = '#000' }) => {
    const icons = {
        'map': 'M20.5 3h-3c-.3 0-.5.1-.7.3l-5.8 6-5.8-6c-.2-.2-.4-.3-.7-.3h-3c-.6 0-1 .4-1 1v16c0 .6.4 1 1 1h3c.3 0 .5-.1.7-.3l5.8-6 5.8 6c.2.2.4.3.7.3h3c.6 0 1-.4 1-1V4c0-.6-.4-1-1-1zm-1 15.6l-4.5-4.6-4.5 4.6V5.4l4.5 4.6 4.5-4.6v13.2z',

        'grid-alt': 'M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z',

        'clipboard': 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 16H5V5h2v3h10V5h2v14z',

        'envelope': 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',

        'user': 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    };

    const iconPath = icons[name] || icons['user'];

    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <Path d={iconPath} fill={color} />
        </Svg>
    );
};

export default LineIcon;
