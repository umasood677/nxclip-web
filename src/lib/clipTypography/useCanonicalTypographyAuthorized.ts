import { useEffect, useState } from 'react';
import { identityApi } from '../../services/apiClient';

/**
 * Environment-level T3 capability from GET /auth/me → features.canonicalTypography.
 *
 * After the access-unification policy change, this bit reflects the environment kill
 * switch for every authenticated user (not per-user allowlisting). Fail-closed when
 * missing/false. Never treat a local boolean as authorization.
 *
 * @deprecated Prefer treating features.canonicalTypography as a transitional env flag;
 * clients already render canonical Typography controls for all authenticated sessions.
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
