import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserRouteGuardProps {
  children: React.ReactNode;
}

const UserRouteGuard: React.FC<UserRouteGuardProps> = ({ children }) => {
  const navigate = useNavigate();
  const isVerified = sessionStorage.getItem('userVerified') === 'true';
  const currentPath = window.location.pathname;

  useEffect(() => {
    // Store the current path for redirect after verification
    if (!isVerified) {
      navigate('/user-verification', { state: { from: currentPath } });
    }
  }, [isVerified, navigate, currentPath]);

  if (!isVerified) {
    // Redirect to verification page if not verified
    return null;
  }

  return <>{children}</>;
};

export default UserRouteGuard;