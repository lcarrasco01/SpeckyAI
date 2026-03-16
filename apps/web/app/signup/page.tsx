import { Suspense } from "react";
import AuthClient from "../login/AuthClient";

export default function SignupPage() {
  return (
    <Suspense>
      <AuthClient defaultTab="signup" />
    </Suspense>
  );
}
