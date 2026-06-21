# 04 — ML Features

Two ML capabilities, both with a guaranteed manual fallback:

1. **Face recognition** — fast player/dealer check-in (and optional host unlock).
2. **Chip / tip counting** — read chip values from a photo.

Golden rule: **ML pre-fills, the human confirms.** Nothing ML produces is saved
without a confirm step, and every flow works fully without ML.

---

## 1. Face recognition (client-side, face-api.js)

### Library & models
- `@vladmandic/face-api` (maintained face-api.js fork, TensorFlow.js). Models
  used: `tinyFaceDetector` (detection), `faceLandmark68Net` (alignment),
  `faceRecognitionNet` (128-d descriptor).
- Weights load at runtime from a CDN (`cdn.jsdelivr.net/npm/@vladmandic/face-api/model`)
  via `client/src/lib/face.ts` — no large binaries bundled; browser caches them.
  (Switch `MODEL_URL` to a self-hosted `/models` path if offline use is needed.)

### Enrollment (player/dealer creation)
1. Capture/select a clear, front-facing photo.
2. Detect the single largest face; require exactly one face with good size/quality
   (reject if none/multiple/too small — prompt to retake).
3. Compute the 128-d descriptor.
4. Store: POST the photo to the upload endpoint (creates a `photos` row, returns
   its id → `players.photo_id`/`dealers.photo_id`); save the descriptor to the
   row's `face_descriptor` (`Float[]`). Descriptors are sent as JSON to the API.

### Matching (check-in)
1. Load all of the host's player (or dealer) descriptors (cache in memory per
   session; small N).
2. Capture from camera, detect + compute descriptor.
3. Compute **Euclidean distance** to each enrolled descriptor.
4. Pick the smallest distance. If `distance ≤ THRESHOLD` (start at **0.5**, tune),
   surface as top candidate; also show next 1–2 closest for safety.
5. User taps to confirm → creates the session. If nothing under threshold, fall to
   manual name search and offer "create new player".

### Tuning & robustness
- Make `THRESHOLD` a config constant; calibrate on real photos.
- Handle camera permission denial gracefully → manual path.
- Lighting varies at game venues: allow re-enrolling a better photo; consider
  storing more than one descriptor per person later (array of descriptors) if
  match quality is poor.
- Performance: `tiny_face_detector` is fast enough for mobile; downscale frames.

### Host face-unlock (optional, secondary)
- Enroll the host's face in `users.face_descriptor`.
- "Log in with Face" matches it, then reuses the device's stored JWT.
- This is a convenience only; it does **not** replace password auth, and does not
  mint a token from scratch (password established the JWT originally).

### Privacy
- Face descriptors and photos are personal data. Get verbal consent before
  photographing players. Deleting a player/dealer must delete photo + descriptor.

---

## 2. Chip / tip counting (Express endpoint + vision LLM)

### Why server-side
Needs a capable vision model and a secret API key. Runs in the Express API
(`POST /api/chips/count`) using `VISION_API_KEY` from server env, so the key never
reaches the client.

### Reference photos ("lock in")
When a table is created, the host photographs each chip color and assigns its
value (`chip_denominations` rows; reference image → a `photos` row referenced by
`ref_photo_id`). These references are passed to the model so it can identify colors
specific to this table's chip set.

### `POST /api/chips/count`

**Input (JSON):**
```jsonc
{
  "tableId": "uuid",
  "photoId": "uuid",          // count photo, uploaded to /api/photos first
  "denominations": [
    { "color": "red",   "value": 5,  "refPhotoId": "uuid" },
    { "color": "green", "value": 25, "refPhotoId": "uuid" }
  ]
}
```

**Process:**
1. Load the count photo + each reference photo's bytes from the `photos` table.
2. Prompt a vision LLM: "Here are reference images of each chip color and its
   value. Count how many chips of each color appear in the count image. Return
   strict JSON." Provide the reference set + the count image.
3. Parse the model's JSON; compute `value × count` per color and a grand total.

**Output (JSON):**
```jsonc
{
  "perColor": [
    { "color": "red",   "count": 12, "value": 5,  "subtotal": 60 },
    { "color": "green", "count": 4,  "value": 25, "subtotal": 100 }
  ],
  "total": 160,
  "confidence": "low|medium|high"   // advisory only
}
```

**Client UX:** results populate the `ChipCountEditor`; the user reviews/edits each
color count on a number pad, sees the recomputed total, and confirms. The
confirmed total is saved to `player_sessions.chips_out` with `chip_method='photo'`.

### Counting accuracy
- Counting stacked chips from one photo is hard. Treat output as a **draft**.
- Encourage spreading chips / a top-down photo; allow multiple photos summed
  (count each photo, add).
- Always editable. If the host doesn't trust it, manual entry is one tap away.
- Consider a future **YOLO** model fine-tuned on chip images for speed/cost/offline
  — same input/output contract, swap the endpoint internals. Start with the vision
  LLM because it needs no training data and uses the reference photos directly.

### Tip counting (dealer check-out)
**Tips are chips (confirmed)**, so dealer tip counting reuses `POST /api/chips/count`
directly — point the camera at the dealer's tip stack, same per-color review and
confirm. No separate cash-counting path needed.

### Photo retention
Chip-count photos are uploaded to the `photos` table to run the count. Retention is
**ask-each-time**: when the host settles a game, prompt whether to keep that
game's chip-count photos; store the answer in `games.retain_photos`. If declined,
delete the game's chip-count `photos` rows at settlement. Profile photos are always
kept (they're reused for face recognition).

---

## Failure & fallback matrix

| Feature        | If ML fails / unavailable                          |
|----------------|----------------------------------------------------|
| Face check-in  | Manual name search; "create player" inline         |
| Host unlock    | Password login                                     |
| Chip count     | Manual per-color counts or a single total          |
| Tip count      | Manual amount                                       |

Never block the host's workflow on ML.
