# Dealbreaker demo: walkthrough, findings and questions

*Updated 2026-11-08 (update 2): bugs 1, 2, 4–9 and 11 are fixed, 10 partly; 3 (public photos) waits on an AWS change. New: card descriptions, overview bars, ranked people list, Compare People, ended status. Section 1 has the phone test.*

Written 2026-11-08. The demo data lives in your account (jace.galloway@gmail.com) on the production database.

## 1. How to see it on your phone

1. Force-close and reopen the app twice (the first launch downloads the update, the second applies it).
2. If the board isn't the demo, tap **Logout**, force-close, reopen and sign in.

Since update 2 (below) the app doesn't save the board until it has loaded the server's copy, so a phone's old saved board can no longer overwrite the server. Before that, launching could do exactly that, which is why the first version of these steps said to log out first. If the demo ever gets wiped, `node scripts/demo-seed/seed-demo.js` in the backend writes it again (section 8).

### Phone test for update 2 (published 2026-11-08, update group 8e770ce5)

1. **Sam:** tap the red count in the bar above the board, and the board should show only red cards. Drag a card: it goes back, with "Clear the filter to move cards". Tap the count again to clear.
2. **Sam:** tap the chevron in the bar. "Disrespects boundaries" has a red "!"; tap it for the explanation.
3. **Main:** open the people bar ("3 dating · 2 ended"), tap a person to open their board, come back, tap **Compare**.
4. **Compare:** five people at most; toggle names; "Show all 36 cards".
5. **Any card:** edit its description (✏️) and check it under the title on the card and in its history (📋).
6. **Profile switcher and Edit Profile:** Riley and Jordan sit at the bottom with "(ended)"; Mark as Ended / Mark as Active works.

## 2. How I think the app is meant to be used

- **Main Profile is your rulebook.** It holds your list of things to watch for. The **Flags** column has warning signs. The **Dealbreakers** column has your non-negotiables.
- **Every other profile is one person.** It carries a copy of every card on your list. On a person's profile, a card's color is how that person scores on that point: white = not seen or fine, yellow = noticed, red = serious. Moving a card into their Dealbreakers column means they hit one of your dealbreakers.
- **Every change asks you why.** Picking a flag color (tap the flag, choose one) or dragging a card between columns opens a "why" box with text and photos. Each card has its own timeline per person (the 📋 button), and **Add Context** adds a note without changing anything.
- **Your rules flag things for you.** If a card is a dealbreaker on Main and you turn it red on a person, the app shows "Dealbreaker Alert!"
- **New cards go everywhere.** Cards are created on Main (the Create Flag tab only shows there) and appear on every person's board.

On Main I used colors to mean "how much this matters to me in general", and its history records lessons learned. This is my biggest open question (see section 7).

## 3. The demo, profile by profile

There are 36 cards on Main (28 flags and 8 dealbreakers), 6 profiles and 80 history entries. 12 entries carry a fake screenshot, plus one voice memo and one video. The history was written to follow the old tap order (white → yellow → red → white), and a self-check in the seed script enforces that. You can now pick any color directly.

