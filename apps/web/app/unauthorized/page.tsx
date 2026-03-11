"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Button } from "@speckyai/ui/components/ui/button";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-speckyai-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unauthorized</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            You don’t have permission to view this page.
          </p>
          <Button onClick={() => router.push("/")}>Go home</Button>
        </CardContent>
      </Card>
    </main>
  );
}

