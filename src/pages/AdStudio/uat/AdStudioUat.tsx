import { SEO } from "../../../components/SEO";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Search,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { downloadJson } from "../../BrandKits/lib/brandKitExport";
import {
  UAT_CHECKS,
  OUTCOMES,
  STORAGE_KEY,
  emptyFeedback,
  restoreFeedback,
  feedbackReport,
  feedbackMarkdown,
  checkUrl,
  type Feedback,
  type Outcome,
} from "./uatModel";
import "../styles/production-theme.css";
import "./uat.css";
const labels: Record<Outcome, string> = {
  "not-tested": "Not tested",
  pass: "Pass",
  issue: "Issue",
  blocked: "Blocked",
};
export default function AdStudioUat() {
  const [feedback, setFeedback] = useState<Record<string, Feedback>>(() => {
    try {
      return restoreFeedback(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      return {};
    }
  });
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState("all"),
    [filter, setFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [storageError, setStorageError] = useState("");
  const [context, setContext] = useState({
    projectId: "",
    brandId: "",
    creativeId: "",
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
      setStorageError("");
    } catch {
      setStorageError(
        "Browser storage is unavailable. Download your feedback before leaving this page.",
      );
    }
  }, [feedback]);
  const groups = [...new Set(UAT_CHECKS.map((check) => check.group))];
  const counts = Object.fromEntries(
    OUTCOMES.map((outcome) => [
      outcome,
      UAT_CHECKS.filter(
        (check) => (feedback[check.id]?.outcome || "not-tested") === outcome,
      ).length,
    ]),
  );
  const visible = useMemo(
    () =>
      UAT_CHECKS.filter(
        (check) =>
          (group === "all" || check.group === group) &&
          (filter === "all" ||
            (feedback[check.id]?.outcome || "not-tested") === filter) &&
          `${check.id} ${check.title} ${check.screen}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [group, filter, feedback, search],
  );
  const update = (id: string, patch: Partial<Feedback>) =>
    setFeedback((current) => ({
      ...current,
      [id]: { ...(current[id] || emptyFeedback()), ...patch },
    }));
  async function copy() {
    try {
      await navigator.clipboard.writeText(feedbackMarkdown(feedback));
      setMessage("Feedback copied. Paste it into your message when ready.");
    } catch {
      setMessage("Clipboard unavailable. Use Download feedback instead.");
    }
  }
  return (
    <main className="nxclip-production xp-root uat-workspace"><SEO title="Ad Studio UAT checklist | NxClip"/>
      <header className="uat-header">
        <Link to="/create/ad" className="uat-back">
          <ArrowLeft size={14} />
          Ad Studio
        </Link>
        <span className="uat-kicker">
          <ClipboardList size={14} />
          OWNER ACCEPTANCE
        </span>
        <h1>Your Ad Studio UAT workspace.</h1>
        <p>
          Run a check, record what happened, and share feedback by its stable
          UAT number. All 40 roadmap screens and 8 workflow/safety checks are
          included. Nothing is pre-approved.
        </p>
        <div className="uat-actions">
          <Button variant="outline" onClick={() => void copy()}>
            <Copy size={14} />
            Copy feedback
          </Button>
          <Button
            onClick={() =>
              downloadJson(
                "nxclip-ad-studio-uat.json",
                JSON.stringify(feedbackReport(feedback), null, 2),
              )
            }
          >
            <Download size={14} />
            Download feedback
          </Button>
        </div>
      </header>
      <section className="uat-summary" aria-label="Your UAT results">
        {OUTCOMES.map((outcome) => (
          <button
            key={outcome}
            onClick={() => setFilter(outcome)}
            className={`uat-count uat-${outcome}`}
            aria-pressed={filter === outcome}
          >
            <strong>{counts[outcome]}</strong>
            <span>{labels[outcome]}</span>
          </button>
        ))}
      </section>
      <section className="uat-guide">
        <h2>How to review</h2>
        <ol>
          <li>
            Use your own test project. Start with Brand Kit, then campaign,
            concepts, Canvas and export.
          </li>
          <li>
            Choose Pass, Issue or Blocked for each check. Record the actual
            result, requested fix and any enhancement separately.
          </li>
          <li>
            Google image/video actions are yours to initiate only after runtime
            readiness is confirmed. This page never starts generation, changes
            flags or modifies projects.
          </li>
          <li>
            Download feedback or copy it into your reply. Add screenshot
            filenames under Evidence. Your notes stay in this browser; they are
            not sent to a server.
          </li>
        </ol>
        <p>
          Partial source integration is not runtime or owner acceptance. Roadmap
          gaps are included so you can record priorities, not mistaken for
          completed functionality.
        </p>
      </section>
      <details className="uat-context">
        <summary>
          Optional: link checks to your test project and Brand Kit
        </summary>
        <p>
          Copy IDs from their page URLs. These fields only build navigation
          links; they do not select or modify records.
        </p>
        <div>
          {(
            [
              ["projectId", "Project ID"],
              ["brandId", "Brand Kit ID"],
              ["creativeId", "Creative ID"],
            ] as const
          ).map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={context[key]}
                onChange={(event) =>
                  setContext((current) => ({
                    ...current,
                    [key]: event.target.value.slice(0, 128),
                  }))
                }
              />
            </label>
          ))}
        </div>
      </details>
      {(message || storageError) && (
        <p role="status" className="uat-notice">
          {storageError || message}
        </p>
      )}
      <div className="uat-filters">
        <label className="uat-search">
          <Search size={15} />
          <input
            aria-label="Search UAT checks"
            placeholder="Search by UAT number, screen or flow…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Area
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="all">All areas</option>
            {groups.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Result
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All results</option>
            {OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="uat-visible">
        Showing {visible.length} of {UAT_CHECKS.length} checks · 40-screen
        register preserved
      </p>
      <section className="uat-checks" aria-label="Acceptance checklist">
        {visible.map((check) => {
          const row = feedback[check.id] || emptyFeedback(),
            url = checkUrl(check, context);
          return (
            <details key={check.id} className={`uat-check uat-${row.outcome}`}>
              <summary>
                <span className="uat-check-id">{check.id}</span>
                <span className="uat-check-title">
                  {check.title}
                  <small>
                    {check.group} · {check.screen} ·{" "}
                    {check.parity === "not-integrated"
                      ? "M2B parity gap"
                      : check.paid
                        ? "Live AI gate"
                        : "Owner review needed"}
                  </small>
                </span>
                <span className="uat-result">{labels[row.outcome]}</span>
              </summary>
              <div className="uat-check-body">
                <div className="uat-check-instructions">
                  <div>
                    <h3>Steps</h3>
                    <p>{check.steps}</p>
                  </div>
                  <div>
                    <h3>Expected result</h3>
                    <p>{check.expected}</p>
                  </div>
                </div>
                <details className="uat-evidence">
                  <summary>Implementation evidence & limitations</summary>
                  <p>{check.implementation}</p>
                  <p>
                    M2B parity: {check.parity}. No runtime or owner PASS is
                    inferred.
                  </p>
                  {check.paid && (
                    <p>
                      May require a Google provider request. Owner-only live
                      testing; no calls are made by this checklist.
                    </p>
                  )}
                </details>
                <div className="uat-check-controls">
                  <label>
                    My result
                    <select
                      aria-label={`${check.id} result`}
                      value={row.outcome}
                      onChange={(event) =>
                        update(check.id, {
                          outcome: event.target.value as Outcome,
                        })
                      }
                    >
                      {OUTCOMES.map((value) => (
                        <option key={value} value={value}>
                          {labels[value]}
                        </option>
                      ))}
                    </select>
                  </label>
                  {url ? (
                    <Link to={url} target="_blank" rel="noopener noreferrer">
                      Open workflow
                      <ExternalLink size={13} />
                    </Link>
                  ) : (
                    <span>
                      Use an existing record or record this capability as
                      blocked.
                    </span>
                  )}
                </div>
                <div className="uat-feedback-grid">
                  {(
                    [
                      ["evidence", "Actual result / screenshot filename"],
                      ["issue", "Issue observed"],
                      ["enhancement", "Enhancement requested"],
                      ["fix", "Expected fix / acceptance condition"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <textarea
                        aria-label={`${check.id} ${label}`}
                        rows={3}
                        maxLength={4000}
                        value={row[key]}
                        placeholder={
                          key === "evidence"
                            ? "What happened? Include the screen and screenshot filename."
                            : "Add your feedback…"
                        }
                        onChange={(event) =>
                          update(check.id, { [key]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
        {!visible.length && (
          <p>
            No checks match these filters. Choose All results or clear the
            search.
          </p>
        )}
      </section>
      <footer className="uat-footer">
        Keep a downloaded copy before clearing browser data. This is an owner
        feedback workspace, not a declaration that Ad Studio or the Golden Ad
        has passed UAT.
      </footer>
    </main>
  );
}
