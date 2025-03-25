import React from "react";
import { Header } from "../src/components/Header";
import { Footer } from "../src/components/Footer";
import { Home } from "@/src/page-components/Home";
import * as postsService from "../src/services/postsService";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default async function Page() {
  const posts = await postsService.getPosts();

  return (
    <>
      <Header />
      <Home posts={posts} />
      <Footer />
    </>
  );
}
