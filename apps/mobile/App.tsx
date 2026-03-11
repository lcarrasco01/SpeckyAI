import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";

import { supabase } from "./src/lib/supabase";
import { useAudioRecorder } from "./src/hooks/useAudioRecorder";

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Signed out");
  const recorder = useAudioRecorder();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setStatus(data.session ? "Signed in" : "Signed out");
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setStatus(session ? "Signed in" : "Signed out");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    setStatus("Starting Google sign-in…");
    const redirectTo = AuthSession.makeRedirectUri({ scheme: "speckyai" });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });

    if (error || !data?.url) {
      setStatus(error?.message ?? "Failed to start OAuth flow.");
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !("url" in result) || !result.url) {
      setStatus("Sign-in cancelled.");
      return;
    }

    const url = new URL(result.url);
    const code = url.searchParams.get("code");
    if (!code) {
      setStatus("Missing auth code.");
      return;
    }

    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error) {
      setStatus(exchanged.error.message);
      return;
    }

    setStatus("Signed in");
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SpeckyAI</Text>
      <Text style={styles.subtitle}>{status}</Text>
      <Text style={styles.subtitle}>{email ?? "—"}</Text>
      <View style={styles.row}>
        <Button title="Google sign-in" onPress={signInWithGoogle} />
      </View>
      <View style={styles.row}>
        <Button title="Sign out" onPress={signOut} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recording</Text>
        <Text style={styles.subtitle}>
          {recorder.isRecording ? "Listening…" : "Ready"} • {recorder.elapsedSeconds}s
        </Text>
        {recorder.error ? <Text style={styles.error}>{recorder.error}</Text> : null}
        <View style={styles.row}>
          <Button
            title={recorder.isRecording ? "Stop" : "Start"}
            onPress={() => (recorder.isRecording ? recorder.stop() : recorder.start())}
          />
        </View>
        <Text style={styles.small}>
          Chunks: {recorder.transcriptChunks.length} {recorder.isUploading ? "(uploading…)" : ""}
        </Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12
  },
  subtitle: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 6
  },
  row: {
    height: 44,
    marginTop: 12,
    alignSelf: "stretch"
  },
  section: {
    marginTop: 24,
    alignSelf: "stretch"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8
  },
  error: {
    color: "#dc2626",
    marginTop: 8
  },
  small: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748b"
  }
});
