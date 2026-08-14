"use client";

const AUTH_COMPLETE_MESSAGE = "happyseeds:auth-complete";

export function openHappySeedsLogin(onComplete: () => void, next = "/"): Window | null {
  const width = 500;
  const height = 650;
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  const popup = window.open(
    `/api/auth/login?next=${encodeURIComponent(next)}`,
    `happyseeds_auth_${crypto.randomUUID()}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
  if (!popup) return null;

  function receiveCompletion(event: MessageEvent): void {
    if (event.origin !== window.location.origin || event.source !== popup || event.data?.type !== AUTH_COMPLETE_MESSAGE) return;
    window.clearInterval(closedCheck);
    window.removeEventListener("message", receiveCompletion);
    onComplete();
  }
  window.addEventListener("message", receiveCompletion);
  const closedCheck = window.setInterval(() => {
    if (!popup.closed) return;
    window.clearInterval(closedCheck);
    window.removeEventListener("message", receiveCompletion);
  }, 500);
  return popup;
}
