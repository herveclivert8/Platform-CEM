#!/usr/bin/env python
"""
Generate a secure JWT secret key for production use.

Usage:
    python generate_jwt_key.py

This will output a random 32-character URL-safe secret key suitable for use
as SECRET_KEY in your .env file.
"""

import secrets


def generate_jwt_key(length: int = 48) -> str:
    """Generate a cryptographically secure random key."""
    return secrets.token_urlsafe(length)


if __name__ == "__main__":
    key = generate_jwt_key()
    print("=" * 60)
    print("🔐 Generated JWT Secret Key (copy this to your .env file):")
    print("=" * 60)
    print(f"SECRET_KEY={key}")
    print("=" * 60)
    print(f"Key length: {len(key)} characters (minimum required: 32)")
