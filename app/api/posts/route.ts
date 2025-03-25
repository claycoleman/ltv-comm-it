import { NextResponse } from 'next/server';
import { Post } from '../../../src/types';
import * as postsService from '../../../src/services/postsService';

// GET handler for fetching all posts
export async function GET() {
  const posts = await postsService.getPosts();
  return NextResponse.json(posts);
}

// POST handler for creating a new post
export async function POST(request: Request) {
  const body = await request.json();
  const newPost = await postsService.createPost(body);
  return Response.json(newPost, { status: 201 });
} 