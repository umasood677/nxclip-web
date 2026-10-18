import { useEffect, useState } from 'react';
import { identityApi } from '../../services/apiClient';

/**
 * Server-authoritative T3 capability from GET /auth/me → features.canonicalTypography.
 * Fail-closed when missing/false. Never treat a local boolean as authorization.
 */
export function useCanonicalTypographyAuthorized(): {
  authorized: boolean;
  loading: boolean;
} {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await identityApi.getMe();
        const bit = Boolean(
          me?.features?.canonicalTypography ?? me?.Features?.CanonicalTypography,
        );
        if (!cancelled) setAuthorized(bit);
      } catch {
        if (!cancelled) setAuthorized(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { authorized, loading };
}