| Profile | Story | What to look at |
|---|---|---|
| **Main Profile** | Rulebook set up on Jan 4 and updated after each relationship. | **Small lies** (now red): the Apr 21 entry after Riley has a "What Riley taught me" note. **Different stance on kids**: a flag moved to Dealbreakers on Aug 30 after Jordan. **Different politics**: white → yellow → red → white, de-escalated after Avery. **Disrespects boundaries**: a context note with a "My boundaries" screenshot. |
| **Avery** (dating since Sep 13) | Going well. No red, three yellows, lots of notes. | **Slow to text back**: the yellow, then the apology screenshot. **Never asks about me**: concert ticket image plus a video. **Different stance on kids**: a good-news note on a Main dealbreaker. |
| **Sam** (dating since Aug 10) | Three reds, and on the brink. | **Disrespects boundaries** is yellow, it's a dealbreaker on Main, and it has screenshots of the missed calls and the office visit. Pick **Red** on it to see the Dealbreaker Alert move it to Sam's Dealbreakers column, then try **Undo**. **Goes silent after fights** has a voice memo. **Asks who I'm texting** was added to Main during Sam (the app only creates cards on Main), so it appears on everyone. |
| **Casey** (new, Nov 1) | Two yellows and one good note. | A fresh profile. |
| **Riley** (ended) | Ended over a dealbreaker: back on the dating apps while exclusive. | **Small lies** escalates over two screenshots. **Still on dating apps** goes yellow → red (a friend's screenshot) → moved to Dealbreakers. |
| **Jordan** (ended) | Ended by mutual decision: Jordan doesn't want kids. | **Different stance on kids** shows every transition type: yellow → moved to Dealbreakers → moved back to Flags ("they said they're open to it") → yellow → red → Dealbreakers. **Cancels last minute** has a "raincheck" screenshot. |

## 4. What the app can do, and when it helps

| Feature | Where | Useful for |
|---|---|---|
| Master list of flags and dealbreakers | Main Profile, Create Flag tab | Deciding your standards while calm, before you're attached |
| One profile per person | Create Profile, Switch Profile, ✏️ rename | Dating several people at once, and keeping exes for reference |
| 3-level flag per person, pick a color | Flag icon on a card | Saying "I noticed this" without overreacting |
| Drag between Flags and Dealbreakers | Board | Deciding something is a dealbreaker with this person, or taking that back |
| A required reason plus photos for every change | The "why" box | Remembering what actually happened, not how you later feel about it |
| Timeline per card per person, with Add Context | 📋 on a card | Seeing a pattern build up: "third time this month" |
| Dealbreaker Alert | Red on a Main dealbreaker | Being stopped from explaining away a known dealbreaker (fixed: it now moves the card, and Undo works) |
| Edit and delete cards (delete only on Main) | ✏️ and 🗑️ | Refining your list over time |
| Overview bar on each person: counts, tap a count to filter, "!" for Main dealbreakers | Above a person's board | Finding what matters on a long board |
| Ranked people list and Compare People | Above Main's board | Seeing who worries you most; comparing people card by card |
| Ended status | Edit Profile (✏️) | Keeping past relationships as a record without cluttering the list |
| Card descriptions | Card, history header | Remembering what a flag means to you |
| Guest mode (5 cards, 1 extra profile) | Login | Trying the app before signing up |
| Account: name, password, Google and Apple connect/disconnect, delete account | User Info tab | Normal account management |

Scenarios it fits: someone dating actively who wants to compare matches against one standard; someone just out of a relationship who wants to write down what to watch for next time (the Main history becomes a "lessons" log); someone in a relationship who wants an honest record of recurring problems (Sam's profile). Hypothesis I didn't demo: friends or a therapist using it to help someone track a relationship. Nothing in the code supports sharing, so I left that out.

## 5. Bugs found (none of them blocked the demo)

Ordered by impact. Everything is from reading the code. I didn't run the app, so the items marked "likely" are reasoned from the code and not observed.

1. **Fixed 2026-11-08 (update a885e32b):** **The Dealbreaker Alert didn't do what it says.** It says the card "has been automatically moved to your dealbreaker list", but nothing moves it. The card name is blank, and **Undo** does nothing, because `transitionedItem` is never set anywhere. See `useTransitions.tsx` (`checkForDealbreakerTransition`) and `BoardManagementModals`.
2. **Fixed 2026-11-08 (backend 6f9855b):** **Security: board and upload routes had no login check.** `POST /api/dealbreaker/get-dealbreakers` and `/add-dealbreaker` read or replace anyone's whole board if you know their user ID. `/api/upload/*` takes uploads from anyone, and `/upload/custom` writes to **any S3 bucket name** the caller passes, using what the old notes say is a root AWS key.
3. **Privacy: all attachments are public.** Anyone with a URL can open a photo in the S3 bucket. In an app full of screenshots of private texts, that's a real risk.
4. **Fixed 2026-11-08 (app c0f808a):** the board isn't saved until the server's copy has loaded. **Likely data loss at app launch.** The app uploads the phone's saved board about 1 second after launch, possibly before it downloads the server's copy. Whichever request reaches the server first wins. A phone that was offline, or a second phone, can wipe newer data. This is why section 1 says to log out first.
5. **Fixed 2026-11-08 (update a885e32b):** tapping now offers the two other colors. **You couldn't go from yellow back to white without passing red.** The tap order is white → yellow → red → white. Calming a yellow down writes a fake "red" entry into the history, and on a Main dealbreaker it also triggers the alert.
6. **Fixed 2026-11-08 (update a885e32b):** **"Add Context" notes showed as "Flag changed: 🟨 → 🟨".** The timeline checks `item.type === 'add-reason'`, which nothing ever sets.
7. **Fixed 2026-11-08 (app c0f808a):** **Offline history never synced.** Every launch sets `offlineMode = 'true'`, and the sync skips whenever offline mode is on, so queued entries stay on the phone forever. Offline entries also drop their attachments.
8. **Fixed 2026-11-08 (app c0f808a):** **Logout left the old profile list in memory.** After logging out and back in without closing the app, old profiles can reappear. Opening one recreates it on the server.
9. **Fixed 2026-11-08 (app c0f808a):** **Editing or deleting a card missed some profiles.** Both only touch the column the card is in on the current profile. Where a person has the card in the other column, the old title stays, and after a delete the card is orphaned.
10. **Partly fixed (app c0f808a, b356872): videos and audio now upload; a file over 10 MB is left off with a message.** Playback still needs a native video/audio package and a new build. **Only photos were uploaded.** Videos and audio keep a local `file://` path, so they break on any other device. Videos show "VIDEO / preview not available", and audio playback is switched off (expo-av was removed in SDK 55+).
11. **Fixed 2026-11-08 (backend cb8fd7e, app c0f808a):** **Deleting a profile left its history on the server.**
12. **Removed 2026-11-08 (app bd6261a):** **Latent:** `synchronizeProfileFlags` never runs on current data (it uses a stale copy of state). If someone fixes that, it will duplicate every dealbreaker into both columns. `cleanupDuplicates` computes a fix and throws it away.

## 6. Missing or unfinished

- ~~No "ended" status~~ Added 2026-11-08: Edit Profile → **Mark as Ended**. Ended people sort last in Switch Profile and show "(ended)".
- **The card description is never shown,** not on the card and not in the timeline. You only see it in Edit.
- No green flags (backend allows `green`). Jace: not needed for now.
- ~~No overview~~ Added 2026-11-08: a count bar on each person (tap a count to filter the board, "!" marks Main dealbreakers), a ranked people list on Main, and Compare People.
- **No onboarding or starter cards.** A new user faces an empty board.
- ~~Dead code~~ Removed 2026-11-08 (app bd6261a, backend 7dde0ed). Still to do with the next native build: unused packages (`@react-native-picker/picker`, `react-native-url-polyfill`, `expo-auth-session`, `@react-navigation/native`).
- ~~New profile copies Main's colors~~ Fixed 2026-11-08: new people start all white.

### Still open after update 2

- **Public photos (bug 3):** the S3 bucket is public-read. Making it private with expiring links needs an AWS setting change, which is your call.
- **Video and audio playback:** needs a native package, a version bump and a new build. Remove the unused packages in that same build.
- **Small gaps:** an expired login retries the board load every 15 s until logout; two history entries saved within milliseconds of a sync could collide; closing the app within about a minute of deleting a person can leave their history on the server; a deleted person's photos stay in S3; Main's people bar hides while Main has no cards.
- **Onboarding:** on hold until this round is tested.

## 7. Questions (answered 2026-11-08)

Answers: 1) Main colors = general weight, and a new person starts all white (done). 2) Ended status: built, test it. 3) No green flags for now.

