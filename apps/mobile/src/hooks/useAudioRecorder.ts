import { useCallback, useEffect, useRef, useState } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

import { supabase } from "../lib/supabase";

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

const CHUNK_MS = 60_000;

export function useAudioRecorder() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startMsRef = useRef<number | null>(null);
  const chunkIndexRef = useRef(0);

  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isUploading: false,
    error: null,
    recordingId: null,
    elapsedSeconds: 0,
    transcriptChunks: []
  });

  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "http://localhost:3000";

  const startNewRecording = useCallback(async () => {
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
  }, []);

  const uploadChunk = useCallback(
    async (uri: string, chunkIndex: number, startTimeSeconds: number) => {
      if (!state.recordingId) throw new Error("Missing recording id");

      setState((s) => ({ ...s, isUploading: true }));
      const upload = await FileSystem.uploadAsync(`${apiBaseUrl}/api/transcribe`, uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        parameters: {
          recording_id: state.recordingId,
          chunk_index: String(chunkIndex),
          start_time_seconds: String(startTimeSeconds)
        }
      });

      if (upload.status < 200 || upload.status >= 300) {
        throw new Error(upload.body || `Upload failed (${upload.status})`);
      }

      const json = JSON.parse(upload.body) as {
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
        ].sort((a, b) => a.chunkIndex - b.chunkIndex),
        isUploading: false
      }));
    },
    [apiBaseUrl, state.recordingId]
  );

  const finalizeCurrentChunk = useCallback(async () => {
    const current = recordingRef.current;
    if (!current) return;

    recordingRef.current = null;
    const chunkIndex = chunkIndexRef.current++;
    const startMs = startMsRef.current ?? Date.now();
    const startTimeSeconds = Math.floor((Date.now() - startMs) / 1000);

    await current.stopAndUnloadAsync();
    const uri = current.getURI();
    if (!uri) return;

    await uploadChunk(uri, chunkIndex, startTimeSeconds);
    await startNewRecording();
  }, [startNewRecording, uploadChunk]);

  const start = useCallback(
    async (title?: string) => {
      setState((s) => ({ ...s, error: null, transcriptChunks: [] }));
      chunkIndexRef.current = 0;

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        setState((s) => ({ ...s, error: "You must be logged in to record." }));
        return;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        setState((s) => ({ ...s, error: "Microphone permission is required." }));
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true
      });

      const autoTitle =
        title?.trim() ||
        `Meeting — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

      const { data: recording, error: recordingError } = await supabase
        .from("recordings")
        .insert({ user_id: user.id, title: autoTitle, status: "recording" })
        .select("id")
        .single();

      if (recordingError || !recording?.id) {
        setState((s) => ({
          ...s,
          error: recordingError?.message ?? "Failed to create recording."
        }));
        return;
      }

      startMsRef.current = Date.now();
      setState((s) => ({
        ...s,
        recordingId: recording.id,
        isRecording: true,
        elapsedSeconds: 0
      }));

      await startNewRecording();

      intervalRef.current = setInterval(() => {
        finalizeCurrentChunk().catch((e) => {
          const message = e instanceof Error ? e.message : "Chunk upload failed";
          setState((s) => ({ ...s, error: message }));
        });
      }, CHUNK_MS);

      timerRef.current = setInterval(() => {
        setState((s) => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 }));
      }, 1000);
    },
    [finalizeCurrentChunk, startNewRecording]
  );

  const stop = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    setState((s) => ({ ...s, isRecording: false }));

    try {
      await finalizeCurrentChunk();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to stop recording";
      setState((s) => ({ ...s, error: message }));
    } finally {
      recordingRef.current = null;
    }
  }, [finalizeCurrentChunk]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { ...state, start, stop };
}

