import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
  ArrowLeftRight,
  Captions,
  Download,
  Heart,
  Mic,
  Plus,
  Pencil,
  RotateCcw,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  getTalkApi,
  isTalkApiError,
  pinLabel,
  type PhrasePin,
  type PinFolder,
  type TalkProfile,
  type TalkRole,
  type TalkUtterance,
  type UsageSnapshot,
} from '@/api/talk';
import { speakText, speechRecognitionSupported, startSpeechRecognition } from '@/lib/speech';
import { TalkStage } from '@/components/talk/TalkStage';
import { UpgradeSheet } from '@/components/talk/UpgradeSheet';
import { playbackFromSignIds, type TalkPlayback } from '@/components/talk/playback';
import { dictionaryCatalog } from '@/api/talk/catalog';
import { getSignById } from '@/data/content';

const SESSION_KEY = 'signflow-talk-session-id';
const FOLDERS: PinFolder[] = ['general', 'doctor', 'school', 'work'];

interface CaptionLine {
  id: string;
  text: string;
  direction: string;
}

interface PinDraft {
  id?: string;
  custom_text: string;
  sign_id: string;
  folder: PinFolder;
}

export function TalkPage() {
  const api = useMemo(() => getTalkApi(), []);
  const [profile, setProfile] = useState<TalkProfile | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [pins, setPins] = useState<PhrasePin[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [role, setRole] = useState<TalkRole>('i_sign');
  const [captions, setCaptions] = useState<CaptionLine[]>([]);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [managePins, setManagePins] = useState(false);
  const [pinEditor, setPinEditor] = useState<PinDraft | null>(null);
  const [camOpen, setCamOpen] = useState(false);
  const [glossDraft, setGlossDraft] = useState('');
  const [playback, setPlayback] = useState<TalkPlayback | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const lastUtterance = useRef<TalkUtterance | null>(null);
  const listenCtl = useRef<{ stop: () => void } | null>(null);

  const loadUsage = useCallback(async () => {
    setUsage(await api.getUsage());
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await api.getMe();
      const nextPins = await api.listPins();
      const savedId = sessionStorage.getItem(SESSION_KEY);
      let session = savedId ? await api.getSession(savedId).catch(() => null) : null;
      if (!session || session.status === 'ended') {
        session = await api.createSession({ mode: 'same_phone', host_role: me.role_default });
        sessionStorage.setItem(SESSION_KEY, session.id);
      }
      const nextUsage = await api.getUsage();
      if (cancelled) return;
      setProfile(me);
      setRole(me.role_default);
      setPins(nextPins);
      setSessionId(session.id);
      setUsage(nextUsage);
    })().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to start Talk');
    });
    return () => {
      cancelled = true;
      listenCtl.current?.stop();
    };
  }, [api]);

  const applyPlayback = useCallback((utterance: TalkUtterance, speak: boolean) => {
    lastUtterance.current = utterance;
    const next = playbackFromSignIds(utterance.output_sign_ids, utterance.output_text);
    setPlayback(next);
    setReplayKey((key) => key + 1);
    setCaptions((lines) => {
      const nextLines = [...lines, { id: utterance.id, text: utterance.output_text, direction: utterance.direction }];
      return nextLines.slice(-8);
    });
    if (speak) speakText(utterance.output_text);
  }, []);

  const submitUtterance = useCallback(
    async (
      direction: TalkUtterance['direction'],
      raw_input: TalkUtterance['raw_input'],
      opts?: { speak?: boolean },
    ) => {
      if (!sessionId || busy) return;
      setBusy(true);
      setError(null);
      try {
        const result = await api.createUtterance(
          sessionId,
          { direction, raw_input, client_duration_ms: 0 },
          crypto.randomUUID(),
        );
        setUsage((prev) =>
          prev
            ? {
                ...prev,
                talk_phrases_used: result.usage.talk_phrases_used,
                talk_seconds_used: result.usage.talk_seconds_used,
                capped: result.usage.capped,
              }
            : prev,
        );
        const speak =
          opts?.speak ?? (direction === 'pin' || direction === 'sign_to_text');
        applyPlayback(result.utterance, speak);
        if (result.usage.capped) setUpgradeOpen(true);
      } catch (err) {
        if (isTalkApiError(err) && err.body.error.code === 'FREE_CAP') {
          await loadUsage();
          setUpgradeOpen(true);
        } else {
          setError(err instanceof Error ? err.message : 'Could not send phrase');
        }
      } finally {
        setBusy(false);
      }
    },
    [api, applyPlayback, busy, loadUsage, sessionId],
  );

  const onPin = (pin: PhrasePin) => {
    if (managePins) {
      setPinEditor({
        id: pin.id,
        custom_text: pin.custom_text ?? pinLabel(pin, dictionaryCatalog),
        sign_id: pin.sign_id ?? '',
        folder: pin.folder,
      });
      return;
    }
    void submitUtterance('pin', { pin_id: pin.id });
  };

  const onSendText = () => {
    const text = draft.trim();
    if (!text) return;
    const direction = role === 'i_speak' ? 'speech_to_sign' : 'text_to_sign';
    void submitUtterance(direction, role === 'i_speak' ? { transcript: text, text } : { text });
    setDraft('');
  };

  const toggleMic = () => {
    if (listening) {
      listenCtl.current?.stop();
      listenCtl.current = null;
      setListening(false);
      return;
    }
    if (!speechRecognitionSupported()) {
      setError('Speech recognition is not available in this browser. Type the phrase instead.');
      return;
    }
    setError(null);
    const ctl = startSpeechRecognition({
      onResult: (transcript, isFinal) => {
        setDraft(transcript);
        if (isFinal && transcript) {
          void submitUtterance('speech_to_sign', { transcript, text: transcript });
          setDraft('');
        }
      },
      onError: (message) => {
        setListening(false);
        setError(`Mic: ${message}. You can type the phrase instead.`);
      },
      onEnd: () => setListening(false),
    });
    if (!ctl) {
      setError('Speech recognition is not available in this browser. Type the phrase instead.');
      return;
    }
    listenCtl.current = ctl;
    setListening(true);
  };

  const onCam = () => {
    setCamOpen(true);
  };

  const submitGloss = () => {
    const gloss = glossDraft
      .split(/[,\s]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (gloss.length === 0) return;
    setCamOpen(false);
    setGlossDraft('');
    void submitUtterance('sign_to_text', { gloss }, { speak: true });
  };

  const swapRole = async () => {
    const next: TalkRole = role === 'i_sign' ? 'i_speak' : 'i_sign';
    setRole(next);
    const me = await api.patchMe({ role_default: next });
    setProfile(me);
  };

  const replayLast = () => {
    if (!lastUtterance.current) return;
    setReplayKey((key) => key + 1);
    if (lastUtterance.current.direction === 'pin' || lastUtterance.current.direction === 'sign_to_text') {
      speakText(lastUtterance.current.output_text);
    }
  };

  const saveLastAsPin = async () => {
    const utterance = lastUtterance.current;
    if (!utterance?.output_text) return;
    const created = await api.createPin({
      custom_text: utterance.output_text,
      sign_id: utterance.output_sign_ids[0],
    });
    setPins(await api.listPins());
    setError(`Saved “${created.custom_text}” as a pin.`);
  };

  const savePinEditor = async () => {
    if (!pinEditor) return;
    if (pinEditor.id) {
      await api.patchPin(pinEditor.id, {
        custom_text: pinEditor.custom_text,
        sign_id: pinEditor.sign_id || null,
        folder: pinEditor.folder,
      });
    } else {
      await api.createPin({
        custom_text: pinEditor.custom_text,
        sign_id: pinEditor.sign_id || undefined,
        folder: pinEditor.folder,
      });
    }
    setPins(await api.listPins());
    setPinEditor(null);
  };

  const deletePin = async (id: string) => {
    await api.deletePin(id);
    setPins(await api.listPins());
    setPinEditor(null);
  };

  const startTrial = async () => {
    const me = await api.patchMe({ plan: 'trial' });
    setProfile(me);
    await loadUsage();
    setUpgradeOpen(false);
  };

  const upgradePro = async () => {
    const me = await api.patchMe({ plan: 'pro' });
    setProfile(me);
    await loadUsage();
    setUpgradeOpen(false);
  };

  const currentSign = playback?.signs[0] ?? getSignById('sign-hello') ?? null;

  return (
    <div className="flex flex-col gap-3 max-w-lg mx-auto w-full">
      <header className="relative flex items-center justify-center min-h-10">
        <h1 className="text-xl font-semibold">Talk</h1>
        <button
          type="button"
          onClick={() => void swapRole()}
          className="absolute right-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-sm hover:bg-secondary"
          aria-label={`Role ${role === 'i_sign' ? 'I sign' : 'I speak'}. Activate to swap.`}
        >
          <User className="h-3.5 w-3.5" />
          {role === 'i_sign' ? 'I sign' : 'I speak'}
        </button>
      </header>

      <TalkStage
        sign={playback ? currentSign : null}
        animation={playback?.animation ?? null}
        parts={playback?.parts ?? []}
        label={playback?.label ?? ''}
        replayKey={replayKey}
      />

      <section className="rounded-xl border border-border bg-card overflow-hidden" aria-label="Captions">
        <div className="flex items-center justify-between px-3 pt-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Captions</p>
          <Captions className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="px-3 py-3 min-h-[96px] space-y-1 text-sm">
          {captions.length === 0 ? (
            <p className="text-muted-foreground">
              {role === 'i_speak'
                ? 'Speak or type a phrase — signs play on the stage.'
                : 'Tap a pin or type glosses — English captions appear here.'}
            </p>
          ) : (
            captions.map((line) => (
              <p key={line.id} data-direction={line.direction}>
                {line.text}
              </p>
            ))
          )}
        </div>
        <div className="border-t border-border px-3 py-2 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSendText();
            }}
            placeholder={role === 'i_speak' ? 'Type or dictate a phrase…' : 'Type a phrase to sign…'}
            className="flex-1 h-9 px-3 rounded-lg bg-secondary border border-border text-sm placeholder:text-muted-foreground"
            aria-label="Phrase to send"
          />
          <Button size="sm" onClick={onSendText} disabled={busy || !draft.trim()}>
            Send
          </Button>
        </div>
        <div className="px-3 pb-3 flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mic className="h-3.5 w-3.5" /> Mic
          </span>
          <span className="inline-flex items-center gap-1">
            <Video className="h-3.5 w-3.5" /> Cam
          </span>
        </div>
      </section>

      {error && (
        <p className="text-sm text-destructive" role="status">
          {error}
        </p>
      )}

      <div className="flex justify-around py-1">
        <ControlButton
          icon={Mic}
          label={listening ? 'Stop' : 'Mic'}
          active={listening}
          onClick={toggleMic}
        />
        <ControlButton icon={Video} label="Cam" onClick={onCam} />
        <ControlButton icon={ArrowLeftRight} label="Swap" onClick={() => void swapRole()} />
        <ControlButton icon={RotateCcw} label="Replay" onClick={replayLast} />
        <ControlButton icon={Download} label="Save" onClick={() => void saveLastAsPin()} />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {pins.map((pin) => (
          <button
            key={pin.id}
            type="button"
            onClick={() => onPin(pin)}
            className={cn(
              'shrink-0 h-9 px-4 rounded-full border text-sm whitespace-nowrap',
              managePins
                ? 'border-warning/60 text-warning'
                : 'border-border hover:border-primary/60 hover:bg-secondary',
            )}
          >
            {pinLabel(pin, dictionaryCatalog)}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            setPinEditor({ custom_text: '', sign_id: '', folder: 'general' })
          }
          className="shrink-0 h-9 w-9 rounded-full border border-border inline-flex items-center justify-center hover:bg-secondary"
          aria-label="Add phrase pin"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setManagePins((value) => !value)}
          className={cn(
            'shrink-0 h-9 w-9 rounded-full border inline-flex items-center justify-center',
            managePins ? 'border-primary text-primary' : 'border-border hover:bg-secondary',
          )}
          aria-pressed={managePins}
          aria-label="Manage phrase pins"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {usage && (
        <p className="text-center text-[11px] text-muted-foreground">
          {profile?.plan === 'pro' || profile?.plan === 'trial'
            ? `Talk ${profile.plan} · ${usage.talk_phrases_used} phrases today`
            : `${usage.talk_phrases_used}/${usage.talk_phrases_limit ?? 10} free phrases today`}
        </p>
      )}

      <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pb-1">
        <Heart className="h-3 w-3 text-primary" aria-hidden="true" />
        Communication aid — not a certified interpreter
      </p>

      <UpgradeSheet
        open={upgradeOpen}
        usage={usage}
        onClose={() => setUpgradeOpen(false)}
        onStartTrial={() => void startTrial()}
        onUpgradePro={() => void upgradePro()}
      />

      {pinEditor && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{pinEditor.id ? 'Edit pin' : 'New pin'}</h2>
              <button type="button" onClick={() => setPinEditor(null)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-sm">
              Phrase
              <input
                value={pinEditor.custom_text}
                onChange={(e) => setPinEditor({ ...pinEditor, custom_text: e.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-secondary border border-border"
              />
            </label>
            <label className="block text-sm">
              Dictionary sign
              <select
                value={pinEditor.sign_id}
                onChange={(e) => setPinEditor({ ...pinEditor, sign_id: e.target.value })}
                className="mt-1 w-full h-10 px-3 rounded-lg bg-secondary border border-border"
              >
                <option value="">Map from phrase text</option>
                {dictionaryCatalog
                  .filter((sign) => sign.tags.includes('greetings') || sign.tags.includes('daily') || sign.tags.includes('questions'))
                  .map((sign) => (
                    <option key={sign.id} value={sign.id}>
                      {sign.label_en} ({sign.gloss})
                    </option>
                  ))}
              </select>
            </label>
            <label className="block text-sm">
              Folder
              <select
                value={pinEditor.folder}
                onChange={(e) =>
                  setPinEditor({ ...pinEditor, folder: e.target.value as PinFolder })
                }
                className="mt-1 w-full h-10 px-3 rounded-lg bg-secondary border border-border"
              >
                {FOLDERS.map((folder) => (
                  <option key={folder} value={folder}>
                    {folder}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 justify-end">
              {pinEditor.id && (
                <Button variant="outline" onClick={() => void deletePin(pinEditor.id!)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              )}
              <Button onClick={() => void savePinEditor()} disabled={!pinEditor.custom_text.trim()}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {camOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Sign to text</h2>
              <button type="button" onClick={() => setCamOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Live camera recognition is not in this slice. Enter glosses (for example{' '}
              <code>HELLO HELP</code>) and we will caption them in English.
            </p>
            <input
              value={glossDraft}
              onChange={(e) => setGlossDraft(e.target.value)}
              placeholder="HELLO WHERE BATHROOM"
              className="w-full h-10 px-3 rounded-lg bg-secondary border border-border"
              aria-label="Gloss list"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCamOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitGloss} disabled={!glossDraft.trim()}>
                Caption
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex flex-col items-center gap-1 text-xs text-muted-foreground',
        active && 'text-primary',
      )}
    >
      <span
        className={cn(
          'h-12 w-12 rounded-full border border-border inline-flex items-center justify-center',
          active ? 'border-primary bg-primary/10' : 'hover:bg-secondary',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      {label}
    </button>
  );
}
