import { NextResponse } from 'next/server';
import { Post } from '../../../src/types';
import * as postsService from '../../../src/services/postsService';
import { revalidatePath } from 'next/cache';

// GET handler for fetching all posts
export async function GET() {
  const posts = await postsService.getPosts();
  return NextResponse.json(posts);
}

// POST handler for creating a new post
export async function POST(request: Request) {
  try {
    // Create the new post
    const body = await request.json();
    const newPost = await postsService.createPost(body);
    
    // Revalidate the homepage to show the new post immediately
    revalidatePath('/');
    
    // Return the new post
    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
} 