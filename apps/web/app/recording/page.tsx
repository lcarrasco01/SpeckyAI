"use client";

import { useState } from "react";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";

import { useAudioRecorder } from "../../hooks/useAudioRecorder";

export default function RecordingPage() {
  const [title, setTitle] = useState("");
  const recorder = useAudioRecorder();

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Recording</div>
          <div className="text-sm text-slate-600">
            {recorder.isRecording ? "Listening…" : "Ready"} • {recorder.elapsedSeconds}s
          </div>
        </div>
        <div className="flex gap-3">
          {!recorder.isRecording ? (
            <Button onClick={() => recorder.start(title)}>Start</Button>
          ) : (
            <Button variant="destructive" onClick={recorder.stop}>
              Stop
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly sync"
              disabled={recorder.isRecording}
            />
          </div>
          {recorder.error ? <p className="text-sm text-red-600">{recorder.error}</p> : null}
          {recorder.recordingId ? (
            <p className="text-xs text-slate-500">Recording ID: {recorder.recordingId}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Live transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] overflow-auto rounded-md border bg-white p-3 text-sm leading-relaxed text-slate-800">
              {recorder.transcriptChunks.length === 0 ? (
                <span className="text-slate-500">
                  Transcript chunks will appear here as they’re uploaded…
                </span>
              ) : (
                recorder.transcriptChunks.map((c) => (
                  <div key={c.chunkIndex} className="mb-3">
                    <div className="mb-1 text-xs font-medium text-slate-500">
                      Chunk {c.chunkIndex} • {c.startTimeSeconds}s
                    </div>
                    <div>{c.text || <span className="text-slate-400">(empty)</span>}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <div>
              <span className="font-medium">Uploading:</span>{" "}
              {recorder.isUploading ? "Yes" : "No"}
            </div>
            <div>
              <span className="font-medium">Chunks:</span> {recorder.transcriptChunks.length}
            </div>
            <div className="text-xs text-slate-500">
              This is the basic chunked pipeline: every 60s the browser records a WebM/Opus audio
              chunk and uploads it to <code>/api/transcribe</code>.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

