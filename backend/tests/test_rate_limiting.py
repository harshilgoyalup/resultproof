import io
import pytest
from app.core.limiter import IPRateLimiter
from fastapi import HTTPException


def test_ip_rate_limiter_unit():
    """
    Test rate limiter directly with a test IP.
    """
    test_limiter = IPRateLimiter(requests_per_minute=3)
    test_ip = "192.168.1.100"

    # 3 requests succeed
    test_limiter.check_rate_limit(test_ip)
    test_limiter.check_rate_limit(test_ip)
    test_limiter.check_rate_limit(test_ip)

    # 4th request must raise 429 HTTPException
    with pytest.raises(HTTPException) as exc_info:
        test_limiter.check_rate_limit(test_ip)
    
    assert exc_info.value.status_code == 429
    assert "Rate limit exceeded" in exc_info.value.detail
    assert "Retry-After" in exc_info.value.headers


def test_different_ips_have_separate_limits():
    """
    Different IP addresses must not interfere with each other's rate limits.
    """
    test_limiter = IPRateLimiter(requests_per_minute=2)
    ip_a = "10.0.0.1"
    ip_b = "10.0.0.2"

    test_limiter.check_rate_limit(ip_a)
    test_limiter.check_rate_limit(ip_a)

    # ip_a reaches limit
    with pytest.raises(HTTPException):
        test_limiter.check_rate_limit(ip_a)

    # ip_b is still permitted
    test_limiter.check_rate_limit(ip_b)
    test_limiter.check_rate_limit(ip_b)
