import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface SignupProps {
  onSignupSuccess: (role: string) => void;
  onSwitchToLogin: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'vendor' | 'agent'>('vendor'); // only vendor or agent allowed
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Step 1: Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const user = data.user;

    // Step 2: Add a record to "profiles" table
    if (user) {
      const { error: insertError } = await supabase.from('profiles').insert([
        {
          id: user.id,
          email: email,
          role: role,
        },
      ]);

      if (insertError) {
        setError('Profile creation failed: ' + insertError.message);
        setLoading(false);
        return;
      }

      // Step 3: Redirect based on role
      onSignupSuccess(role);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Create Your Account
        </h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-[#1dad21] focus:border-[#1dad21]"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-[#1dad21] focus:border-[#1dad21]"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Account Type</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'vendor' | 'agent')}
              className="w-full px-4 py-2 border rounded-lg focus:ring-[#1dad21] focus:border-[#1dad21]"
            >
              <option value="vendor">Vendor</option>
              <option value="agent">Agent</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1dad21] text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-sm text-center mt-6">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-[#1dad21] hover:underline"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;

