const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildRideOtp = (rideId) => {
    if (!rideId) return undefined;

    const digits = String(rideId).replace(/\D/g, '');
    if (digits.length >= 4) {
        return digits.slice(-4);
    }

    const checksum = String(rideId)
        .split('')
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `${1000 + (checksum % 9000)}`;
};

export const mapBackendVehicleTypeToRider = (vehicleType) => {
    switch ((vehicleType || '').toLowerCase()) {
        case 'bike':
            return 'BIKE';
        case 'auto':
            return 'AUTO';
        case 'suv':
            return 'CAB_SUV';
        case 'mini':
        case 'sedan':
            return 'CAB_SEDAN';
        default:
            return 'CAB_SEDAN';
    }
};

export const mapRiderVehicleTypeToBackend = (vehicleType) => {
    switch ((vehicleType || '').toUpperCase()) {
        case 'BIKE':
            return 'bike';
        case 'AUTO':
            return 'auto';
        case 'CAB_SUV':
            return 'suv';
        case 'CAB_SEDAN':
        default:
            return 'sedan';
    }
};

export const mapBackendRideStatusToRider = (status) => {
    switch ((status || '').toLowerCase()) {
        case 'searching':
            return 'REQUESTED';
        case 'accepted':
            return 'ACCEPTED';
        case 'arriving':
            return 'ACCEPTED';
        case 'arrived':
            return 'DRIVER_ARRIVED';
        case 'in_progress':
            return 'IN_PROGRESS';
        case 'completed':
            return 'COMPLETED';
        case 'cancelled':
            return 'CANCELLED';
        default:
            return 'REQUESTED';
    }
};

export const normalizeRide = (payload, options = {}) => {
    const ride = payload?.ride || payload || {};
    const pickup = ride.pickup || {};
    const drop = ride.drop || {};
    const fare = ride.fare || {};
    const driver = options.driver || payload?.driver || ride.driver || null;
    const vehicle = options.vehicle || payload?.vehicle || ride.vehicle || null;

    return {
        id: String(ride.id || payload?.ride_id || ''),
        rideId: String(ride.id || payload?.ride_id || ''),
        status: options.overrideStatus || mapBackendRideStatusToRider(ride.status || payload?.status),
        vehicleType: mapBackendVehicleTypeToRider(ride.vehicle_type || ride.vehicleType),
        pickupLat: toNumber(pickup.lat ?? ride.pickup_lat ?? ride.pickupLat),
        pickupLng: toNumber(pickup.lng ?? ride.pickup_lng ?? ride.pickupLng),
        pickupAddress: pickup.address || ride.pickup_address || ride.pickupAddress || '',
        dropLat: toNumber(drop.lat ?? ride.drop_lat ?? ride.dropLat),
        dropLng: toNumber(drop.lng ?? ride.drop_lng ?? ride.dropLng),
        dropAddress: drop.address || ride.drop_address || ride.dropAddress || '',
        totalFare: toNumber(fare.actual ?? ride.actualFare ?? fare.estimated ?? ride.estimatedFare),
        fare: toNumber(fare.estimated ?? ride.estimatedFare ?? fare.actual ?? ride.actualFare),
        distanceKm: toNumber(ride.distance_km ?? ride.distanceKm),
        durationMins: toNumber(ride.duration_mins ?? ride.durationMins),
        otp: ride.otp || buildRideOtp(ride.id),
        requestedAt: ride.created_at || ride.requestedAt || ride.createdAt || new Date().toISOString(),
        createdAt: ride.created_at || ride.createdAt || new Date().toISOString(),
        completedAt: ride.completed_at || ride.completedAt || null,
        paymentStatus: ride.payment_status || ride.paymentStatus || 'pending',
        paymentMethod: ride.payment_method || ride.paymentMethod || 'cash',
        driver: driver
            ? {
                id: String(driver.id || ''),
                name: driver.name || 'Driver',
                phone: driver.phone || '',
                rating: toNumber(driver.rating, 5),
                vehicleBrand: vehicle?.make || vehicle?.brand || '',
                vehicleModel: vehicle?.model || '',
                vehiclePlate: vehicle?.number_plate || vehicle?.registrationNumber || '',
            }
            : null,
        driverLocation: driver?.location
            ? {
                lat: toNumber(driver.location.lat),
                lng: toNumber(driver.location.lng),
            }
            : null,
    };
};

export const normalizeRideHistory = (items = []) => items.map((item) => normalizeRide(item));

export const normalizeRoutePayload = (payload) => {
    const route = payload?.route || payload || {};
    const coordinates = (route.coordinates || [])
        .map((coord) => ({
            latitude: toNumber(coord.latitude ?? coord.lat),
            longitude: toNumber(coord.longitude ?? coord.lng),
        }))
        .filter((coord) => Number.isFinite(coord.latitude) && Number.isFinite(coord.longitude));

    return {
        route: {
            ...route,
            coordinates,
            durationSeconds: route.durationSeconds || Math.round(toNumber(route.duration_mins ?? route.durationMins) * 60),
            distanceMeters: route.distanceMeters || Math.round(toNumber(route.distance_km ?? route.distanceKm) * 1000),
        },
        coordinates,
        durationSeconds: route.durationSeconds || Math.round(toNumber(route.duration_mins ?? route.durationMins) * 60),
        distanceMeters: route.distanceMeters || Math.round(toNumber(route.distance_km ?? route.distanceKm) * 1000),
    };
};

export const normalizeAutocompleteResults = (items = []) =>
    items.map((item, index) => ({
        id: item.place_id || item.id || `${item.description || item.address || 'place'}-${index}`,
        name: item.description || item.name || item.address || 'Destination',
        fullAddress: item.address || item.fullAddress || item.description || '',
        lat: toNumber(item.lat ?? item.latitude, 0),
        lon: toNumber(item.lng ?? item.lon ?? item.longitude, 0),
    }));

export const normalizeReverseGeocode = (item) => ({
    address: item?.address || item?.formatted_address || '',
    city: item?.city || '',
    state: item?.state || '',
    pincode: item?.pincode || '',
});

export const normalizeGeocodeResult = (item) => ({
    lat: toNumber(item?.lat ?? item?.latitude),
    lon: toNumber(item?.lng ?? item?.lon ?? item?.longitude),
    address: item?.formatted_address || item?.address || '',
});
