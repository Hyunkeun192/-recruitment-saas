import { Suspense } from "react";
import { fetchPosts } from "./community/actions";
import HomePageContent from "./HomePageContent";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const posts = await fetchPosts();
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <HomePageContent initialPosts={posts.slice(0, 3)} />
    </Suspense>
  );
}
