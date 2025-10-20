import React, { useState } from 'react';
import { Key, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';

const ApiKeys: React.FC = () => {
  const [showKey, setShowKey] = useState(false);
  const [apiKey] = useState('pk_live_abc123xyz789def456ghi012jkl345mno678pqr901stu234');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API key copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">API Keys Management</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Production API Key</h2>
              <p className="text-gray-600 text-sm">Use this key for live applications</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono">
                {showKey ? apiKey : '••••••••••••••••••••••••••••••••••••••••'}
              </code>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="p-2 hover:bg-gray-200 rounded"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-gray-200 rounded"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <button className="flex items-center text-blue-600 hover:text-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Key
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-lg font-bold mb-4">API Documentation</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Submit Application</h4>
              <code className="block bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
                POST https://api.lendportal.com/v1/applications
              </code>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Get Application Status</h4>
              <code className="block bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
                GET https://api.lendportal.com/v1/applications/:id
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;
