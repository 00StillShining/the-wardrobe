import type { EmailAdapter } from './EmailAdapter'

/**
 * GmailAdapter — real-integration stub. Gmail access needs OAuth plus a
 * server-side token exchange, so it must not run from this static client. The
 * TODOs below outline the real flow behind the same EmailAdapter interface.
 */
export function createGmailAdapter(): EmailAdapter {
  // TODO(auth): OAuth 2.0 PKCE flow →
  //   1. redirect to accounts.google.com with scope
  //      https://www.googleapis.com/auth/gmail.readonly
  //   2. exchange the code for an access + refresh token (server-side; the
  //      client secret must never ship in the bundle)
  //   3. store the refresh token behind the StorageAdapter; refresh on 401.
  // TODO(query): users.messages.list with q=
  //   'from:(receipts OR orders OR order) newer_than:1y has:attachment OR subject:(order OR receipt)'
  // TODO(fetch): users.messages.get(format=full) → walk the MIME tree for the
  //   text/html part; decode base64url into RawReceipt.html.
  // TODO(images): product <img> srcs are remote URLs — fetch through a CORS
  //   proxy (or server) before handing the blob to the ImageAdapter.
  const notImplemented = (): never => {
    throw new Error('GmailAdapter is a stub — real OAuth is out of scope for v1 (spec §11).')
  }
  return {
    listReceipts: notImplemented,
    getReceipt: notImplemented,
  }
}
