import { Post } from '../types';
import fs from 'fs';
import path from 'path';
import { createClient } from 'redis';

// Redis key for storing posts
const POSTS_KEY = 'comm-it:posts';

// Path to our JSON file for storing posts (for development only)
const dataPath = path.join(process.cwd(), 'data', 'posts.json');

// Initial demo posts data
const INITIAL_POSTS: Post[] = [
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

// Redis client singleton
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize and get the Redis client
 */
async function getRedisClient() {
  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL
      });
      
      await redisClient.connect();
      
      // Check if posts exist in Redis, if not, initialize with demo data
      const postsExist = await redisClient.exists(POSTS_KEY);
      if (!postsExist) {
        console.log('Initializing Redis with demo posts data');
        await redisClient.set(POSTS_KEY, JSON.stringify(INITIAL_POSTS));
      }
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
      throw error;
    }
  }
  
  return redisClient;
}

/**
 * Ensure the data directory exists (for development only)
 */
function ensureDataDirExists() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(INITIAL_POSTS, null, 2), 'utf8');
  }
}

/**
 * Get all posts
 */
export async function getPosts(): Promise<Post[]> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, use Redis
      const client = await getRedisClient();
      const postsJson = await client.get(POSTS_KEY);
      
      if (!postsJson) {
        console.log('No posts found in Redis, initializing with demo data');
        await client.set(POSTS_KEY, JSON.stringify(INITIAL_POSTS));
        return [...INITIAL_POSTS];
      }
      
      return JSON.parse(postsJson);
    } else {
      // In development, use file storage
      ensureDataDirExists();
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading posts:', error);
    return [...INITIAL_POSTS];
  }
}

/**
 * Save all posts
 */
export async function savePosts(posts: Post[]): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      // In production, use Redis
      const client = await getRedisClient();
      await client.set(POSTS_KEY, JSON.stringify(posts));
    } else {
      // In development, use file storage
      ensureDataDirExists();
      fs.writeFileSync(dataPath, JSON.stringify(posts, null, 2), 'utf8');
    }
  } catch (error) {
    console.error('Error writing posts:', error);
  }
}

/**
 * Create a new post
 */
export async function createPost(postData: Omit<Post, 'id' | 'date'>): Promise<Post> {
  const posts = await getPosts();
  
  const newPost: Post = {
    ...postData,
    id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    date: new Date().toISOString().split('T')[0]
  };
  
  posts.unshift(newPost);
  await savePosts(posts);
  
  return newPost;
}

/**
 * Get a post by ID
 */
export async function getPostById(id: number): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find(post => post.id === id) || null;
}

/**
 * Update a post
 */
export async function updatePost(id: number, postData: Partial<Post>): Promise<Post | null> {
  const posts = await getPosts();
  const index = posts.findIndex(post => post.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedPost = { ...posts[index], ...postData };
  posts[index] = updatedPost;
  
  await savePosts(posts);
  return updatedPost;
}

/**
 * Delete a post
 */
export async function deletePost(id: number): Promise<boolean> {
  const posts = await getPosts();
  const filteredPosts = posts.filter(post => post.id !== id);
  
  if (filteredPosts.length === posts.length) {
    return false; // Post not found
  }
  
  await savePosts(filteredPosts);
  return true;
} 