import { Suspense } from "react";
import NotesClient from "./NotesClient";

export default function NotesPage() {
  return (
    <Suspense>
      <NotesClient />
    </Suspense>
  );
}

