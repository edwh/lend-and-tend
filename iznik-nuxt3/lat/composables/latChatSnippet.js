/**
 * The API writes a fixed snippet for system chat messages (a promise, a
 * withdrawn promise, an outcome) in Freegle's item-giving words: "Item
 * promised" and so on. On Lend & Tend a promise is a garden-sharing
 * agreement, so the chat list says that instead. Anything else (a member's
 * own text) passes through untouched.
 */
export const LAT_SNIPPETS = Object.freeze({
  'Item promised': 'Agreement sent',
  'Promise cancelled': 'Agreement withdrawn',
  'Item is no longer available': 'Garden no longer available',
  'No longer looking for this': 'No longer looking',
  Image: 'Photo',
})

export function latChatSnippet(snippet) {
  if (typeof snippet !== 'string') return snippet
  return Object.prototype.hasOwnProperty.call(LAT_SNIPPETS, snippet)
    ? LAT_SNIPPETS[snippet]
    : snippet
}
