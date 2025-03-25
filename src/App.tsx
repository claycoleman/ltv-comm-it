import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { PostOffer } from './pages/PostOffer';
import { PostRequest } from './pages/PostRequest';
import { Post } from './types';

const initialPosts: Post[] = [
  {
    id: 1,
    title: "Free Piano Lessons for Seniors",
    type: "Offer",
    author: "Sarah Chen",
    location: "Cambridge",
    description: "Offering free piano lessons for seniors at the community center. Available every Saturday morning.",
    date: "2024-03-15",
    category: "Education"
  },
  {
    id: 2,
    title: "Community Garden Volunteers Needed",
    type: "Request",
    author: "Mike Johnson",
    location: "Boston",
    description: "Looking for volunteers to help maintain our community garden. Tools and refreshments provided.",
    date: "2024-03-14",
    category: "Volunteering"
  },
  {
    id: 3,
    title: "Local Art Exhibition Space Available",
    type: "Offer",
    author: "Emma Davis",
    location: "Cambridge",
    description: "Offering free exhibition space for local artists at the neighborhood gallery.",
    date: "2024-03-13",
    category: "Arts"
  }
];

function App() {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  const handleNewPost = (newPost: Omit<Post, 'id' | 'date'>) => {
    const post: Post = {
      ...newPost,
      id: posts.length + 1,
      date: new Date().toISOString().split('T')[0]
    };
    setPosts([post, ...posts]);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<Home posts={posts} />} />
          <Route path="/post-offer" element={<PostOffer onSubmit={handleNewPost} />} />
          <Route path="/post-request" element={<PostRequest onSubmit={handleNewPost} />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;