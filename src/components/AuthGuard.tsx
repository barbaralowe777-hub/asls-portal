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
      // Demo bypass: allow access when ?demo=1 or VITE_DEMO_NO_BACKEND=1
      try {
        const isDemo = new URLSearchParams(window.location.search).get('demo') === '1'
          || (import.meta as any).env?.VITE_DEMO_NO_BACKEND === '1';
        if (isDemo) {
          setLoading(false);
          return;
        }
      } catch {}

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
