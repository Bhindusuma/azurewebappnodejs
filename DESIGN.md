# Design notes — Kiln

**Subject.** A course platform for working adults learning technical craft in short
sittings. Its primary job is not persuasion; it is getting someone back into the
lesson they abandoned four days ago. So the signed-in home page is a resume screen,
not a marketing hero.

**Signature element.** The progress spine. A course is drawn as a segmented rule —
one segment per lesson — filled as lessons complete. It runs vertically beside the
lesson outline and horizontally on dashboard cards, so the same shape means the same
thing everywhere. It shows *which* lessons are done, which a percentage bar cannot.
Everything else on the page stays quiet so this reads.

**Colour.** Cool slate paper (#EBEEF2) rather than warm cream, ink at #141A24, and a
single accent of deep pine (#17594A) doing double duty for both links and completion,
because in a learning product "progress" and "action" are the same idea. One ember dot
(#B4451F) marks the current lesson and appears nowhere else — a firing marker, sized
6px, not a palette.

**Type.** Newsreader for course titles and lesson prose: lessons are reading, and a
serif at a 68-character measure is the right tool. Public Sans for navigation, buttons
and labels, so interface chrome is visibly a different register from content.

**Rejected.** Warm cream plus terracotta accent (the current generated-page default);
identical rounded cards with a soft grey shadow for every content type; a percentage
progress bar, which hides the structure the spine exposes.
