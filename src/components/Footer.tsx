import React from 'react';
import { Users } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-gray-400" />
            <span className="text-gray-600">CommunityConnect</span>
          </div>
          <div className="text-sm text-gray-500">
            Serving Boston and Cambridge communities
          </div>
        </div>
      </div>
    </footer>
  );
}