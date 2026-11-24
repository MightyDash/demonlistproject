import React from "react";
import { SearchX } from "lucide-react";

export function RouteNotFound({ title = "Page not found", message = "This shared link is invalid or the content is no longer available.", onBack }) {
  return (
    <main className="route-not-found">
      <section>
        <SearchX aria-hidden="true" />
        <p>Moik&apos;s Demon List</p>
        <h1>{title}</h1>
        <span>{message}</span>
        <button type="button" onClick={onBack}>Back to Demon List</button>
      </section>
    </main>
  );
}
