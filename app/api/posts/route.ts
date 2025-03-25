import { NextResponse } from 'next/server';
import { Post } from '../../../src/types';
import fs from 'fs';
import path from 'path';

// Path to our JSON file for storing posts
const dataPath = path.join(process.cwd(), 'data', 'posts.json');

// Helper function to ensure the data directory exists
function ensureDataDirExists() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(dataPath)) {
    // Initial posts data
    const initialPosts = [
      {
        id: 1,
        title: "Free Piano Lessons for Seniors",
        type: "Offer" as const,
        author: "Sarah Chen",
        location: "Cambridge",
        description: "Offering free piano lessons for seniors at the community center. Available every Saturday morning.",
        date: "2024-03-15",
        category: "Education"
      },
      {
        id: 2,
        title: "Community Garden Volunteers Needed",
        type: "Request" as const,
        author: "Mike Johnson",
        location: "Boston",
        description: "Looking for volunteers to help maintain our community garden. Tools and refreshments provided.",
        date: "2024-03-14",
        category: "Volunteering"
      },
      {
        id: 3,
        title: "Local Art Exhibition Space Available",
        type: "Offer" as const,
        author: "Emma Davis",
        location: "Cambridge",
        description: "Offering free exhibition space for local artists at the neighborhood gallery.",
        date: "2024-03-13",
        category: "Arts"
      }
    ];
    fs.writeFileSync(dataPath, JSON.stringify(initialPosts, null, 2), 'utf8');
  }
}

// Helper function to read posts from the file
function readPosts(): Post[] {
  ensureDataDirExists();
  try {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading posts:', error);
    return [];
  }
}

// Helper function to write posts to the file
function writePosts(posts: Post[]): void {
  ensureDataDirExists();
  try {
    fs.writeFileSync(dataPath, JSON.stringify(posts, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing posts:', error);
  }
}

// GET handler for fetching all posts
export async function GET() {
  const posts = readPosts();
  return NextResponse.json(posts);
}

// POST handler for creating a new post
export async function POST(request: Request) {
  const posts = readPosts();
  const body = await request.json();
  
  const newPost: Post = {
    ...body,
    id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    date: new Date().toISOString().split('T')[0]
  };
  
  posts.unshift(newPost);
  writePosts(posts);
  
  return Response.json(newPost, { status: 201 });
} 