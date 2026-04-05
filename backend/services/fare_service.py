from typing import Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.fare import FareConfig
from models.driver import VehicleType


# Default fare configurations
DEFAULT_FARES = {
    "bike": {"base_fare": 20, "per_km_rate": 8, "per_minute_rate": 1, "minimum_fare": 25, "cancellation_fee": 10},
    "auto": {"base_fare": 30, "per_km_rate": 12, "per_minute_rate": 1.5, "minimum_fare": 35, "cancellation_fee": 15},
    "mini": {"base_fare": 50, "per_km_rate": 14, "per_minute_rate": 2, "minimum_fare": 60, "cancellation_fee": 25},
    "sedan": {"base_fare": 80, "per_km_rate": 18, "per_minute_rate": 2.5, "minimum_fare": 100, "cancellation_fee": 40},
    "suv": {"base_fare": 120, "per_km_rate": 22, "per_minute_rate": 3, "minimum_fare": 150, "cancellation_fee": 50},
}


class FareService:
    """Fare calculation service"""
    
    async def get_fare_config(self, db: AsyncSession, vehicle_type: str) -> Optional[FareConfig]:
        """Get fare configuration for a vehicle type"""
        result = await db.execute(
            select(FareConfig).where(FareConfig.vehicle_type == vehicle_type)
        )
        return result.scalar_one_or_none()
    
    async def seed_fare_configs(self, db: AsyncSession):
        """Seed default fare configurations"""
        for vehicle_type, fares in DEFAULT_FARES.items():
            existing = await self.get_fare_config(db, vehicle_type)
            if not existing:
                fare_config = FareConfig(
                    vehicle_type=vehicle_type,
                    **fares
                )
                db.add(fare_config)
        await db.commit()
    
    async def calculate_fare(
        self, 
        db: AsyncSession,
        vehicle_type: str, 
        distance_km: float, 
        duration_mins: int,
        surge_multiplier: float = 1.0,
        promo_discount: float = 0.0
    ) -> Dict[str, Any]:
        """Calculate ride fare"""
        config = await self.get_fare_config(db, vehicle_type)
        
        if not config:
            # Use default if not found in DB
            default = DEFAULT_FARES.get(vehicle_type, DEFAULT_FARES["mini"])
            base_fare = default["base_fare"]
            per_km_rate = default["per_km_rate"]
            per_minute_rate = default["per_minute_rate"]
            minimum_fare = default["minimum_fare"]
        else:
            base_fare = config.base_fare
            per_km_rate = config.per_km_rate
            per_minute_rate = config.per_minute_rate
            minimum_fare = config.minimum_fare
        
        # Calculate fare
        distance_fare = per_km_rate * distance_km
        time_fare = per_minute_rate * duration_mins
        subtotal = base_fare + distance_fare + time_fare
        
        # Apply surge
        surged_fare = subtotal * surge_multiplier
        
        # Apply minimum fare
        fare_before_discount = max(surged_fare, minimum_fare)
        
        # Apply promo discount
        final_fare = max(fare_before_discount - promo_discount, 0)
        
        return {
            "base_fare": round(base_fare, 2),
            "distance_fare": round(distance_fare, 2),
            "time_fare": round(time_fare, 2),
            "subtotal": round(subtotal, 2),
            "surge_multiplier": surge_multiplier,
            "surged_fare": round(surged_fare, 2),
            "promo_discount": round(promo_discount, 2),
            "total_fare": round(final_fare, 2),
            "minimum_fare": minimum_fare
        }
    
    async def get_all_fare_configs(self, db: AsyncSession) -> list:
        """Get all fare configurations"""
        result = await db.execute(select(FareConfig))
        configs = result.scalars().all()
        return [c.to_dict() for c in configs]
    
    def calculate_surge(self, demand_ratio: float) -> float:
        """
        Calculate surge multiplier based on demand/supply ratio
        demand_ratio: rides_requested / available_drivers
        """
        if demand_ratio <= 1.0:
            return 1.0
        elif demand_ratio <= 1.5:
            return 1.2
        elif demand_ratio <= 2.0:
            return 1.5
        elif demand_ratio <= 3.0:
            return 1.8
        else:
            return 2.0  # Max surge


# Singleton instance
fare_service = FareService()
