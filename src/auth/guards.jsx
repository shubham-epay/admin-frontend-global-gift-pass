import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <div className="boot"><span className="boot-mark" aria-hidden />Restoring your session</div>;
  if (status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export function Guard({ perm, children }) {
  const { can } = useAuth();
  if (!can(perm)) {
    return (
      <div className="page">
        <div className="panel empty">
          <span className="empty-icon" aria-hidden>!</span>
          <h2>You don’t have access to this page</h2>
          <p>Ask a Super Admin to add the required permission to your role.</p>
        </div>
      </div>
    );
  }
  return children;
}
