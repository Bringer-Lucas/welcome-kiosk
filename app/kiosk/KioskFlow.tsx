"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Employee } from "@/lib/employees";
import { avatarColor, initials } from "@/lib/avatar";
import styles from "./kiosk.module.css";

type Step = "welcome" | "details" | "host" | "photo" | "submitting" | "done";

// A visitor who wanders off mid-check-in shouldn't leave their half-typed name
// on a screen in the lobby.
const IDLE_RESET_MS = 90_000;
const DONE_RESET_MS = 12_000;

export default function KioskFlow({ employees }: { employees: Employee[] }) {
  const [step, setStep] = useState<Step>("welcome");
  const [visitorName, setVisitorName] = useState("");
  const [visitorCompany, setVisitorCompany] = useState("");
  const [hostId, setHostId] = useState<number | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmedHostName, setConfirmedHostName] = useState("");

  const reset = useCallback(() => {
    setStep("welcome");
    setVisitorName("");
    setVisitorCompany("");
    setHostId(null);
    setPhotoDataUrl(null);
    setSearch("");
    setError(null);
    setConfirmedHostName("");
  }, []);

  // Idle timeout, restarted by any interaction.
  useEffect(() => {
    if (step === "welcome" || step === "submitting") return;

    let timer = window.setTimeout(reset, step === "done" ? DONE_RESET_MS : IDLE_RESET_MS);

    if (step === "done") return () => window.clearTimeout(timer);

    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(reset, IDLE_RESET_MS);
    };

    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [step, reset]);

  const host = useMemo(
    () => employees.find((e) => e.id === hostId) ?? null,
    [employees, hostId],
  );

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.department ?? "").toLowerCase().includes(q) ||
        (e.jobTitle ?? "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  async function submit() {
    setStep("submitting");
    setError(null);

    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visitorName,
          visitorCompany,
          hostEmployeeId: hostId,
          photoDataUrl,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please ask at the desk.");
        setStep("photo");
        return;
      }

      setConfirmedHostName(data.hostName ?? host?.name ?? "your host");
      setStep("done");
    } catch {
      setError("Couldn't reach reception's system. Please ask at the desk.");
      setStep("photo");
    }
  }

  return (
    <div className={styles.shell}>
      {step === "welcome" && (
        <>
          <main className={styles.main}>
            <h1 className={styles.title}>Welcome</h1>
            <p className={styles.subtitle}>Please check in and we&rsquo;ll let your host know.</p>
          </main>
          <div className={styles.footer}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary} ${styles.startButton}`}
              onClick={() => setStep("details")}
            >
              Check in
            </button>
          </div>
        </>
      )}

      {step === "details" && (
        <>
          <main className={styles.main}>
            <h1 className={styles.title}>Your details</h1>
            <label className={styles.field}>
              <span className={styles.label}>Your name</span>
              <input
                className={styles.input}
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                autoComplete="off"
                autoCapitalize="words"
                autoFocus
                enterKeyHint="next"
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>
                Company <span className={styles.optional}>(optional)</span>
              </span>
              <input
                className={styles.input}
                value={visitorCompany}
                onChange={(e) => setVisitorCompany(e.target.value)}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="done"
              />
            </label>
          </main>
          <div className={styles.footer}>
            <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={reset}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              disabled={visitorName.trim().length === 0}
              onClick={() => setStep("host")}
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === "host" && (
        <>
          <main className={styles.main}>
            <h1 className={styles.title}>Who are you here to see?</h1>
            <label className={styles.field}>
              <input
                className={styles.input}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or team"
                autoComplete="off"
                enterKeyHint="search"
              />
            </label>

            {matches.length === 0 ? (
              <p className={styles.empty}>
                {employees.length === 0
                  ? "The staff directory hasn't been set up yet. Please ask at the desk."
                  : `No one matches "${search.trim()}".`}
              </p>
            ) : (
              <div className={styles.hostGrid}>
                {matches.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={`${styles.hostCard} ${hostId === e.id ? styles.hostCardSelected : ""}`}
                    onClick={() => setHostId(e.id)}
                  >
                    <Avatar employee={e} />
                    <span className={styles.hostName}>{e.name}</span>
                    {e.jobTitle && <span className={styles.hostTitle}>{e.jobTitle}</span>}
                  </button>
                ))}
              </div>
            )}
          </main>
          <div className={styles.footer}>
            <button
              type="button"
              className={`${styles.button} ${styles.ghost}`}
              onClick={() => setStep("details")}
            >
              Back
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              disabled={hostId === null}
              onClick={() => setStep("photo")}
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === "photo" && (
        <PhotoStep
          error={error}
          photoDataUrl={photoDataUrl}
          onCapture={setPhotoDataUrl}
          onBack={() => setStep("host")}
          onSubmit={submit}
        />
      )}

      {step === "submitting" && (
        <main className={styles.main}>
          <h1 className={styles.title}>Checking you in&hellip;</h1>
          <p className={styles.subtitle}>One moment.</p>
        </main>
      )}

      {step === "done" && (
        <>
          <main className={styles.main}>
            <div className={styles.doneIcon} aria-hidden="true">
              ✓
            </div>
            <h1 className={styles.title}>You&rsquo;re checked in</h1>
            <p className={styles.subtitle}>
              {confirmedHostName} has been notified. Your badge is printing &mdash; please take it
              from the printer and wear it while you&rsquo;re here.
            </p>
            <div className={styles.summary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Name</span>
                <span className={styles.summaryValue}>{visitorName}</span>
              </div>
              {visitorCompany.trim() && (
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Company</span>
                  <span className={styles.summaryValue}>{visitorCompany}</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Visiting</span>
                <span className={styles.summaryValue}>{confirmedHostName}</span>
              </div>
            </div>
          </main>
          <div className={styles.footer}>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={reset}>
              Done
            </button>
          </div>
        </>
      )}

      {step !== "welcome" && step !== "done" && (
        <p className={styles.privacy}>
          Your photo is used for your visitor badge and our on-site record, and is deleted
          automatically.
        </p>
      )}
    </div>
  );
}

function Avatar({ employee }: { employee: Employee }) {
  if (employee.photoId !== null) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        className={styles.hostAvatar}
        src={`/api/photos/${employee.photoId}`}
        alt=""
        width={72}
        height={72}
      />
    );
  }

  return (
    <span
      className={`${styles.hostAvatar} ${styles.hostInitials}`}
      style={{ background: avatarColor(employee.name) }}
      aria-hidden="true"
    >
      {initials(employee.name)}
    </span>
  );
}

// Badge photos print at about 25 mm square on a DK-1202 label, so anything
// past a few hundred pixels is bytes we store and never use.
const CAPTURE_MAX_EDGE = 480;

function PhotoStep({
  error,
  photoDataUrl,
  onCapture,
  onBack,
  onSubmit,
}: {
  error: string | null;
  photoDataUrl: string | null;
  onCapture: (dataUrl: string | null) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  useEffect(() => {
    // Already captured — the preview is frozen, no need to hold the camera.
    if (photoDataUrl) return;

    let cancelled = false;

    async function start() {
      // getUserMedia is undefined on plain HTTP, which is exactly what happens
      // if someone points the iPad at the app over http://.
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "This device can't open the camera here. You can continue without a photo.",
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        if (!cancelled) {
          setCameraError("The camera isn't available. You can continue without a photo.");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [photoDataUrl, stopCamera]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const scale = Math.min(1, CAPTURE_MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Drawn unmirrored: the preview is flipped for the person standing there,
    // but the badge should show them the way everyone else sees them.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    onCapture(canvas.toDataURL("image/jpeg", 0.82));
    stopCamera();
  }

  return (
    <>
      <main className={styles.main}>
        <h1 className={styles.title}>Photo for your badge</h1>
        {error && <p className={styles.notice}>{error}</p>}

        <div className={styles.cameraFrame}>
          {photoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.captured} src={photoDataUrl} alt="Your badge photo" />
          ) : (
            <>
              <video ref={videoRef} className={styles.video} playsInline muted autoPlay />
              {cameraError && <p className={styles.cameraMessage}>{cameraError}</p>}
            </>
          )}
        </div>
      </main>

      <div className={styles.footer}>
        <button type="button" className={`${styles.button} ${styles.ghost}`} onClick={onBack}>
          Back
        </button>

        {photoDataUrl ? (
          <>
            <button
              type="button"
              className={`${styles.button} ${styles.secondary}`}
              onClick={() => onCapture(null)}
            >
              Retake
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={onSubmit}
            >
              Check in
            </button>
          </>
        ) : cameraError ? (
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onSubmit}>
            Continue without a photo
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.button} ${styles.primary}`}
            disabled={!ready}
            onClick={capture}
          >
            Take photo
          </button>
        )}
      </div>
    </>
  );
}
