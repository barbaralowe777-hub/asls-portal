import React from 'react';
import { useNavigate } from 'react-router-dom';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="bg-white shadow rounded-xl p-8 text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">You don't have permission to view this page.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 rounded-lg bg-[#1dad21] text-white hover:bg-green-700"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;

