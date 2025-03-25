import React from "react";
import { Header } from "../src/components/Header";
import { Footer } from "../src/components/Footer";
import { Post } from "../src/types";
import fs from "fs";
import path from "path";
import { Home } from "@/src/page-components/Home";

// Path to our JSON file for storing posts
const dataPath = path.join(process.cwd(), "data", "posts.json");

// Helper function to read posts from the file
async function readPosts(): Promise<Post[]> {
  try {
    // Ensure the data directory exists
    const dataDir = path.join(process.cwd(), "data");
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
          description:
            "Offering free piano lessons for seniors at the community center. Available every Saturday morning.",
          date: "2024-03-15",
          category: "Education",
        },
        {
          id: 2,
          title: "Community Garden Volunteers Needed",
          type: "Request" as const,
          author: "Mike Johnson",
          location: "Boston",
          description:
            "Looking for volunteers to help maintain our community garden. Tools and refreshments provided.",
          date: "2024-03-14",
          category: "Volunteering",
        },
        {
          id: 3,
          title: "Local Art Exhibition Space Available",
          type: "Offer" as const,
          author: "Emma Davis",
          location: "Cambridge",
          description:
            "Offering free exhibition space for local artists at the neighborhood gallery.",
          date: "2024-03-13",
          category: "Arts",
        },
      ];
      fs.writeFileSync(dataPath, JSON.stringify(initialPosts, null, 2), "utf8");
      return initialPosts;
    }

    const data = fs.readFileSync(dataPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading posts:", error);
    return [];
  }
}

export default async function Page() {
  const posts = await readPosts();

  return (
    <>
      <Header />
      <Home posts={posts} />
      <Footer />
    </>
  );
}