Original questions:

1. **What do colors on Main mean?** *I assumed "how much this matters to me in general".* But creating a person copies Main's colors, so in the real app Casey would have started with Main's 4 reds and 12 yellows already set. I built the people as if each new person starts all white. Should new people start white? Or are Main colors not supposed to be used at all? If you create a test profile, you'll see the copy happen.
2. **Should people have an ended or archived state** instead of a name suffix?
3. **Do you want green (positive) flags?**

## 8. What I changed, and how to undo it

- **Board:** your old test board (1 card, "Flag 1 Jace", and 2 unnamed profiles) is backed up in `Dealbreaker-Backend/scripts/demo-seed/backups/`, then replaced with the demo.
- **History:** 80 new entries, each tagged `demoSeed: true`. Your 28 older test entries are untouched; they belong to cards that no longer exist, so the app doesn't show them.
- **S3:** 14 demo files uploaded through the app's own upload route, plus one 64-pixel test image.
- **Scripts (in the backend repo, not committed):** `scripts/demo-seed/seed-demo.js` and `make-assets.js`.
  - Rewrite the demo: `node scripts/demo-seed/seed-demo.js`
  - Guard against a phone overwrite: `node scripts/demo-seed/seed-demo.js --watch=120`
  - Remove the demo and restore the old board: `node scripts/demo-seed/seed-demo.js --undo`
