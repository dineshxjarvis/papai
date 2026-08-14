import { useRef, useCallback, useEffect } from "react";
import { runClaimPipeline } from "../lib/claimPipeline.js";
import { claimTypeToColor } from "../claim-detection/types.js";
import { findClaimRange } from "../claim-detection/findInEditor.js";

const DEBOUNCE_MS = 1800;

function isAbortError(err) {
  if (!err) return false;
  if (err.name === "AbortError") return true;
  return /aborted|AbortError/i.test(String(err.message || err));
}

export default function useClaimDetection(editor, claimLog, options = {}) {
  const {
    enabled = true,
    provider = "auto",
    onProgress,
    onError,
  } = options;

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const lastTextRef = useRef("");
  const runIdRef = useRef(0);
  const busyRef = useRef(false);

  const addClaimsRef = useRef(claimLog.addClaims);
  const onProgressRef = useRef(onProgress);
  const onErrorRef = useRef(onError);
  addClaimsRef.current = claimLog.addClaims;
  onProgressRef.current = onProgress;
  onErrorRef.current = onError;

  const applyHighlights = useCallback(
    (claims) => {
      if (!editor || !claims?.length) return;
      claims.forEach((claim) => {
        const color = claimTypeToColor(claim);
        const range = findClaimRange(editor, claim.text);
        if (!range) {
          console.warn("[highlight] range not found:", claim.text?.slice(0, 60));
          return;
        }
        try {
          editor
            .chain()
            .setTextSelection(range)
            .setClaimMark({ claimId: claim.id, claimType: color })
            .run();
        } catch (e) {
          console.warn("[highlight] mark failed", e);
        }
      });
      try {
        editor.commands.focus("end");
      } catch (_) {}
    },
    [editor]
  );

  const runDetection = useCallback(
    async (text, source = "manual") => {
      if (!text || text.trim().length < 20) return [];

      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch (_) {}
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const myRun = ++runIdRef.current;
      busyRef.current = true;

      try {
        const claims = await runClaimPipeline(text, {
          signal: controller.signal,
          provider,
          source,
          onProgress: (...args) => onProgressRef.current?.(...args),
        });

        if (myRun !== runIdRef.current || controller.signal.aborted) {
          return [];
        }

        const list = Array.isArray(claims) ? claims : [];
        if (list.length) {
          addClaimsRef.current(list);
          applyHighlights(list);
        }
        return list;
      } catch (err) {
        if (isAbortError(err)) return [];
        console.error("[useClaimDetection]", err);
        onErrorRef.current?.(err);
        return [];
      } finally {
        if (myRun === runIdRef.current) busyRef.current = false;
      }
    },
    [applyHighlights, provider]
  );

  const detectAll = useCallback(async () => {
    if (!editor) return [];
    return runDetection(editor.getText(), "full");
  }, [editor, runDetection]);

  const detectSelection = useCallback(async () => {
    if (!editor) return [];
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return detectAll();
    return runDetection(text, "selection");
  }, [editor, runDetection, detectAll]);

  const handleEditorUpdate = useCallback(() => {
    if (!enabled || !editor) return;

    const text = editor.getText();
    if (text === lastTextRef.current) return;

    const prevLen = lastTextRef.current.length;
    lastTextRef.current = text;

    if (text.length - prevLen > 2500) {
      if (timerRef.current) clearTimeout(timerRef.current);
      detectAll();
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      if (busyRef.current) return;

      const windowText = text.slice(-2500);
      if (windowText.trim().length < 40) return;

      onProgressRef.current?.("live", "Scanning last ~2500 characters");

      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch (_) {}
      }
      const controller = new AbortController();
      abortRef.current = controller;
      const myRun = ++runIdRef.current;
      busyRef.current = true;

      try {
        const claims = await runClaimPipeline(windowText, {
          signal: controller.signal,
          provider,
          source: "live",
          onProgress: (...args) => onProgressRef.current?.(...args),
        });

        if (myRun !== runIdRef.current || controller.signal.aborted) return;

        const list = Array.isArray(claims) ? claims : [];
        if (list.length) {
          addClaimsRef.current(list);
          applyHighlights(list);
        }
      } catch (err) {
        if (!isAbortError(err)) {
          console.error("[live detection]", err);
          onErrorRef.current?.(err);
        }
      } finally {
        if (myRun === runIdRef.current) busyRef.current = false;
      }
    }, DEBOUNCE_MS);
  }, [editor, enabled, applyHighlights, detectAll, provider]);

  useEffect(() => {
    if (!editor || !enabled) return;
    editor.on("update", handleEditorUpdate);
    return () => {
      editor.off("update", handleEditorUpdate);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [editor, enabled, handleEditorUpdate]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  return {
    detectAll,
    detectSelection,
    isLiveEnabled: enabled,
  };
}
