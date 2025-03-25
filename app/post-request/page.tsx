'use client';

import React from 'react';
import { Header } from '../../src/components/Header';
import { Footer } from '../../src/components/Footer';
import { PostRequest } from '../../src/page-components/PostRequest';
import { useRouter } from 'next/navigation';
import { Post } from '../../src/types';

export default function PostRequestPage() {
  const router = useRouter();

  const handleSubmit = async (post: Omit<Post, 'id' | 'date'>) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      // Use next/navigation router for client-side navigation
      router.push('/');
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <>
      <Header />
      <PostRequest 
        onSubmit={handleSubmit} 
        onCancel={handleCancel}
      />
      <Footer />
    </>
  );
} 