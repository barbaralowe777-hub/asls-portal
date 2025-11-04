// src/components/AuthGuard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // Check session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login'); // redirect if not logged in
        return;
      }

      // Fetch user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (!profile || (allowedRoles && !allowedRoles.includes(profile.role))) {
        navigate('/unauthorized'); // redirect if wrong role
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [navigate, allowedRoles]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-600 text-lg font-medium">Checking access...</p>
      </div>
    );
  }

  return <>{children}</>;
}
