import time
from collections import defaultdict
from threading import Lock
from fastapi import Request, HTTPException, status
from app.core.config import settings


class IPRateLimiter:
    """
    In-memory sliding window rate limiter per IP address.
    """
    def __init__(self, requests_per_minute: int = 5):
        self.requests_per_minute = requests_per_minute
        self.window_seconds = 60
        self.history = defaultdict(list)
        self.lock = Lock()

    def check_rate_limit(self, ip_address: str):
        current_time = time.time()
        with self.lock:
            # Purge timestamps outside the window
            timestamps = self.history[ip_address]
            valid_timestamps = [t for t in timestamps if current_time - t < self.window_seconds]
            
            if len(valid_timestamps) >= self.requests_per_minute:
                # Limit exceeded
                retry_after = int(self.window_seconds - (current_time - valid_timestamps[0]))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Max {self.requests_per_minute} submissions per minute per IP. Please try again in {max(1, retry_after)} seconds.",
                    headers={"Retry-After": str(max(1, retry_after))}
                )
            
            valid_timestamps.append(current_time)
            self.history[ip_address] = valid_timestamps


limiter = IPRateLimiter(requests_per_minute=settings.RATE_LIMIT_SUBMISSIONS_PER_MINUTE)


def rate_limit_dependency(request: Request):
    """
    FastAPI dependency to rate limit requests based on client IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    
    # Check for X-Forwarded-For if behind reverse proxy
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()

    limiter.check_rate_limit(client_ip)
    return client_ip
