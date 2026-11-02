# GymTrace: visual QA pass

UI only. The QR/check-in code (`api/qr-token`, `api/check-in`, the member QR page, the scanner logic), the Firestore rules and the API were not changed. No new features, no copy changes except where text was clipped.

Screenshots referred to below are in `docs/visual-qa/` (29 files: a before/after pair for each fix, plus one image for each finding that was not fixed). The full set (470 images) was written to a temporary folder and is not kept.

## How it was done

- **Pages and states:** every public page; every page for a member, a trainer and an admin; and these states: modals (book a session, checkout, log workout, record payment, deactivate), login/register/forgot-password errors, "no match" searches, a brand-new empty member and an empty trainer, and the receipt page.
- **Sizes:** 1920×1080, 1440×900, 1024×768, 768×1024 and 375×812. **290 page/state/size combinations, 470 screenshots.**
- **Tool:** headless Chrome driven over the DevTools protocol, one clean profile per role, against the local app (emulators) with the realistic demo data. For each combination it scrolls through the page, takes screenshots, and measures the DOM: sideways scroll, text clipped or covered by another element, overlapping text and buttons, tiny text, colour contrast, broken images.
- **What I looked at myself:** about 80 of the 470 screenshots, chosen from the measurements and to cover every page type at desktop and phone width. Everything the measurements flagged as real was confirmed by eye. The measurements also produced many false alarms, mostly text scrolling underneath the fixed bottom navigation on phones and modal backdrops; those are ignored below.
- **Result in one line:** no page scrolls sideways at any of the five sizes; there were 8 clear layout bugs, which are fixed; the rest are listed under next steps.

## Not checked (be aware)

- **Real devices and other browsers.** Everything is headless Chrome. Not tested: Safari, Firefox, real iPhones or Android phones, a phone in landscape, sizes between the five, browser zoom or large system fonts.
- **Most screenshots were not viewed one by one.** Pages I did not open as images were checked only by the measurements: for example member pages at 1920 and 1024, and trainer pages at 768.
- **Staging UI beyond a spot-check** (see "Release checks").
- **The scanner's camera states.** Headless Chrome has no camera, so only the idle black camera area was seen; "camera denied" and a live scan were not.
- **Loading states.** Seen only incidentally (spinners and "Loading payments…" while data loaded). They look fine; no error or slow-network states were forced.
- **Server error pages** (API 500, offline) and **toasts** other than the login error toast.
- **Printing the receipt.**
- **Keyboard focus styles and screen readers** (only labels and names were checked, in the earlier refinement pass).
- **Colour contrast** was measured by script, which treats gradients as unknown; see N1.

## Fixed in this pass

| ID | Severity | Where / size | What was wrong | Fix | Evidence |
|---|---|---|---|---|---|
| V1 | major | Admin login, admin sidebar and admin mobile header, all sizes | The logo showed as a plain **white square**. The image is an opaque navy square and a `brightness-0 invert` filter turned all of it white. | Removed the filter; the logo shows, with rounded corners. | `V1-admin-login-before-1440x900.jpg`, `V1-admin-login-after-1440x900.jpg`, `V1-V8-admin-mobile-before-375x812.jpg`, `V1-V8-admin-mobile-after-375x812.jpg` |
| V2 | major | Member profile, 768 px | Two-column layout too narrow: the plan card cut "Monthly Members…", the email and phone fields were cut ("tolu.qa@", "0810 55"). | One column until 1024 px. | `V2-profile-before-768x1024.jpg`, `V2-profile-after-768x1024.jpg` |
| V3 | minor | Admin dashboard, 1024 px | Four stat cards squeezed: "Today's Check-\nins" broke over three lines; Recent Activity names cut to "Empty …". | Four cards across and the chart/activity split only from 1280 px; two-up and stacked below. | `V3-admin-dashboard-before-1024x768.jpg`, `V3-admin-dashboard-after-1024x768.jpg` |
| V4 | polish | Member dashboard, 1024 px and up | Three stat cards sat in a four-column grid: an empty slot, and the row didn't line up with the one below. | Three columns. | `V4-member-dashboard-before-1440x900.jpg`, `V4-member-dashboard-after-1440x900.jpg` |
| V5 | major | Log-workout modal, 375 px | The exercise row ran off the right edge of the modal: Sets/Reps/Weight were cut off and could not be filled in comfortably; "Intermediate" was cut to "Interme". | Exercise name on its own line, Sets/Reps/Weight on the next; duration and calories side by side; difficulty full width. | `V5-workout-modal-before-375x812.jpg`, `V5-workout-modal-after-375x812.jpg` |
| V6 | polish | Landing hero, short desktop screens (1024×768) | The phone mock-up cut through its third card ("Personal training" half visible). | On desktop screens shorter than 820 px that card is hidden, so the phone ends cleanly. | `V6-hero-before-1024x768.jpg`, `V6-hero-after-1024x768.jpg` |
| V7 | polish | Register, 375 px | The privacy checkbox was centred against a three-line label instead of its first line. | Aligned to the first line. | `V7-register-before-375x812.jpg`, `V7-register-after-375x812.jpg` |
| V8 | minor | Admin mobile bottom nav, 375 px | Labels truncated ("Dashbo…", "Payme…"). | Items share the width evenly without side padding. | `V1-V8-admin-mobile-before-375x812.jpg`, `V1-V8-admin-mobile-after-375x812.jpg` |
| V9 | minor | Trainer Sessions, member Payments and Attendance empty states, 375 px | Messages such as "No upcoming sessions found." were centred across a wide, sideways-scrolling table and cut off ("…sessions foun"). | Message pinned to the visible part of the table on phones; still centred on wider screens. | `V9-empty-sessions-before-375x812.jpg`, `V9-empty-sessions-after-375x812.jpg`, `V9-empty-payments-before-375x812.jpg`, `V9-empty-payments-after-375x812.jpg` |

