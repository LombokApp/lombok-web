# Object keys, `/`, and `%2F` handling

This document describes how Lombok handles S3 object keys that contain a real
`/` (legitimate nesting) versus keys whose bytes literally contain the sequence
`%2F`, across the URL/route layer, the presign layer, uploads, and reads.

## Background: why `%2F` is special

S3 object keys are opaque UTF-8 byte strings. Two keys must remain distinct and
both usable:

- `a/b` — a real slash (nested key).
- `a%2Fb` — a key whose bytes are literally `a`, `%`, `2`, `F`, `b`.

The problem: when an object key is placed into a **presigned URL path**, a bare
`%2F` is interpreted **inconsistently across S3-compatible providers**. By the
URL/S3 spec a path is URL-decoded to obtain the key, so `…/a%2Fb` decodes to the
key `a/b` — colliding with the real-slash key. Some providers preserve `%2F`,
some collapse it to `/`. A real `/` is unambiguous and works everywhere.

The policy that follows from this:

- A real `/` is always left literal — it is a path separator everywhere
  (signed paths, routes, storage). Never touched.
- `%2F` is only ever a concern at the two boundaries where we **create** keys:
  PUT presigns and folder prefixes. There we sanitize it. Keys read back from S3
  (GET/HEAD/DELETE/reindex) are known-valid and pass through literally.

## The single load-bearing encoder

`encodeObjectKeyPreservingSlashes(key)` (in `packages/utils/src/s3.util.ts`):

```ts
encodeURIComponent(key).replace(/%2F/g, '/')
```

It percent-encodes every byte **except** real `/`. This is used in two places:

1. **Signed S3 paths** (`packages/api/src/storage/s3.utils.ts`). The encoded key
   is placed into the path handed to `aws4.sign`, which is also the literal wire
   URL. Encoding is mandatory: an un-encoded `?`, space, `#`, `%`, etc. would
   make the URL malformed and break the SigV4 signature. Slashes are kept literal
   because in SigV4-for-S3 the key's `/` are path separators in the canonical
   URI (single-encoded, slashes not encoded) — every provider agrees on that,
   whereas encoding `/`→`%2F` re-enters the inconsistent-`%2F` zone.

   The key consequence: a literal-`%2F` key is double-encoded to `%252F` in the
   path, so S3 decodes it once back to the verbatim `a%2Fb` key — distinct from a
   real-slash `a/b` whose path stays `a/b`.

2. **Frontend route links** (folder detail grid/table, event/task detail,
   search palette). The object-detail route uses the same encoder so a key with
   `?`/`#`/`%2F` produces a well-formed path segment.

The previous helper `encodeS3ObjectKey` was removed; all call sites now use
`encodeObjectKeyPreservingSlashes`.

## Read path (reading keys back)

Keys read from S3 are known-valid there, so they pass through literally:

- **Controller single-decode.** `@Param('objectKey')` is already URL-decoded
  once by Express. The earlier double-`decodeURIComponent` in
  `folders.controller.ts` was removed (it collapsed `a%2Fb` into `a/b`).
- **`recoverObjectKey`** (`packages/ui/src/pages/folders/object-key-url.ts`,
  extracted from `folder-root.tsx` so it is React-free and unit-testable)
  recovers the key from the raw, still-encoded `pathname` with exactly one
  decode — react-router's splat param decodes twice and would lose the
  `a/b` vs `a%2Fb` distinction.
- **GET/HEAD presign, DELETE, reindex, refresh** all use the key verbatim.

## Write path (`%2F` sanitization)

There are two independent boundaries where keys are created:

### 1. Upload filenames (frontend, leaf only)

`sanitizeUploadFilename(name)` replaces both real `/` and `%2F` (case-insensitive)
with `_`. Applied at the `uploadFile` chokepoint in
`local-file-cache.provider.tsx`, so the worker only ever receives a clean leaf
key. The upload modal (`upload-modal.tsx`) displays and tracks progress under the
sanitized name so a renamed file shows a single, consistent row.

### 2. PUT presign (backend, `%2F` only)

`POST /api/v1/folders/{folderId}/presigned-urls`:

- The request item is a **discriminated union on `method`**. Only the `PUT`
  variant carries `dontReplaceEncodedForwardSlashes?: boolean` — the flag is
  meaningless for GET/HEAD/DELETE and therefore absent there.
- **PUT, default** (`replaceEncodedForwardSlashes`): `%2F`→`_` in the objectKey
  before prefix-join/sign.
