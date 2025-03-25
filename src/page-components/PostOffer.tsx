import React, { useState } from 'react';
import { Post } from '../types';
import { AudioRecorder } from '../components/AudioRecorder';

interface PostOfferProps {
  onSubmit: (post: Omit<Post, 'id' | 'date'>) => void;
  onCancel: () => void;
}

export function PostOffer({ onSubmit, onCancel }: PostOfferProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: 'Boston',
    category: '',
    author: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      type: 'Offer'
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAudioProcessed = (data: Record<string, any>) => {
    setFormData({
      title: data.title || '',
      description: data.description || '',
      location: data.location || 'Boston',
      category: data.category || '',
      author: data.author || ''
    });
    
    // Show a notification that the form has been filled with AI-processed data
    // This could be replaced with a toast notification or other UI feedback
    const formElement = document.querySelector('form');
    if (formElement) {
      formElement.classList.add('border-green-500', 'border-2');
      setTimeout(() => {
        formElement.classList.remove('border-green-500', 'border-2');
      }, 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Post an Offer</h2>
      
      {/* Audio Recorder Component */}
      <AudioRecorder 
        onAudioProcessed={handleAudioProcessed} 
        postType="Offer" 
      />
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            type="text"
            name="title"
            id="title"
            required
            value={formData.title}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="What are you offering?"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            id="description"
            required={false}
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Provide details about your offer..."
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Location
          </label>
          <select
            name="location"
            id="location"
            required
            value={formData.location}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="Boston">Boston</option>
            <option value="Cambridge">Cambridge</option>
          </select>
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <input
            type="text"
            name="category"
            id="category"
            required
            value={formData.category}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="e.g., Education, Services, Events"
          />
        </div>

        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            type="text"
            name="author"
            id="author"
            required
            value={formData.author}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Your full name"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Post Offer
          </button>
        </div>
      </form>
    </div>
  );
}