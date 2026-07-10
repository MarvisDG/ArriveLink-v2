import { Suspense } from "react";
import Search from "@/views/search";

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading search…</div>}>
      <Search />
    </Suspense>
  );
}
