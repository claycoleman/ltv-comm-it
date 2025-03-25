import React from 'react';
import { MapPin, Gift, HandHeart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Post } from '../types';

interface HomeProps {
  posts: Post[];
}

export function Home({ posts }: HomeProps) {
  return (
    <>
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Connect with Your Boston Community</h2>
            <p className="text-xl text-indigo-100 mb-8">Share, request, and discover local opportunities in Boston and Cambridge</p>
            <div className="flex justify-center space-x-8">
              <div className="flex flex-col items-center">
                <MapPin className="h-8 w-8 mb-2" />
                <span>Local Focus</span>
              </div>
              <div className="flex flex-col items-center">
                <Gift className="h-8 w-8 mb-2" />
                <span>Share Offers</span>
              </div>
              <div className="flex flex-col items-center">
                <HandHeart className="h-8 w-8 mb-2" />
                <span>Make Requests</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-gray-900">Recent Community Posts</h3>
          <div className="flex space-x-2">
            <Link
              to="/post-offer"
              className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-md hover:bg-indigo-50"
            >
              Post an Offer
            </Link>
            <Link
              to="/post-request"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Make a Request
            </Link>
          </div>
        </div>

        <div className="grid gap-6">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                    post.type === 'Offer' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  } mb-2`}>
                    {post.type}
                  </span>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h4>
                  <p className="text-gray-600 mb-4">{post.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{post.location}</span>
                    <span>•</span>
                    <span>{post.category}</span>
                  </div>
                </div>
                <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                  Learn More →
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}