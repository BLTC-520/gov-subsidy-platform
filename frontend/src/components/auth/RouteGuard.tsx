import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface RouteGuardProps {
  children: React.ReactNode;
  requiredRole: 'admin' | 'citizen';
}

export const RouteGuard: React.FC<RouteGuardProps> = ({ children, requiredRole }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();

        const isAdmin = profile?.is_admin === true || String(profile?.is_admin) === 'true';

        if (requiredRole === 'admin' && !isAdmin) {
          navigate('/citizen');
          return;
        }

        if (requiredRole === 'citizen' && isAdmin) {
          navigate('/admin');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Route guard error:', error);
        navigate('/login');
      }
    };

    checkAuthorization();
  }, [navigate, requiredRole]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};