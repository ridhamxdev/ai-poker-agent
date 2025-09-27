import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loading from './Loading'; // Loading component is correctly imported

interface RequireAuthProps {
  children: React.ReactNode;
}

const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { user, isLoading } = useAuth(); // isLoading is now being destructured
  const location = useLocation();
  console.log('RequireAuth - User:', user, 'Loading:', isLoading);

  // This check prevents premature redirects
  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    // Redirect to signin but save the attempted location
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;