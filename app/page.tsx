'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '../src/components/Header';
import { Footer } from '../src/components/Footer';
import { Home } from '../src/pages/Home';
import { Post } from '../src/types';

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/posts`, {
          cache: 'no-store' // Don't cache this request
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        
        const data = await response.json();
        setPosts(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching posts:', error);
        setError('Failed to fetch posts. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);
  
  return (
    <>
      <Header />
      <Home posts={posts} loading={loading} error={error} />
      <Footer />
    </>
  );
} 