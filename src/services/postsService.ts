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

/**
 * Check if we're running in production environment
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' && !!process.env.REDIS_URL;
}

// Redis client creation function (not a singleton in serverless)
async function createRedisClient() {
  if (!isProduction()) {
    return null;
  }
  
  try {
    console.log('Creating new Redis client with URL:', process.env.REDIS_URL?.substring(0, 12) + '...');
    
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff with a maximum delay of 3 seconds
          return Math.min(retries * 100, 3000);
        }
      }
    });
    
    // Log connection events
    client.on('error', (err) => console.error('Redis client error:', err));
    
    await client.connect();
    console.log('Redis client connected');
    
    return client;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return null;
  }
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
  console.log(`Getting posts (environment: ${process.env.NODE_ENV}, using Redis: ${isProduction()})`);
  let client = null;
  
  try {
    if (isProduction()) {
      // In production, use Redis
      client = await createRedisClient();
      if (!client) {
        console.warn('Redis client unavailable, falling back to initial posts data');
        return [...INITIAL_POSTS];
      }
      
      // Check if posts exist in Redis, if not, initialize with demo data
      const postsExist = await client.exists(POSTS_KEY);
      console.log(`Posts exist in Redis: ${postsExist}`);
      
      if (!postsExist) {
        console.log('No posts found in Redis, initializing with demo data');
        await client.set(POSTS_KEY, JSON.stringify(INITIAL_POSTS));
        return [...INITIAL_POSTS];
      }
      
      const postsJson = await client.get(POSTS_KEY);
      if (!postsJson) {
        return [...INITIAL_POSTS];
      }
      
      console.log('Posts retrieved from Redis successfully');
      const posts = JSON.parse(postsJson);
      console.log(`Found ${posts.length} posts`);
      return posts;
    } else {
      // In development, use file storage
      ensureDataDirExists();
      const data = fs.readFileSync(dataPath, 'utf8');
      const posts = JSON.parse(data);
      console.log(`Read ${posts.length} posts from file storage`);
      return posts;
    }
  } catch (error) {
    console.error('Error reading posts:', error);
    return [...INITIAL_POSTS];
  } finally {
    // Clean up Redis connection
    if (client) {
      try {
        await client.quit();
        console.log('Redis client disconnected properly');
      } catch (err) {
        console.error('Error disconnecting Redis client:', err);
      }
    }
  }
}

/**
 * Save all posts
 */
export async function savePosts(posts: Post[]): Promise<void> {
  console.log(`Saving ${posts.length} posts (environment: ${process.env.NODE_ENV}, using Redis: ${isProduction()})`);
  let client = null;
  
  try {
    if (isProduction()) {
      // In production, use Redis
      client = await createRedisClient();
      if (!client) {
        console.warn('Redis client unavailable, posts not saved');
        return;
      }
      
      await client.set(POSTS_KEY, JSON.stringify(posts));
      console.log('Posts saved to Redis successfully');
    } else {
      // In development, use file storage
      ensureDataDirExists();
      fs.writeFileSync(dataPath, JSON.stringify(posts, null, 2), 'utf8');
      console.log('Posts saved to file storage');
    }
  } catch (error) {
    console.error('Error writing posts:', error);
  } finally {
    // Clean up Redis connection
    if (client) {
      try {
        await client.quit();
        console.log('Redis client disconnected properly');
      } catch (err) {
        console.error('Error disconnecting Redis client:', err);
      }
    }
  }
}

/**
 * Create a new post
 */
export async function createPost(postData: Omit<Post, 'id' | 'date'>): Promise<Post> {
  console.log('Creating new post with data:', postData);
  
  const posts = await getPosts();
  
  const newPost: Post = {
    ...postData,
    id: posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1,
    date: new Date().toISOString().split('T')[0]
  };
  
  posts.unshift(newPost);
  await savePosts(posts);
  
  console.log('New post created with ID:', newPost.id);
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