- **PUT, `dontReplaceEncodedForwardSlashes: true`**: presign the literal key
  unchanged — used to overwrite a pre-existing `%2F` object, accepting the
  provider-dependent behavior.
- **GET/HEAD**: literal passthrough, no flag, no replacement.
- **DELETE** (`deleteFolderObjectAsUser`, server-side SDK call): literal,
  unchanged. Real `/` is never touched by any path.

The presign **response now returns the resolved key per URL**:
`{ url, objectKey }[]` instead of `string[]`. For PUT this reflects any
replacement; for GET/HEAD it equals the input. The upload worker (`worker.ts`)
uses the resolved key for the subsequent `refresh` call and for progress
display, rather than the original file name.

### Folder prefixes

Folder create rejects any content/metadata location `prefix` containing `%2F`
(via `hasEncodedForwardSlash`) with a `400`. Folder update only changes the name,
so it has no prefix to guard.

## Pre-existing `%2F` objects stay usable

Objects whose keys literally contain `%2F` (e.g. ingested by reindex from an
external tool) remain fully usable: read/delete/refresh go through the SDK or a
literal-passthrough presign, both of which address the verbatim key thanks to the
slash-preserving encoder (`a%2Fb` → `%252F` in the path → S3 → `a%2Fb`).

## New shared utilities (`packages/utils/src/s3.util.ts`)

| Function | Behavior |
| --- | --- |
| `encodeObjectKeyPreservingSlashes(v)` | `encodeURIComponent`, then restore real `/`. URL/path encoding. |
| `replaceEncodedForwardSlashes(v)` | `%2F` (ci) → `_`. PUT presign sanitization. |
| `sanitizeUploadFilename(name)` | `/` and `%2F` (ci) → `_`. Upload filename (leaf). Idempotent. |
| `hasEncodedForwardSlash(v)` | `/%2f/i.test(v)`. Folder-prefix guard. |

## Tests

- **Unit (`bun:test`)**
  - `packages/utils/src/s3.util.test.ts` — the four helpers, including idempotence
    and the `a%2Fb`→`a%252Fb` vs `a/b`→`a/b` distinction.
  - `packages/ui/src/pages/folders/object-key-url.test.ts` — `recoverObjectKey`
    real-slash recovery, `a%252Fb`→`a%2Fb`, non-object routes, malformed-percent
    no-throw, and an inverse-pair round-trip with `encodeObjectKeyPreservingSlashes`.
- **API e2e (`folder-objects.e2e-spec.ts`)** — PUT default replace; PUT keep-literal
  round-trip; GET/HEAD literal passthrough; real-`/` untouched; folder-prefix
  reject (`400`); pre-existing `%2F` get/refresh/delete; clean keys land verbatim
  in S3 + DB and round-trip distinct content. `test.util.ts` now exposes
  `folderService` and `s3Service` so the bucket can be listed for verification.
- **UI e2e (`folder-object-upload-sanitize.ui-e2e-spec.ts`)** — uploads a `%2F`
  (and lowercase `%2f`) filename via `setInputFiles` and asserts it is listed under
  the sanitized `a_b.txt` and that its detail page loads. A literal `/` in a
  filename cannot be exercised through a file input (the browser strips the path
  component), so that case is covered by the unit tests. The listing assertion
  re-fetches until the post-upload `refresh` has registered the object, to avoid
  racing the worker's refresh call.

## Files of note

- Encoder / sanitizers: `packages/utils/src/s3.util.ts`
- Signed paths: `packages/api/src/storage/s3.utils.ts`
- Presign service + resolved-key response: `packages/api/src/folders/services/folder.service.ts`,
  `dto/folder-create-signed-url-input.dto.ts`, `dto/responses/folder-create-signed-urls-response.dto.ts`
- Prefix guard: `packages/api/src/storage/dto/storage-location-input.dto.ts`
- Controller single-decode: `packages/api/src/folders/controllers/folders.controller.ts`
- Read-path key recovery: `packages/ui/src/pages/folders/object-key-url.ts`
- Upload chokepoint + worker + modal: `packages/ui/src/contexts/local-file-cache/local-file-cache.provider.tsx`,
  `packages/ui/src/worker.ts`, `packages/ui/src/components/upload-modal/upload-modal.tsx`
- Route-link encoders: folder grid/table, `event-detail-ui`, `task-detail-ui`, `search-command-palette`
