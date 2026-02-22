"""
Custom social auth backends. Apple backend loads the .p8 key with cryptography
and passes a key object to PyJWT to avoid PEM deserialization issues.
"""
from social_core.backends.apple import AppleIdAuth as BaseAppleIdAuth


class AppleIdAuth(BaseAppleIdAuth):
    def get_private_key(self):
        """Load Apple .p8 PEM as a key object so PyJWT/cryptography accept it."""
        from cryptography.hazmat.primitives.serialization import load_pem_private_key

        raw = self.setting("SECRET")
        if not raw or not raw.strip():
            raise ValueError("SOCIAL_AUTH_APPLE_ID_SECRET is not set")
        if isinstance(raw, str):
            raw = raw.replace("\r\n", "\n").strip("\ufeff")
            key_bytes = raw.encode("utf-8")
        else:
            key_bytes = raw
        return load_pem_private_key(key_bytes, password=None)
