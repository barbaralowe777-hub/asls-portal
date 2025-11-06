import React from 'react';
import { useNavigate } from 'react-router-dom';
import Login from '@/components/Login';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Login
      onLoginSuccess={(role) => {
        if (role === 'admin') navigate('/admin-dashboard');
        else if (role === 'agent') navigate('/agent-dashboard');
        else navigate('/vendor-dashboard');
      }}
      onSwitchToSignup={() => navigate('/vendor-intake')}
    />
  );
};

export default LoginPage;

