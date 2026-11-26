# Simply PDF 2.2 design study

Why the app looks and moves the way it does. Written before the redesign, so every choice below traces back to something real.

## How this was done

- **Samiur's own projects** (read from source in `C:\Working Projects`): Bouncy Calculator, Islam Everyday, WorkRoaster, Puffkin, Simply Made Studio. Keyframes, easing curves, glass recipes, splash scripts and theme lists were pulled out of the CSS and JS.
- **Design tokens extracted automatically** (palette, type, radii, button styles) for teenage engineering, Nothing, Stripe Press, Paper, Family, Rauno Freiberg and Raycast.
- **Everything else** is analysed from working knowledge of each product, not from fresh screenshots: screenshots couldn't be fetched from the build environment. Treat those rows as informed reference, not measured data.

## 1. The house style (from Samiur's projects)

| Pattern | Where it shows up | Used in Simply PDF as |
|---|---|---|
| Two-act ~5 s splash: studio card (two capsules slide together and *lock*), then a product scene, then zoom-dissolve. Skippable after the studio name, CSS-only, 8 s failsafe | Bouncy Calculator `splash.css`, Islam Everyday `sp-*`, WorkRoaster `boot-*` | Same structure. Act 2: sheets fly in and stack, a highlighter swipes, a DONE stamp thumps, a counter runs to 100 |
| Overshoot spring for anything touched: `cubic-bezier(.34, 1.56, .64, 1)` | All five projects | `--spring` on press, pop and toggle |
| Expo-out for things that move on their own: `cubic-bezier(.16, 1, .3, 1)` | Studio site ("the house curve"), WorkRoaster `--ease-spatial` | `--ease-out` on page entry and sheets |
| Liquid glass: `saturate(180%) blur(26–30px)` with an inset top highlight | WorkRoaster, Calculator "Liquid Glass" theme | Top bar, floating tab bar, action bar, toasts, sheets |
| Jelly / wiggle on hover and press | Puffkin `hover-jelly`, `hover-wiggle` | Squash-and-stretch on buttons, a wiggle on the drop target |
| User-facing **Motion & bounce** control | WorkRoaster Settings › Appearance, Puffkin `data-motion-resolved` | Settings › Motion: Full · Gentle · Off (Off follows the system's reduce-motion) |
| Themes named after real objects, not colours | Calculator's 24: Braun ET66, TE Field, Risograph, Washi & Sumi, Paperback… | Paper · Legal Pad · Tracing Paper · Carbon · Darkroom · Slate |
| Hanken Grotesk + Martian Mono | Studio site, Simply PDF | Kept: the studio's type pair |

## 2. Twenty-five websites (theme)

| # | Site | What's distinctive | Taken |
|---|---|---|---|
| 1 | teenage.engineering | Pure black, one `#FF0000` accent, custom TE-20 face, 0 px radius, 4 px grid | One loud accent per theme, everything else quiet |
| 2 | nothing.tech | `#F4F4F4` + `#FFC700`, NType82 dot-matrix type, 4 px radii | Mono labels as a texture; Legal Pad's yellow sits near this |
| 3 | press.stripe.com | Ivar serif on deep `#201819`, books as objects, gold `#C1B676` | Documents shown as physical objects with weight |
| 4 | paper.design | Warm `#FCFCF9`, single `#81ACEC` accent, Matter | Paper white that isn't white; restraint |
| 5 | family.co | Pills (32 px), springy micro-transitions everywhere | Pill buttons, springs on every state change |
| 6 | rauno.me | `#EDEDED`, craft-level micro-interactions | Small details: stamp, counter, press depth |
| 7 | raycast.com | `#07080A`, buttons with inset top highlight + outer glow | Carbon's buttons; glass highlight edge |
| 8 | poolsuite.net | Retro OS chrome, unapologetically fun | Permission to be playful in a utility |
| 9 | play.date | One colour (yellow), a crank, black-and-white screen | A single physical metaphor carried all the way |
| 10 | are.na | Almost no decoration, content first | Tool list stays a plain list |
| 11 | linear.app | `#08090A`, precise motion, nothing bounces without reason | Springs only on direct touch, not on everything |
| 12 | mymind.com | Calm cream, soft cards, a private-space feel | Privacy as a mood, not a banner |
| 13 | tldraw.com | Hand-drawn shapes, friendly colours | Highlighter stroke that's slightly uneven |
| 14 | rive.app | State-machine animations that react to input | Animations that respond to what you do |
| 15 | readymag.com | Editorial layouts, type as image | Large display type on result screens |
| 16 | lusion.co | Immersive WebGL, physics | Not used: too heavy for a phone utility |
| 17 | obys.agency | Bold editorial type, page-turn transitions | Sheets that slide like paper |
| 18 | basement.studio | Loud loaders that are part of the brand | The splash is a brand moment, not a spinner |
| 19 | fey.com | Dark finance UI, soft glows behind glass | Coloured light *behind* glass so the glass reads |
| 20 | locomotive.ca | Smooth inertial scroll, staggered reveals | Staggered list entry |
| 21 | panic.com | Warm, witty, hand-made product pages | Copy with personality |
| 22 | neal.fun | Toy-like, every page a small game | Tiny delights: stamp, confetti-free celebration |
| 23 | craft.do | Native-feeling cards, generous radii | Rounded "sheet" cards |
| 24 | vercel.com (Geist) | Strict grid, mono for data | Numbers in mono, always tabular |
| 25 | cosmos.so | Moody image grid, glassy chrome over content | Glass chrome over thumbnails |

## 3. Twenty-five apps and builds (interaction)

| # | App | Interaction worth stealing | Taken |
|---|---|---|---|
| 1 | Things 3 | The "Magic Plus" button you drag to where a task goes | Grip-drag to reorder pages |
| 2 | Flighty | Live, satisfying status changes | Progress that reads like a status, not a bar |
| 3 | Halide | Tactile dials and haptic detents | Press depth on buttons |
| 4 | Bear | Themes with names and character | Named themes |
| 5 | iA Writer | Focus: everything else fades | Tool screens hide the tab bar |
| 6 | Mela | Clean recipe cards, calm hierarchy | Result card hierarchy |
| 7 | Moonlitt (ADA 2026, Interaction) | Best-in-class Liquid Glass, scrubbing controls | Glass controls that stay legible |
| 8 | Lumy | Glass scrubber over a live scene | Glass over colour, never over flat grey |
| 9 | Telegram (iOS 26) | Glass tab bar with a liquid active blob | Floating tab bar with a sliding blob |
| 10 | Dia / Arc | Playful onboarding, springy everything | Splash energy |
| 11 | Airbnb (2025 redesign) | Dimensional, almost skeuomorphic icons | Tool icons on tinted tiles |
| 12 | Duolingo | Celebrations that feel earned | DONE stamp on every finished job |
| 13 | Headspace | Soft, breathing idle animations | Breathing sheet stack on the drop zone |
| 14 | Notion Calendar | Precise hover/press states | Clear pressed states |
| 15 | Amie | Joyful micro-animations in a utility | Fun inside a serious tool |
| 16 | Tot (Iconfactory) | Seven colour dots as the whole UI | Theme swatches as the theme picker |
| 17 | CARROT Weather | Personality settings | Motion setting with character |
| 18 | (Not Boring) Weather | 3D, sound, haptics, materials | Material feel per theme |
| 19 | Grug (ADA) | A mascot's voice in the copy | Kept copy plain; noted |
| 20 | Opal | Dark glass, glowing gems | Carbon's glow behind glass |
| 21 | Nothing OS | Dot-matrix widgets, monochrome + one red | Mono eyebrows |
| 22 | Material 3 Expressive (Android 16) | Spring motion tokens, shape morphing | Android-native springy feel; shape-morphing tab blob |
| 23 | iLovePDF (competitor) | Every tool a coloured tile; ads, upsell, account walls | Tinted tool tiles yes; walls no |
| 24 | Smallpdf (competitor) | Friendly, but sign-up nags and limits | Proof the four promises are a differentiator |
| 25 | Genius Scan / Adobe Scan | Camera-first, page thumbnails as the main object | Pages are the hero on every tool screen |

## 4. What to avoid (generic AI looks)

- Purple-to-blue gradients, glowing orbs with no meaning, "glassmorphism" over flat grey.
- Everything bouncing: bounce only what the finger touched or what just finished.
- Inter on white with 16 px radius cards everywhere.
- A spinner instead of a loading story.

## 5. Decisions

- **Themes:** three light (Paper, Legal Pad, Tracing Paper) and three dark (Carbon, Darkroom, Slate); "Match device" switches Paper/Carbon. Manila was dropped in 2.3 for being too close to Legal Pad.
- **Glass:** `saturate(180%) blur(28px)`, an inset highlight, a hairline edge, and theme-coloured ink blots drifting *behind* it so it reads as glass.
- **Motion:** `--spring` for touch, `--ease-out` for movement; Gentle swaps springs for soft easing; Off removes motion (default when the system asks for reduced motion).
- **Splash:** ~5 s, two acts, skippable after the studio name, once per launch, failsafe at 8 s.