Each fix has a source-level regression test in `tests/unit/visualqa.test.mjs` (no browser in the unit suite, so the tests pin the classes). The before and after images were taken with the same tool at the sizes shown.

## Not fixed: next steps

| ID | Severity | Where | Finding | Why not now | Evidence |
|---|---|---|---|---|---|
| N1 | major (accessibility) | Whole app | **Low colour contrast.** White text on the green buttons ("Register", "Create an account", "Login to Dashboard") measures about 2.0:1; green text on white ("Home", "access", "Take the guided tour") about 1.9:1; the emerald links ("Forgot password?") 3.8:1; grey helper text and placeholders (about 12 px) 2.5:1. WCAG AA asks for 4.5:1 (3:1 for large text). | The fix is a darker brand green and darker grey text everywhere, which changes the look of the whole app and is a design decision. | `N1-contrast-landing-1440x900.jpg`, `N1-contrast-login-1440x900.jpg` |
| N2 | major on phones and small laptops | Admin Members and Payments (up to 1024 px), trainer Sessions, trainer Schedule grid, member Attendance and Payments (375 px) | **Wide tables scroll sideways inside their card.** On a phone the trainer's **Mark Complete / Cancel** buttons and the admin's **Record payment** button are off-screen until you scroll sideways. (Same family as QA F9 and refinement R19/R22.) | Needs a card layout per row on phones: a redesign, not a small fix. | `N2-table-sideways-admin-payments-1024x768.jpg`, `N2-table-sideways-trainer-sessions-375x812.jpg` |
| N3 | minor | Member modals (book a session, checkout), 768 px | The dimmed backdrop covers the page but not the sidebar, and the dialog overlaps the sidebar's edge. Usable but untidy. | Needs a look at how the modals are layered; not a one-line change. | `N3-modal-over-sidebar-768x1024.jpg`, `N3-modal-over-sidebar-checkout-768x1024.jpg` |
| N4 | minor | Member QR page, 375 px | Two headers stack (the layout's and the page's own bar), and the "New Code Now" button sits right above the bottom nav. | **The QR page is out of scope for this pass.** | `N4-qr-double-header-375x812.jpg` |
| N5 | minor (UX) | Any signed-in page | **"Account profile not found"** (a dead end with only "Sign out") appeared a few times during the parallel capture, at 375 px for a member and at 1440 px for a trainer. It never appeared in three clean runs of the same pages one at a time, so it is a transient failure to load the profile under load, not a layout bug. The app shows the dead end after a single failed attempt. | Retrying before showing the error is a behaviour change. | `N5-profile-not-found-375x812.jpg`, `N5-profile-not-found-trainer-1440x900.jpg` |
| N6 | polish | Login, register, forgot password | The logo is an opaque dark square with sharp corners on a light page; it looks pasted in. | Needs a transparent logo file or a designed header. | `N1-contrast-login-1440x900.jpg` |
| N7 | polish | Trainer Sessions, 375 px | The search box is narrower than the card (about 280 of 326 px). | Cosmetic. | `N2-table-sideways-trainer-sessions-375x812.jpg` |
| N8 | polish | Admin dashboard, 1024 px | Below the stat cards the page is long and the chart only fills the left; fine, just plain. | Design. | `V3-admin-dashboard-after-1024x768.jpg` |

### Findings from the measurements that are not problems
- "Covered" and "overlapping" text at 375 px that is simply scrolled under the fixed bottom navigation. Pages leave room at the end, so nothing is lost.
- Text hidden behind modal backdrops, and buttons "overlapping" the page underneath a modal.
- `sr-only` text (screen-reader-only "Receipt" column label) reported as clipped.
- The measurement counts about 10 px text in the mobile bottom nav as "tiny"; it is a deliberate label size and is readable in the screenshots.

## Release checks

- **Automated:** lint 0 errors (the same 5 old warnings), build passes, 114 unit tests and 100 emulator tests pass.
- **Staging smoke:** 28 of 28 checks pass.
- **Staging visual check:** the fixed pages were captured on the deployed staging site with three throwaway accounts (admin, member, trainer; deleted afterwards) at all five sizes: public landing, register and admin login; admin dashboard and trainers; member profile, dashboard, payments and the log-workout modal; trainer sessions (empty). No page scrolls sideways at any size, and each fix looks the same on staging as on the local build.
- **Not repeated on staging:** the other 240 combinations (see "Not checked").
- **Machine clock:** while running the smoke test the development machine's clock was about 54 minutes ahead of real time, so Google rejected the service-account token. The smoke script was run with a temporary time offset for that one process; no system settings were changed.
