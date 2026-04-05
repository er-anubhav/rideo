const toNumber = (value: unknown, fallback = 0): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const splitName = (name?: string | null) => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
        return { firstName: '', lastName: '' };
    }

    const parts = trimmed.split(/\s+/);
    return {
        firstName: parts.shift() || '',
        lastName: parts.join(' '),
    };
};

export const buildRideOtp = (rideId?: string | null): string | undefined => {
    if (!rideId) return undefined;

    const digits = rideId.replace(/\D/g, '');
    if (digits.length >= 4) {
        return digits.slice(-4);
    }

    const checksum = rideId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return `${1000 + (checksum % 9000)}`;
};

export const mapBackendVehicleTypeToApp = (vehicleType?: string | null): string => {
    switch ((vehicleType || '').toLowerCase()) {
        case 'bike':
            return 'BIKE';
        case 'auto':
            return 'AUTO';
        case 'suv':
            return 'CAB_SUV';
        case 'sedan':
        case 'mini':
            return 'CAB_SEDAN';
        default:
            return 'BIKE';
    }
};

export const mapBackendRideStatusToDriver = (status?: string | null): string => {
    switch ((status || '').toLowerCase()) {
        case 'searching':
            return 'MATCHED';
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
            return 'MATCHED';
    }
};

export const normalizeDriverRide = (
    payload: any,
    options: {
        overrideStatus?: string;
        rider?: any;
        vehicle?: any;
        pickupEtaMins?: number | null;
    } = {},
) => {
    const ride = payload?.ride ?? payload ?? {};
    const pickup = ride.pickup ?? {};
    const drop = ride.drop ?? {};
    const fare = ride.fare ?? {};
    const rider = options.rider ?? payload?.rider ?? ride.rider;
    const vehicle = options.vehicle ?? payload?.vehicle ?? ride.vehicle;
    const tripDistanceKm = toNumber(
        ride.distance_km ?? ride.distanceKm ?? ride.distance ?? ride.estimatedDistanceKm,
    );
    const tripDurationMins = toNumber(
        ride.duration_mins ?? ride.durationMins ?? ride.estimatedDurationMins,
    );
    const pickupEtaMins = toNumber(options.pickupEtaMins, tripDurationMins);
    const actualFare = fare.actual ?? ride.actualFare ?? ride.totalFare;
    const estimatedFare = fare.estimated ?? ride.estimatedFare ?? ride.fare;

    return {
        id: String(ride.id || payload?.ride_id || ''),
        riderId: String(ride.rider_id || ride.riderId || rider?.id || ''),
        driverId: ride.driver_id || ride.driverId || null,
        pickupLat: toNumber(pickup.lat ?? ride.pickup_lat ?? ride.pickupLat),
        pickupLng: toNumber(pickup.lng ?? ride.pickup_lng ?? ride.pickupLng),
        pickupAddress: pickup.address || ride.pickup_address || ride.pickupAddress || '',
        dropLat: toNumber(drop.lat ?? ride.drop_lat ?? ride.dropLat),
        dropLng: toNumber(drop.lng ?? ride.drop_lng ?? ride.dropLng),
        dropAddress: drop.address || ride.drop_address || ride.dropAddress || '',
        status: options.overrideStatus || mapBackendRideStatusToDriver(ride.status || payload?.status),
        fare: toNumber(estimatedFare),
        totalFare: toNumber(actualFare ?? estimatedFare),
        distance: tripDistanceKm,
        estimatedDistance: Math.round(tripDistanceKm * 1000),
        estimatedDuration: Math.round(pickupEtaMins * 60),
        actualDistance: tripDistanceKm > 0 ? Math.round(tripDistanceKm * 1000) : undefined,
        actualDuration: tripDurationMins > 0 ? Math.round(tripDurationMins * 60) : undefined,
        otp: ride.otp || buildRideOtp(ride.id),
        rider: rider
            ? {
                id: String(rider.id || ''),
                phone: rider.phone || '',
                rating: toNumber(rider.rating, 5),
                name: rider.name || 'Rider',
            }
            : undefined,
        vehicleType: mapBackendVehicleTypeToApp(ride.vehicle_type || ride.vehicleType),
        vehicle,
        createdAt: ride.created_at || ride.createdAt || new Date().toISOString(),
        acceptedAt: ride.accepted_at || ride.acceptedAt,
        arrivedAt: ride.arrived_at || ride.arrivedAt,
        startedAt: ride.started_at || ride.startedAt,
        completedAt: ride.completed_at || ride.completedAt,
    };
};

export const normalizeDriverProfile = (payload: any, cachedDraft: any = {}) => {
    const profile = payload?.profile ?? payload ?? {};
    const user = payload?.user ?? cachedDraft?.user ?? {};
    const vehicles = payload?.vehicles ?? profile?.vehicles ?? cachedDraft?.vehicles ?? [];
    const { firstName, lastName } = splitName(user.name || `${cachedDraft.firstName || ''} ${cachedDraft.lastName || ''}`.trim());

    return {
        id: String(profile.id || cachedDraft.id || user.id || ''),
        userId: String(profile.user_id || profile.userId || user.id || ''),
        firstName,
        lastName,
        email: user.email || cachedDraft.email || '',
        phone: user.phone || cachedDraft.phone || '',
        licenseNumber: profile.license_number || profile.licenseNumber || cachedDraft.licenseNumber || '',
        dateOfBirth: cachedDraft.dateOfBirth || '',
        address: cachedDraft.address || '',
        city: cachedDraft.city || '',
        state: cachedDraft.state || '',
        pincode: cachedDraft.pincode || '',
        emergencyContact: cachedDraft.emergencyContact || '',
        verificationStatus: profile.is_verified ? 'APPROVED' : 'PENDING',
        isApproved: Boolean(profile.is_verified),
        isActive: user.is_active !== false,
        isOnline: Boolean(profile.is_online),
        rating: toNumber(profile.rating, 5),
        totalRides: toNumber(profile.total_rides),
        totalEarnings: toNumber(profile.total_earnings),
        vehicles: vehicles.map((vehicle: any) => ({
            id: String(vehicle.id || ''),
            vehicleType: mapBackendVehicleTypeToApp(vehicle.vehicle_type || vehicle.vehicleType),
            registrationNumber: vehicle.number_plate || vehicle.registrationNumber || '',
            make: vehicle.make || '',
            model: vehicle.model || '',
            color: vehicle.color || '',
            year: vehicle.year,
            isActive: vehicle.is_active !== false,
        })),
    };
};

export const normalizeDriverStats = (payload: any) => {
    const stats = payload?.stats ?? payload ?? {};
    const today = stats.today ?? {};
    const allTime = stats.all_time ?? {};

    return {
        today: {
            earnings: toNumber(today.earnings),
            trips: toNumber(today.rides),
        },
        total: {
            earnings: toNumber(allTime.earnings),
            trips: toNumber(allTime.rides),
            rating: toNumber(stats.rating, 5),
        },
    };
};
