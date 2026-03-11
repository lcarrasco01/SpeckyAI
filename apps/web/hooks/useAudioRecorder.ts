"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "../lib/supabaseClient";

type TranscriptChunkUi = {
  chunkIndex: number;
  text: string;
  startTimeSeconds: number;
};

type RecorderState = {
  isRecording: boolean;
  isUploading: boolean;
  error: string | null;
  recordingId: string | null;
  elapsedSeconds: number;
  transcriptChunks: TranscriptChunkUi[];
};

type UploadQueueItem = {
  chunkIndex: number;
  blob: Blob;
  startTimeSeconds: number;
};

const CHUNK_MS = 60_000;

export function useAudioRecorder() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const queueRef = useRef<UploadQueueItem[]>([]);
  const uploadingRef = useRef(false);
  const chunkIndexRef = useRef(0);
  const recordingStartMsRef = useRef<number | null>(null);

  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isUploading: false,
    error: null,
    recordingId: null,
    elapsedSeconds: 0,
    transcriptChunks: []
  });

  const flushQueue = useCallback(async () => {
    if (uploadingRef.current) return;
    if (!state.recordingId) return;
    if (queueRef.current.length === 0) return;

    uploadingRef.current = true;
    setState((s) => ({ ...s, isUploading: true }));

    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0]!;

        const form = new FormData();
        form.set("recording_id", state.recordingId);
        form.set("chunk_index", String(item.chunkIndex));
        form.set("start_time_seconds", String(item.startTimeSeconds));
        form.set("file", item.blob, `chunk-${item.chunkIndex}.webm`);

        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Upload failed (${res.status})`);
        }

        const json = (await res.json()) as {
          chunk_index: number;
          transcript_text: string;
          start_time_seconds: number;
        };

        setState((s) => ({
          ...s,
          transcriptChunks: [
            ...s.transcriptChunks.filter((c) => c.chunkIndex !== json.chunk_index),
            {
              chunkIndex: json.chunk_index,
              text: json.transcript_text,
              startTimeSeconds: json.start_time_seconds
            }
          ].sort((a, b) => a.chunkIndex - b.chunkIndex)
        }));

        queueRef.current.shift();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setState((s) => ({ ...s, error: message }));
    } finally {
      uploadingRef.current = false;
      setState((s) => ({ ...s, isUploading: false }));
    }
  }, [state.recordingId]);

  const start = useCallback(async (title?: string) => {
    setState((s) => ({ ...s, error: null, transcriptChunks: [] }));
    chunkIndexRef.current = 0;
    queueRef.current = [];

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setState((s) => ({ ...s, error: "You must be logged in to record." }));
      return;
    }

    const autoTitle =
      title?.trim() ||
      `Meeting — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

    const { data: recording, error: recordingError } = await supabase
      .from("recordings")
      .insert({ user_id: user.id, title: autoTitle, status: "recording" })
      .select("id")
      .single();

    if (recordingError || !recording?.id) {
      setState((s) => ({ ...s, error: recordingError?.message ?? "Failed to create recording." }));
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const preferredMime = "audio/webm;codecs=opus";
    const mimeType = MediaRecorder.isTypeSupported(preferredMime) ? preferredMime : undefined;

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;

    recordingStartMsRef.current = Date.now();
    setState((s) => ({
      ...s,
      isRecording: true,
      recordingId: recording.id,
      elapsedSeconds: 0
    }));

    recorder.addEventListener("dataavailable", (event) => {
      const blob = event.data;
      if (!blob || blob.size === 0) return;

      const chunkIndex = chunkIndexRef.current++;
      const startMs = recordingStartMsRef.current ?? Date.now();
      const startTimeSeconds = Math.floor((Date.now() - startMs) / 1000);

      queueRef.current.push({ chunkIndex, blob, startTimeSeconds });
      void flushQueue();
    });

    recorder.start(CHUNK_MS);

    timerRef.current = window.setInterval(() => {
      setState((s) => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 }));
    }, 1000);
  }, [flushQueue, supabase]);

  const stop = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    mediaRecorderRef.current = null;

    const stream = mediaStreamRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;

    recordingStartMsRef.current = null;

    setState((s) => ({ ...s, isRecording: false }));
  }, []);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  const transcriptText = state.transcriptChunks.map((c) => c.text).join("\n");

  return {
    ...state,
    transcriptText,
    start,
    stop
  };
}

