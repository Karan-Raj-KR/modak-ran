# Game design — Mushak's Modak Run

**Map:** `courtyard-v1`, a fixed visible grid of three horizontal paths and four vertical paths. Its enclosed garden islands create several route loops: shorter nearby pickups versus farther full-path runs. There are 42 reachable modaks, placed deterministically outside the delivery zone.

**Rules:** `rules-v1`. A preparation round starts on Play and lasts 60 seconds. Mushak carries at most six modaks; a modak can be collected once. Entering the pandal unloads the basket exactly once, adding one point per modak. The round ends at time-out or when every modak has been delivered. Undelivered modaks are simply saved for next time.

**Scoring:** local personal best is higher delivered count; when all modaks are delivered, a faster completion breaks a tie. Storage failure leaves the current session playable.

**Presentation:** deep indigo, marigold, terracotta and cream; code-drawn courtyard paths, gardens, rangoli, lamps, modaks and a gentle Mushak silhouette. The pandal is decorative and contains no deity depiction.

**Deferred:** swipe input, online/verified leaderboard, competitive timing authority, analytics, multiple maps, skins, sharing, deployment and demo recording. The optional sound toggle creates short original synthesized pickup/delivery tones only after a user enables it. Competitive timing needs a future authoritative design; this prototype pauses hidden tabs and requires click/tap to resume.
