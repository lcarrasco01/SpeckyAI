import { Suspense } from "react";
import AuthClient from "./login/AuthClient";

export default function HomePage() {
  return (
    <Suspense>
      <AuthClient defaultTab="login" />
    </Suspense>
  );
}
