import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Auth UI lives on /connect (Stitch wallet screen). Keep /login for bookmarks & ProtectedRoute redirects.
 */
export default function Login() {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  return <Navigate to={qs ? `/connect?${qs}` : '/connect'} replace />;
}
