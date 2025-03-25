import React from 'react';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">CommunityConnect</h1>
          </Link>
          <div className="flex space-x-4">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Sign In</button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              Join Community
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}