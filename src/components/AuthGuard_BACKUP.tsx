import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // If no session, redirect to login
      if (!session) {
        router.push('/login');
        return;
      }

      // Check user's role from 'profiles'
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // If unauthorized role
      if (!profile || (allowedRoles && !allowedRoles.includes(profile.role))) {
        router.push('/unauthorized');
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router, allowedRoles]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500 text-lg">Checking credentials...</p>
      </div>
    );
  }

  return <>{children}</>;
}
