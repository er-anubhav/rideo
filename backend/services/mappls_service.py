import os
import httpx
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class MapplsService:
    """Mappls (MapmyIndia) Maps API Service"""
    
    BASE_URL = "https://apis.mappls.com/advancedmaps/v1"
    AUTH_URL = "https://outpost.mappls.com/api/security/oauth/token"
    
    def __init__(self):
        self.rest_key = os.environ.get("MAPPLS_REST_KEY")
        self.client_id = os.environ.get("MAPPLS_CLIENT_ID")
        self.client_secret = os.environ.get("MAPPLS_CLIENT_SECRET")
        self._access_token = None
        self._token_expires_at = None
    
    async def _get_access_token(self) -> Optional[str]:
        """Get OAuth access token using client credentials"""
        if self._access_token and self._token_expires_at:
            if datetime.now(timezone.utc).timestamp() < self._token_expires_at:
                return self._access_token
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.AUTH_URL,
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self._access_token = data.get("access_token")
                    expires_in = data.get("expires_in", 3600)
                    self._token_expires_at = datetime.now(timezone.utc).timestamp() + expires_in - 60
                    logger.info("Mappls OAuth token refreshed")
                    return self._access_token
                else:
                    logger.error(f"Mappls OAuth failed: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Mappls OAuth error: {str(e)}")
            return None
    
    async def geocode(self, address: str) -> Optional[Dict[str, Any]]:
        """
        Forward geocoding: Convert address to coordinates
        Returns: {"lat": float, "lng": float, "formatted_address": str}
        """
        try:
            token = await self._get_access_token()
            async with httpx.AsyncClient() as client:
                # Try Atlas API with OAuth first
                url = "https://atlas.mappls.com/api/places/geocode"
                headers = {"Authorization": f"Bearer {token}"} if token else {}
                
                response = await client.get(
                    url,
                    params={"address": address},
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("copResults"):
                        result = data["copResults"]
                        return {
                            "lat": float(result.get("latitude", 0)),
                            "lng": float(result.get("longitude", 0)),
                            "formatted_address": result.get("formattedAddress", address)
                        }
                
                # Fallback to REST key API
                url = f"{self.BASE_URL}/{self.rest_key}/geo_code"
                response = await client.get(
                    url,
                    params={"addr": address},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("copResults"):
                        result = data["copResults"]
                        return {
                            "lat": float(result.get("latitude", 0)),
                            "lng": float(result.get("longitude", 0)),
                            "formatted_address": result.get("formattedAddress", address)
                        }
                
                logger.warning(f"Geocode failed for: {address}, status: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Geocode error: {str(e)}")
            return None
    
    async def reverse_geocode(self, lat: float, lng: float) -> Optional[Dict[str, Any]]:
        """
        Reverse geocoding: Convert coordinates to address
        Returns: {"address": str, "locality": str, "city": str, "state": str}
        """
        try:
            token = await self._get_access_token()
            async with httpx.AsyncClient() as client:
                # Try Atlas API with OAuth first
                url = "https://atlas.mappls.com/api/places/geocode"
                headers = {"Authorization": f"Bearer {token}"} if token else {}
                
                response = await client.get(
                    url,
                    params={"itemCount": 1, "lat": lat, "lng": lng},
                    headers=headers,
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("results"):
                        result = data["results"][0]
                        return {
                            "address": result.get("formatted_address", ""),
                            "locality": result.get("locality", ""),
                            "city": result.get("city", result.get("district", "")),
                            "state": result.get("state", ""),
                            "pincode": result.get("pincode", "")
                        }
                
                # Fallback to REST key API
                url = f"{self.BASE_URL}/{self.rest_key}/rev_geocode"
                response = await client.get(
                    url,
                    params={"lat": lat, "lng": lng},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("results"):
                        result = data["results"][0]
                        return {
                            "address": result.get("formatted_address", ""),
                            "locality": result.get("locality", ""),
                            "city": result.get("city", ""),
                            "state": result.get("state", ""),
                            "pincode": result.get("pincode", "")
                        }
                
                logger.warning(f"Reverse geocode failed for: {lat}, {lng}")
                return None
        except Exception as e:
            logger.error(f"Reverse geocode error: {str(e)}")
            return None
    
    async def autocomplete(self, query: str, location: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """
        Address autocomplete suggestions
        Returns: List of {"place_id": str, "description": str, "lat": float, "lng": float}
        """
        try:
            token = await self._get_access_token()
            if not token:
                return []
            
            async with httpx.AsyncClient() as client:
                url = "https://atlas.mappls.com/api/places/search/json"
                params = {"query": query}
                if location:
                    params["location"] = f"{location[0]},{location[1]}"
                
                response = await client.get(
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    suggestions = []
                    for item in data.get("suggestedLocations", []):
                        suggestions.append({
                            "place_id": item.get("eLoc", ""),
                            "description": item.get("placeName", ""),
                            "address": item.get("placeAddress", ""),
                            "lat": float(item.get("latitude", 0)) if item.get("latitude") else None,
                            "lng": float(item.get("longitude", 0)) if item.get("longitude") else None
                        })
                    return suggestions
                return []
        except Exception as e:
            logger.error(f"Autocomplete error: {str(e)}")
            return []
    
    def _haversine_fallback(self, origin: tuple, destinations: List[tuple]) -> List[Dict[str, Any]]:
        """Fallback distance calculation using Haversine formula"""
        import math
        results = []
        
        for dest in destinations:
            lat1, lon1 = math.radians(origin[0]), math.radians(origin[1])
            lat2, lon2 = math.radians(dest[0]), math.radians(dest[1])
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            r = 6371  # Earth radius in km
            distance = c * r
            
            # Estimate duration: avg speed 30 km/h in city
            duration_mins = int((distance / 30) * 60)
            
            results.append({
                "distance_km": round(distance * 1.3, 2),  # 30% added for road distance
                "duration_mins": max(duration_mins, 5)
            })
        
        return results
    
    async def get_distance_matrix(
        self, 
        origin: tuple, 
        destinations: List[tuple]
    ) -> List[Dict[str, Any]]:
        """
        Get distance and duration from origin to multiple destinations
        origin: (lat, lng)
        destinations: [(lat, lng), ...]
        Returns: [{"distance_km": float, "duration_mins": int}, ...]
        """
        try:
            token = await self._get_access_token()
            async with httpx.AsyncClient() as client:
                # Format coordinates as lng,lat for Mappls API
                source = f"{origin[1]},{origin[0]}"  # lng,lat format
                dests = ";".join([f"{d[1]},{d[0]}" for d in destinations])
                
                url = f"{self.BASE_URL}/{self.rest_key}/distance_matrix/driving/{source};{dests}"
                headers = {"Authorization": f"Bearer {token}"} if token else {}
                
                response = await client.get(url, headers=headers, timeout=15.0)
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    
                    if data.get("results") and data["results"].get("distances"):
                        distances = data["results"]["distances"][0]
                        durations = data["results"]["durations"][0]
                        
                        for i in range(len(destinations)):
                            dist_idx = i + 1  # Skip self-distance
                            if dist_idx < len(distances):
                                results.append({
                                    "distance_km": round(distances[dist_idx] / 1000, 2),
                                    "duration_mins": round(durations[dist_idx] / 60)
                                })
                    return results
                
                # Fallback to Haversine
                logger.warning(f"Distance matrix API failed, using Haversine fallback")
                return self._haversine_fallback(origin, destinations)
                    
        except Exception as e:
            logger.error(f"Distance matrix error: {str(e)}")
            return self._haversine_fallback(origin, destinations)
    
    async def get_route(
        self, 
        origin: tuple, 
        destination: tuple,
        waypoints: Optional[List[tuple]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get route between two points with optional waypoints
        Returns: {"distance_km": float, "duration_mins": int, "polyline": str, "steps": list}
        """
        try:
            token = await self._get_access_token()
            async with httpx.AsyncClient() as client:
                # Build coordinates string (lng,lat format)
                coords = f"{origin[1]},{origin[0]}"
                if waypoints:
                    for wp in waypoints:
                        coords += f";{wp[1]},{wp[0]}"
                coords += f";{destination[1]},{destination[0]}"
                
                url = f"{self.BASE_URL}/{self.rest_key}/route_adv/driving/{coords}"
                params = {
                    "geometries": "polyline",
                    "overview": "full",
                    "steps": "true"
                }
                headers = {"Authorization": f"Bearer {token}"} if token else {}
                
                response = await client.get(url, params=params, headers=headers, timeout=15.0)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("routes"):
                        route = data["routes"][0]
                        return {
                            "distance_km": round(route.get("distance", 0) / 1000, 2),
                            "duration_mins": round(route.get("duration", 0) / 60),
                            "polyline": route.get("geometry", ""),
                            "steps": self._parse_steps(route.get("legs", []))
                        }
                
                # Fallback to Haversine
                logger.warning(f"Route API failed, using Haversine fallback")
                fallback = self._haversine_fallback(origin, [destination])
                if fallback:
                    return {
                        "distance_km": fallback[0]["distance_km"],
                        "duration_mins": fallback[0]["duration_mins"],
                        "polyline": "",
                        "steps": []
                    }
                return None
        except Exception as e:
            logger.error(f"Route error: {str(e)}")
            # Fallback
            fallback = self._haversine_fallback(origin, [destination])
            if fallback:
                return {
                    "distance_km": fallback[0]["distance_km"],
                    "duration_mins": fallback[0]["duration_mins"],
                    "polyline": "",
                    "steps": []
                }
            return None
    
    def _parse_steps(self, legs: list) -> List[Dict[str, Any]]:
        """Parse route steps from legs"""
        steps = []
        for leg in legs:
            for step in leg.get("steps", []):
                steps.append({
                    "instruction": step.get("maneuver", {}).get("instruction", ""),
                    "distance_m": step.get("distance", 0),
                    "duration_s": step.get("duration", 0)
                })
        return steps
    
    async def get_eta(self, origin: tuple, destination: tuple) -> Optional[Dict[str, Any]]:
        """
        Get ETA between two points (simpler than full route)
        Returns: {"distance_km": float, "duration_mins": int}
        """
        result = await self.get_distance_matrix(origin, [destination])
        if result:
            return result[0]
        return None


# Singleton instance
mappls_service = MapplsService()
