import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { registerServiceWorker } from '@/lib/service-worker';

export function PermissionOnboarding({ 
  websiteId, 
  apiUrl, 
  onComplete 
}: { 
  websiteId: string; 
  apiUrl: string; 
  onComplete: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnable = async () => {
    setIsLoading(true);
    setError('');

    try {
      await registerServiceWorker(websiteId, apiUrl);
      
      // Show success notification
      new Notification('Welcome! ', {
        body: 'You\'ll now receive important updates',
        icon: '/icon-192.png',
      });

      onComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <button onClick={onComplete} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <h2 className="text-2xl font-bold mb-2">Enable Notifications</h2>
        <p className="text-gray-600 mb-4">
          Get instant updates about your campaigns, subscriber activity, and important alerts.
        </p>

        <div className="bg-purple-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold mb-2">You'll receive:</p>
          <ul className="text-sm space-y-1">
            <li>• Campaign performance updates</li>
            <li>• New subscriber notifications</li>
            <li>• System alerts</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleEnable}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? 'Setting up...' : 'Enable Notifications'}
        </button>

        <button
          onClick={onComplete}
          className="w-full text-gray-500 text-sm mt-3 hover:text-gray-700"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}