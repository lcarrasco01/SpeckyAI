"use client";

import { useRouter } from "next/navigation";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";

export default function VerifyEmailPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            We sent you a verification link. Once verified, come back and log in.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/login")}>Go to login</Button>
            <Button variant="secondary" onClick={() => router.push("/")}>
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

