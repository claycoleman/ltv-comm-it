import { NextResponse } from "next/server";
import { Post } from "../../../../src/types";
import fs from "fs";
import path from "path";

// Path to our JSON file for storing posts
const dataPath = path.join(process.cwd(), "data", "posts.json");

// Helper function to read posts from the file
function readPosts(): Post[] {
  try {
    const data = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading posts:", error);
    return [];
  }
}

// Helper function to write posts to the file
function writePosts(posts: Post[]): void {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(posts, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing posts:", error);
  }
}

// GET handler for fetching a single post
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const posts = readPosts();
  const post = posts.find((p) => p.id === parseInt(id));

  if (!post) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  return NextResponse.json(post);
}

// PUT handler for updating a post
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const posts = readPosts();
  const postIndex = posts.findIndex((p) => p.id === parseInt(id));

  if (postIndex === -1) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  const body = await request.json();
  const updatedPost = {
    ...posts[postIndex],
    ...body,
    id, // Ensure ID doesn't change
  };

  posts[postIndex] = updatedPost;
  writePosts(posts);

  return NextResponse.json(updatedPost);
}

// DELETE handler for deleting a post
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const posts = readPosts();
  const { id } = await params;
  const filteredPosts = posts.filter((p) => p.id !== parseInt(id));

  if (filteredPosts.length === posts.length) {
    return NextResponse.json({ message: "Post not found" }, { status: 404 });
  }

  writePosts(filteredPosts);
  return NextResponse.json({ message: "Post deleted successfully" });
}
