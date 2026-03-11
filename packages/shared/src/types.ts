export type UUID = string;

export type RecordingStatus =
  | "idle"
  | "recording"
  | "processing"
  | "complete"
  | "failed";

export type TranscriptChunk = {
  id: UUID;
  recording_id: UUID;
  chunk_index: number;
  text: string;
  created_at: string;
};

export type Recording = {
  id: UUID;
  user_id: UUID;
  title: string | null;
  created_at: string;
  status: RecordingStatus;
  full_transcript: string | null;
};

export type MeetingNotes = {
  id: UUID;
  recording_id: UUID;
  summary: string;
  action_items: unknown;
  decisions: unknown;
  created_at: string;
};

