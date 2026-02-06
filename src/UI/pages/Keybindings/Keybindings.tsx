import { useEffect, useMemo, useState } from "react";
import { Topbar } from "../MainPanel";

type HudKeybindings = {
  version: number;
  actions: { id: string; label?: string }[];
};
type UserKeybinds = {
  version: number;
  bindings: { action: string; bind: string }[];
};

function normalizeBind(e: KeyboardEvent) {
  const parts: string[] = [];

  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Super"); // or "Command" on mac, but Super is fine for linux/win

  // Don't allow binding only a modifier
  if (
    [
      "ShiftLeft",
      "ShiftRight",
      "ControlLeft",
      "ControlRight",
      "AltLeft",
      "AltRight",
      "MetaLeft",
      "MetaRight",
    ].includes(e.code)
  ) {
    return null;
  }

  const code = e.code;

  // Map common physical keys -> accelerator key names
  if (code.startsWith("Digit")) {
    parts.push(code.replace("Digit", "")); // Digit0 -> "0"
  } else if (code.startsWith("Key")) {
    parts.push(code.replace("Key", "").toUpperCase()); // KeyA -> "A"
  } else if (code.startsWith("F")) {
    parts.push(code); // F1..F24
  } else {
    // useful extras
    const map: Record<string, string> = {
      Space: "Space",
      Enter: "Enter",
      Escape: "Esc",
      Backspace: "Backspace",
      Tab: "Tab",
      ArrowUp: "Up",
      ArrowDown: "Down",
      ArrowLeft: "Left",
      ArrowRight: "Right",
      Minus: "-",
      Equal: "=",
      BracketLeft: "[",
      BracketRight: "]",
      Backslash: "\\",
      Semicolon: ";",
      Quote: "'",
      Comma: ",",
      Period: ".",
      Slash: "/",
      Backquote: "`",
      Numpad0: "Num0",
      Numpad1: "Num1",
      Numpad2: "Num2",
      Numpad3: "Num3",
      Numpad4: "Num4",
      Numpad5: "Num5",
      Numpad6: "Num6",
      Numpad7: "Num7",
      Numpad8: "Num8",
      Numpad9: "Num9",
      NumpadAdd: "NumAdd",
      NumpadSubtract: "NumSub",
      NumpadMultiply: "NumMult",
      NumpadDivide: "NumDiv",
      NumpadDecimal: "NumDec",
    };

    const mapped = map[code];
    if (!mapped) return null; // unknown key, skip
    parts.push(mapped);
  }

  return parts.join("+");
}

export default function Keybindings() {
  const [hud, setHud] = useState<HudKeybindings | null>(null);
  const [user, setUser] = useState<UserKeybinds | null>(null);

  const [recordingAction, setRecordingAction] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const hudKb = await window.electron.getHudKeybindings();
      const userKb = await window.electron.getUserKeybinds();
      setHud(hudKb);
      setUser(userKb);

      const init: Record<string, string> = {};
      for (const b of userKb.bindings) init[b.action] = b.bind;
      setDraft(init);
    })();
  }, []);

  // capture key when recording
  useEffect(() => {
    if (!recordingAction) return;

    setError(null);
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const bind = normalizeBind(e);
      if (!bind) return;

      setDraft((prev) => ({ ...prev, [recordingAction]: bind }));
      setRecordingAction(null);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, {
        capture: true,
      } as any);
  }, [recordingAction]);

  const actions = hud?.actions ?? [];

  // detect conflicts (same bind used twice)
  const conflicts = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const a of actions) {
      const bind = draft[a.id];
      if (!bind) continue;
      map.set(bind, [...(map.get(bind) ?? []), a.id]);
    }
    return [...map.entries()].filter(([, ids]) => ids.length > 1);
  }, [actions, draft]);

  const conflictSet = useMemo(
    () => new Set(conflicts.map(([b]) => b)),
    [conflicts],
  );

  const onSave = async () => {
    setSavedMsg(null);
    if (conflicts.length) {
      setError("Resolve duplicate keybinds before saving.");
      return;
    }

    const payload: UserKeybinds = {
      version: 1,
      bindings: actions
        .map((a) => ({ action: a.id, bind: draft[a.id] }))
        .filter((x) => !!x.bind),
    };

    window.electron.saveUserKeybinds(payload);
    setSavedMsg("Saved!");

    setTimeout(() => {
      setSavedMsg(null);
    }, 2000);
  };

  return (
    <div className="relative flex size-full flex-col gap-4">
      <Topbar header="Keybindings" />

      <div className="px-4">
        {error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {savedMsg ? (
          <div className="mt-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            {savedMsg}
          </div>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-[1fr_220px_140px] bg-white/5 px-4 py-3 text-xs uppercase tracking-wider text-white/60">
            <div>Action</div>
            <div>Keybind</div>
            <div className="text-right">Edit</div>
          </div>

          {actions.map((a) => {
            const label = a.label ?? a.id;
            const bind = draft[a.id] ?? "";
            const isRecording = recordingAction === a.id;
            const isConflict = bind && conflictSet.has(bind);

            return (
              <div
                key={a.id}
                className="grid grid-cols-[1fr_220px_140px] items-center border-t border-white/10 px-4 py-3"
              >
                <div className="text-sm text-white">{label}</div>

                <div className="text-sm">
                  <span
                    className={[
                      "inline-flex min-h-[28px] items-center rounded-md px-2 font-mono text-xs",
                      isRecording
                        ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-200"
                        : isConflict
                          ? "border border-red-500/30 bg-red-500/10 text-red-200"
                          : "border border-white/10 bg-white/5 text-white/80",
                    ].join(" ")}
                  >
                    {isRecording ? "Press keys..." : bind || "Unbound"}
                  </span>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    className="rounded-md bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15"
                    onClick={() => setRecordingAction(a.id)}
                  >
                    {isRecording ? "Recording…" : "Set"}
                  </button>

                  <button
                    className="rounded-md bg-white/5 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                    onClick={() =>
                      setDraft((p) => {
                        const next = { ...p };
                        delete next[a.id];
                        return next;
                      })
                    }
                  >
                    Clear
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {conflicts.length ? (
          <div className="mt-3 text-sm text-red-200/90">
            Duplicate binds detected:
            <ul className="mt-1 list-disc pl-5 text-xs text-red-200/70">
              {conflicts.map(([bind, ids]) => (
                <li key={bind}>
                  <span className="font-mono">{bind}</span> used by:{" "}
                  {ids.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-md bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-500/25"
            onClick={onSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
