"use client";

import { useMutation } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@speckyai/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@speckyai/ui/components/ui/card";
import { Input } from "@speckyai/ui/components/ui/input";
import { Label } from "@speckyai/ui/components/ui/label";
import { Textarea } from "@speckyai/ui/components/ui/textarea";
import { Badge } from "@speckyai/ui/components/ui/badge";

type ActionItem = {
  task: string;
  owner: string;
  due: string | null;
};

type Decision = {
  decision: string;
  context: string;
};

type MeetingNotesJson = {
  title: string;
  date: string;
  duration: string;
  summary: string;
  key_topics: string[];
  action_items: ActionItem[];
  decisions: Decision[];
  open_questions: string[];
  attendees_mentioned: string[];
};

type NotesResponse = {
  recording_id: string;
  notes: MeetingNotesJson;
};

type PdfResponse = {
  recording_id: string;
  signed_url: string;
};

export default function NotesClient() {
  const params = useParams<{ recordingId: string }>();
  const recordingId = params.recordingId;

  const [notes, setNotes] = useState<MeetingNotesJson | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const hasNotes = !!notes;

  const generateNotes = useMutation<NotesResponse, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: recordingId })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to generate notes.");
      }
      return (await res.json()) as NotesResponse;
    },
    onSuccess: (data) => {
      setNotes(data.notes);
    }
  });

  const generatePdf = useMutation<PdfResponse, Error>({
    mutationFn: async () => {
      if (!notes) throw new Error("No notes to export.");
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: recordingId, notes })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to create PDF.");
      }
      return (await res.json()) as PdfResponse;
    },
    onSuccess: (data) => {
      setPdfUrl(data.signed_url);
    }
  });

  useEffect(() => {
    generateNotes.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingId]);

  const disabled = generateNotes.isPending || generatePdf.isPending;

  const orderedActions = useMemo(
    () => notes?.action_items ?? [],
    [notes?.action_items]
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Meeting notes</div>
          <div className="text-sm text-slate-600">
            Recording <span className="font-mono text-slate-700">{recordingId}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            disabled={generateNotes.isPending}
            onClick={() => generateNotes.mutate()}
          >
            {generateNotes.isPending ? "Regenerating…" : "Regenerate"}
          </Button>
          <Button disabled={!hasNotes || generatePdf.isPending} onClick={() => generatePdf.mutate()}>
            {generatePdf.isPending ? "Creating PDF…" : "Generate PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="min-h-[460px]">
          <CardHeader>
            <CardTitle>Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generateNotes.isPending && !notes ? (
              <p className="text-sm text-slate-600">Generating notes from transcript…</p>
            ) : generateNotes.error ? (
              <p className="text-sm text-red-600">{generateNotes.error.message}</p>
            ) : !notes ? (
              <p className="text-sm text-slate-600">No notes yet.</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={notes.title}
                      disabled={disabled}
                      onChange={(e) =>
                        setNotes((prev) => (prev ? { ...prev, title: e.target.value } : prev))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      value={notes.duration}
                      disabled={disabled}
                      onChange={(e) =>
                        setNotes((prev) => (prev ? { ...prev, duration: e.target.value } : prev))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="summary">Executive summary</Label>
                  <Textarea
                    id="summary"
                    rows={4}
                    value={notes.summary}
                    disabled={disabled}
                    onChange={(e) =>
                      setNotes((prev) => (prev ? { ...prev, summary: e.target.value } : prev))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Key topics</Label>
                  <div className="flex flex-wrap gap-2">
                    {notes.key_topics.map((topic, index) => (
                      <Badge
                        key={`${topic}-${index}`}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() =>
                          setNotes((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  key_topics: prev.key_topics.filter((_, i) => i !== index)
                                }
                              : prev
                          )
                        }
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Action items</Label>
                  <div className="space-y-2 rounded-md border bg-white p-3 text-sm">
                    {orderedActions.length === 0 ? (
                      <p className="text-slate-500">No action items.</p>
                    ) : (
                      orderedActions.map((item, index) => (
                        <div
                          key={`${item.task}-${index}`}
                          className="grid gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0 md:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_auto]"
                        >
                          <Input
                            value={item.task}
                            disabled={disabled}
                            onChange={(e) =>
                              setNotes((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      action_items: prev.action_items.map((a, i) =>
                                        i === index ? { ...a, task: e.target.value } : a
                                      )
                                    }
                                  : prev
                              )
                            }
                          />
                          <Input
                            value={item.owner}
                            disabled={disabled}
                            onChange={(e) =>
                              setNotes((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      action_items: prev.action_items.map((a, i) =>
                                        i === index ? { ...a, owner: e.target.value } : a
                                      )
                                    }
                                  : prev
                              )
                            }
                          />
                          <Input
                            placeholder="Due"
                            value={item.due ?? ""}
                            disabled={disabled}
                            onChange={(e) =>
                              setNotes((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      action_items: prev.action_items.map((a, i) =>
                                        i === index ? { ...a, due: e.target.value || null } : a
                                      )
                                    }
                                  : prev
                              )
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              setNotes((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      action_items: prev.action_items.filter((_, i) => i !== index)
                                    }
                                  : prev
                              )
                            }
                          >
                            ×
                          </Button>
                        </div>
                      ))
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled}
                      onClick={() =>
                        setNotes((prev) =>
                          prev
                            ? {
                                ...prev,
                                action_items: [
                                  ...prev.action_items,
                                  { task: "", owner: "Unassigned", due: null }
                                ]
                              }
                            : prev
                        )
                      }
                    >
                      + Add action item
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[460px]">
          <CardHeader>
            <CardTitle>PDF preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {generatePdf.error ? (
              <p className="text-sm text-red-600">{generatePdf.error.message}</p>
            ) : null}
            {pdfUrl ? (
              <>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-speckyai-indigo underline underline-offset-4"
                >
                  Open PDF in new tab
                </a>
                <div className="mt-2 h-[420px] w-full overflow-hidden rounded-md border bg-white">
                  <iframe
                    src={pdfUrl}
                    title="SpeckyAI PDF preview"
                    className="h-full w-full"
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Generate a PDF to see a preview here. You can still edit notes on the left before
                exporting.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

