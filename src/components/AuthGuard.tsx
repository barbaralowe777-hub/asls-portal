// src/components/AuthGuard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

const ADMIN_ALLOWLIST = [
  "john@asls.net.au",
  "david@asls.net.au",
  "george@asls.net.au",
  "admin@asls.net.au",
  "barbaralowe777@gmail.com",
];

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          navigate('/login'); // redirect if not logged in
          return;
        }

        const email = session.user.email?.toLowerCase?.() || "";
        const adminEmailAllowed = ADMIN_ALLOWLIST.includes(email);

        // Fetch user role (may fail if RLS blocks; allow list can still grant admin)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const roleFromProfile = profile?.role || null;
        const roleFromMeta =
          (session.user.user_metadata as any)?.role ||
          (session.user.user_metadata as any)?.profile_role ||
          null;

        let role = roleFromProfile || roleFromMeta || (adminEmailAllowed ? 'admin' : null);

        // Fallback: if no stored role but route allows vendor/agent/admin, default to the first allowed
        if (!role && allowedRoles?.length) {
          if (allowedRoles.includes('vendor')) role = 'vendor';
          else if (allowedRoles.includes('agent')) role = 'agent';
          else if (allowedRoles.includes('admin')) role = adminEmailAllowed ? 'admin' : 'admin';
        }

        const adminOverride = adminEmailAllowed && allowedRoles?.includes('admin');
        const isAllowed = allowedRoles
          ? (role ? allowedRoles.includes(role) : false) || adminOverride
          : true;

        if (!isAllowed) {
          navigate('/unauthorized'); // redirect if wrong role
          return;
        }

        setLoading(false);
      } catch {
        navigate('/unauthorized');
      }
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
