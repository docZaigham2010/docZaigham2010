// The website and Studio OS share one browser "inbox".
// The public site drops enquiries here; Studio OS collects them into its pipeline.
export const INBOX_KEY = 'aman-inbox-v2';

export function readInbox() {
  try {
    const raw = localStorage.getItem(INBOX_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function pushToInbox(enquiry) {
  const list = readInbox();
  const item = { ...enquiry, id: crypto.randomUUID(), receivedAt: new Date().toISOString() };
  list.push(item);
  localStorage.setItem(INBOX_KEY, JSON.stringify(list));
  return item;
}

export function drainInbox() {
  const list = readInbox();
  localStorage.removeItem(INBOX_KEY);
  return list;
}
