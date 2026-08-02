"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import {
  buildAndroidInviteIntent,
  buildInviteHttpsUrl,
  copyInviteCode,
  type ParsedInviteCode,
} from "../../../lib/invite-code";

function copyWithSelectionFallback(value: string): boolean {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

export default function JoinActions({ code }: { code: ParsedInviteCode }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const inviteUrl = buildInviteHttpsUrl(code);

  const handleCopy = async () => {
    const copied = await copyInviteCode(
      code.visible,
      navigator.clipboard,
      copyWithSelectionFallback,
    );
    setCopyStatus(copied ? "copied" : "failed");
  };

  const handleOpen = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!/Android/i.test(navigator.userAgent)) return;
    event.preventDefault();
    window.location.href = buildAndroidInviteIntent(code);
  };

  return (
    <div className="join-actions">
      <div className="join-code-row">
        <code aria-label={`Invitation code ${code.visible}`}>{code.visible}</code>
        <button type="button" onClick={handleCopy}>Copy code</button>
      </div>
      <p className="join-copy-status" aria-live="polite">
        {copyStatus === "copied" && "Copied"}
        {copyStatus === "failed" && "Copy failed. Select the code and copy it manually."}
      </p>
      <a className="join-primary-action" href={inviteUrl} onClick={handleOpen}>
        Open Gubify <span aria-hidden="true">→</span>
      </a>
      <p className="join-action-note">
        If the app does not open, keep this code and use it after Gubify becomes available.
      </p>
      <Link className="join-secondary-action" href="/pre-register">
        Get notified when Gubify is available
      </Link>
    </div>
  );
}
