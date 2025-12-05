
// Deprecated: previously used to mint tokens via refresh token.
// Keep a stub to avoid breaking imports; prefer Firebase client SDK on the frontend
// to obtain an ID token and send it as Authorization: Bearer <idToken>.

export async function getIdToken() {
  throw new Error('getIdToken() is deprecated. Use Firebase client SDK to sign in and send Authorization: Bearer <idToken> from the frontend.');
}
