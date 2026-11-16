# Recon map: Duolingo-inspired Simplified Chinese learning app (Web)

Scope: Full learning-app experience, adapted clean-room for Mandarin Chinese with Simplified Chinese characters; web-first, responsive.
For: General learners studying Mandarin through Simplified Chinese, from beginner onward.
Date: 2026-11-08

This is a functional and UX-pattern study, not a reproduction of Duolingo's branding, copy, artwork, proprietary lessons, or code. Findings below use public sources only; no account was accessed and no screenshots were collected. The product is web-first rather than a pixel-identical port of the mobile app. Duolingo's current public material often describes mobile-specific placement/navigation; equivalent web routes below are proposed patterns, not verified current Duolingo web screens. The Chinese curriculum and pedagogy must be original.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Duolingo: What Kind of Chinese Does Duolingo Teach? | https://blog.duolingo.com/chinese-languages/ | Confirms Mandarin with Simplified Characters for certain source-language courses. Reference for explicit script choice; our scope is Chinese character-first. |
| 2 | Duolingo: New way to learn Chinese characters | https://blog.duolingo.com/component-sessions/ | Character learning component and practice context; adapt learning pattern, create original instruction/content. |
| 3 | Duolingo: Practice Hub guide | https://blog.duolingo.com/guide-to-duolingo-practice-hub/ | Reviews, vocabulary, speaking/listening and course-dependent practice; some feature availability varies by course/platform. |
| 4 | Duolingo: 2025 product highlights | https://blog.duolingo.com/product-highlights/ | Official highlights of course paths, flashcards, Stories, speaking/video call, friends/quests and lesson feedback. Availability varies. |
| 5 | Duolingo: Ways to practice | https://blog.duolingo.com/ways-to-practice-in-duolingo/ | Public overview of practice modes. |
| 6 | Duolingo Super | https://www.duolingo.com/super | Subscription reference; current exact prices and entitlements may vary by country/platform. |
| 7 | Duolingo Max help page | https://www.duolingo.com/help/what-is-duolingo-max | AI premium feature reference; do not copy proprietary AI interactions or promise availability. |
| 8 | Duolingo Terms of Service | https://www.duolingo.com/terms | Terms should be checked before using a personal account for competitive-product research. Not used here; public sources only. |
| 9 | Duolingo public product site | https://www.duolingo.com/ | Public marketing/product context. |
| 10 | Duolingo public Practice Hub page | https://www.duolingo.com/practice-hub/stories | Public surface for practice/stories discovery; content availability can require login/course access. |

## Core loop

Learner chooses a goal and starts at the next short lesson on a guided path; completes original Simplified Chinese character, listening, speaking, reading, and translation exercises with immediate feedback; earns progress/rewards; then returns for spaced review and a daily streak.

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen / to support |
| --- | --- | --- | --- | --- | --- |
| S01 | Landing | `/` | Explain the Chinese-learning product and start signup/placement. | Hero, value proposition, CTA, sample character lesson | visitor, signed in redirect, mobile |
| S02 | Sign up / sign in | `/auth` | Create or access an account. | Email/password, OAuth, validation, legal links | empty, invalid, loading, error, success |
| S03 | Welcome / goal setup | `/onboarding` | Establish motivation and daily commitment. | goal prompts, reminder opt-in, progress preview | fresh, selected, skipped, permission denied |
| S04 | Prior knowledge | `/onboarding/level` | Decide whether to start at basics or take placement. | start beginner, placement option, explanation | new learner, returning learner, placement skipped |
| S05 | Placement check | `/placement` | Estimate learner level with low-stakes original tasks. | mixed exercise types, progress indicator, exit | active, answer feedback, completed, exit/resume |
| S06 | Course home / learning path | `/learn` | Show next step and progress through units. | unit header, lesson nodes, checkpoints, streak/XP summary | new, in-progress, completed, locked, offline/error |
| S07 | Lesson intro | `/lesson/:id` | Set a concise objective and begin. | objective, estimated duration, start CTA | ready, retry, resume |
| S08 | Exercise | `/lesson/:id/exercise/:n` | Practice one skill with a single prompt at a time. | prompt, audio, answer choices/input, progress, check/continue | unanswered, selected, correct, incorrect, audio unavailable |
| S09 | Character lab | `/practice/characters` | Learn component/radical, stroke order, recognition and writing. | large character, stroke animation/canvas, pinyin, meaning, examples | new, practiced, correction, unsupported input/device |
| S10 | Listening / speaking exercise | within lesson or `/practice/speaking` | Hear Mandarin and optionally produce speech. | audio player, replay/slow, microphone, transcript reveal | permission denied, recognition uncertain, unavailable, correct/try again |
| S11 | Lesson results | `/lesson/:id/results` | Reinforce what was learned and award progress. | score, XP, errors to review, continue CTA | pass, needs practice, streak updated, save error |
| S12 | Path checkpoint / unit review | `/learn/unit/:id/review` | Consolidate material before advancing. | mixed review, mastery indicator, next unit | locked, ready, passed, retry |
| S13 | Practice hub | `/practice` | Offer focused practice outside the path. | review mistakes, characters, words, listening, speaking, reading | empty review queue, available, unsupported mode |
| S14 | Mistake review | `/practice/mistakes` | Revisit recent errors with corrective feedback. | question cards, explanation, retry, queue count | no mistakes, queued, cleared |
| S15 | Vocabulary / flashcards | `/practice/words` | Recall saved or due words. | card front/back, pinyin toggle, audio, known/again | empty, due, complete |
| S16 | Progress / stats | `/progress` | Show learning consistency and mastery. | study calendar, XP, units, skills, streak | new learner, activity, no-data, loading |
| S17 | Leaderboard / social | `/league` | Optional weekly motivation with peers/friends. | rank list, weekly period, opt-in settings | joining, active, empty group, opted out |
| S18 | Quests / achievements | `/quests` | Provide small daily/weekly goals and recognition. | quest cards, progress, reward state | not started, partial, completed, expired |
| S19 | Stories / contextual reading | `/practice/stories` | Build comprehension through original short narratives. | story list, level, dialogue, comprehension questions | locked, available, in progress, complete |
| S20 | Subscription / upgrade | `/plans` | Explain optional paid tier and purchase flow. | plan comparison, trial terms, billing CTA | free, eligible, checkout loading/error, active, cancelled |
| S21 | Account / settings | `/settings` | Manage profile, goals, reminders, accessibility, data. | profile fields, toggles, account actions | saved, validation, error, notification denied |
| S22 | Help / feedback | `/help` | Provide support and report content/audio issues. | help topics, contact/report form | empty, submitting, submitted, error |

## Flows

```
F01 New learner starts Simplified Chinese
    S01 -> S02 -> S03 -> S04 -> (S05) -> S06 -> S07 -> S08 -> S11
    happy path clicks: about 9-11 actions depending on whether placement is taken
    edge: OAuth/email failure, goal/reminder skipped, placement misclassifies, learner already knows characters, mobile viewport

F02 Complete a daily lesson
    S06 -> S07 -> S08 (repeat per exercise) -> S11 -> S06
    happy path clicks: 1 start + each answer/check + continue; lesson length configurable
    edge: wrong answer, lost connection, audio unavailable, tab refresh, leaving mid-lesson, duplicate completion

F03 Learn/review a character
    S06 or S13 -> S09 -> S08 -> S11 or S15
    happy path clicks: 3-6 depending on selected lesson
    edge: stroke recognition uncertain, pinyin gives away answer, simplified/traditional confusion, audio mismatch

F04 Practice mistakes and vocabulary
    S13 -> S14 and/or S15 -> S11 -> S06
    happy path clicks: one route selection + repeat review actions
    edge: empty due queue, word not recognized, user clears queue without retention update

F05 Practice listening/speaking
    S13 -> S10 -> S11
    happy path clicks: 1 mode selection + prompt actions
    edge: microphone denied, noisy environment, accent/ASR uncertainty, replay/rate controls, no audio device

F06 Read a story
    S13 -> S19 -> S08 -> S11
    happy path clicks: choose a story + advance through panels/questions
    edge: vocabulary too advanced, story not available at current level, audio or media fails

F07 Maintain a streak and complete a quest
    S06 -> S07 -> S08 -> S11 -> S18 (or S16)
    happy path clicks: daily session then optional rewards screen
    edge: local timezone/day boundary, missed day, streak freeze policy, reward already claimed

F08 Check progress and social ranking
    S06 -> S16 and/or S17 -> S18
    happy path clicks: 2-3 navigation actions
    edge: opt out, no cohort, weekly reset/timezone, privacy controls, empty new-account state

F09 Upgrade
    S13 or S20 -> S20 -> checkout -> S06
    happy path clicks: plan selection + confirmation, depends on payment provider
    edge: checkout declined/cancelled, duplicate webhook, expired trial, restore/cancel entitlement

F10 Change goals or reminders
    S06 -> S21 -> save
    happy path clicks: 2-4
    edge: permission denied, timezone change, invalid values, persistence failure
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Primary/secondary button | filled, outline, text, destructive | default, hover, focus, disabled, loading | all |
| Bottom/top navigation | learn, practice, progress, social/profile | active, inactive, compact/mobile | S06, S13, S16-S18, S21 |
| Progress indicator | lesson, unit, course | 0%, active, complete, paused | S05-S12, S19 |
| Lesson node | next, locked, completed, checkpoint | available, current, mastered, disabled | S06 |
| Exercise answer | choice chip, word tile, text input, audio response | empty, selected, correct, incorrect, disabled | S05, S08, S10, S19 |
| Feedback panel | correct, retry, explanation | hidden, shown, dismissible | S05, S08-S12, S19 |
| Character card | character, pinyin, meaning, audio | concealed/revealed, new/due/mastered | S09, S13-S15 |
| Audio player | prompt, replay, slow playback | idle, playing, paused, unavailable | S08-S10, S19 |
| Microphone control | start/stop/ retry | permission request, recording, processing, denied, uncertain | S10 |
| Streak / XP badge | compact, expanded | current, increased, at-risk, frozen | S06, S11, S16, S18 |
| Modal / dialog | confirm, onboarding, upgrade | open, close, submitting, error | S03-S05, S20-S22 |
| Toast / inline alert | success, error, warning | transient, persistent, dismissible | all |
| Quest / achievement card | daily, weekly, milestone | not started, progress, complete, claimed | S18 |
| Story panel | dialogue, narration, question | current, answered, complete | S19 |
| Plan card | free, paid tier(s) | selected, current, unavailable | S20 |
| Form field | email, password, profile, goal, support | pristine, focus, invalid, disabled | S02-S03, S21-S22 |

## Chinese-specific product requirements

- Beginner course should foreground Simplified Chinese characters while teaching pronunciation: pinyin and tone marks are visible at first, with a learner-controlled fade/reveal as skills improve. Avoid positioning pinyin as a permanent substitute for character literacy.
- Teach tones explicitly using listening contrasts, tone contours, syllable-level audio, and contextual speech; provide slow replay and clear uncertainty feedback rather than marking uncertain speech recognition as definitively wrong.
- Character instruction should connect components/radicals, meaning, stroke order, recognition, typing, and recall. Distinguish reading recognition from production/writing mastery.
- Exercise variety should include character-to-meaning, pinyin-to-character, audio-to-character/meaning, word order, sentence translation, listening comprehension, and optional pronunciation production. Avoid culturally unnatural sentence banks and random character drills without context.
- Pinyin typography must render tone diacritics and neutral tone correctly. Audio should be recorded or licensed for the product; never reuse Duolingo audio or course content.
- Support simplified/traditional distinction in account/course settings only if product scope expands; default course script is Simplified Chinese as requested. Keep internal character/word data capable of tracking script explicitly.
- Speech scoring requires informed microphone permission, accessible text alternatives, and a non-speech path. Do not claim human-like pronunciation grading unless validated.
- Courses, characters, examples, stories, translations, prompts, voices, mascots, logos, and illustrations must be original or appropriately licensed. Use familiar interaction patterns without copying expression or brand identity.

## Inferred data model

```
User  id, email, display_name, created_at, locale, timezone, course_id, daily_goal, reminder_preferences, privacy_settings
     evidence: S02-S04, S21; confidence: high

Course  id, source_locale, target_language, script (simplified), title, version, status
       evidence: S03-S06 and Chinese scope; confidence: high

Unit  id, course_id, order, title, objective, unlock_rule
     evidence: S06, S12; confidence: medium

Lesson  id, unit_id, order, skill_tags, estimated_duration, status
       evidence: S06-S08; confidence: medium

Exercise  id, lesson_id, order, exercise_type, prompt_data, answer_data, feedback_data, audio_asset_id, character_ids
          evidence: S08-S10; confidence: medium

Character  id, simplified, pinyin, tone_numbers, meaning_gloss, components, stroke_data_ref, audio_asset_id
          evidence: S09, S15 and Chinese requirements; confidence: medium (curriculum details product-defined)

VocabularyItem  id, course_id, simplified_text, pinyin, tone_sequence, gloss, audio_asset_id, level
               evidence: S08-S10, S15; confidence: medium

LearningEvent  id, user_id, exercise_id, submitted_answer, correctness, confidence, duration_ms, occurred_at
              evidence: S08, S11, S14; confidence: medium

Mastery  user_id, vocabulary_item_id or skill_id, due_at, stability, last_result, updated_at
        evidence: spaced review in S13-S15; confidence: medium (algorithm is product-defined)

LessonAttempt  id, user_id, lesson_id, started_at, completed_at, score, xp_awarded, status
              evidence: S07-S12; confidence: high

Streak  user_id, current_days, longest_days, last_activity_date, timezone, freeze_balance
       evidence: S11, S16, S18; confidence: medium (freeze behavior product-defined)

Quest  id, period_start, period_end, requirement_type, requirement_value, reward
      evidence: S18; confidence: medium

UserQuest  user_id, quest_id, progress, completed_at, claimed_at
          evidence: S18; confidence: medium

Subscription  id, user_id, tier, provider, status, started_at, renews_at, entitlement_state
             evidence: S20; confidence: medium

Story  id, course_id, level, title, original_content_ref, vocabulary_ids, audio_asset_id
      evidence: S19; confidence: medium

LeaderboardEntry  user_id, group_id, week_start, points, rank_snapshot
                  evidence: S17; confidence: medium; social model may be omitted from MVP
```

Relationships: User 1-n LessonAttempt, LearningEvent, UserQuest; Course 1-n Unit and VocabularyItem; Unit 1-n Lesson; Lesson 1-n Exercise; Exercise n-m Character/VocabularyItem; User n-m VocabularyItem through Mastery; Quest n-m User through UserQuest; Course 1-n Story. Subscription belongs to User. Leaderboard membership is optional and privacy-sensitive.

## Feature matrix

See `features.csv`. Priority counts: must 13, should 9, could 11, skip 7.

## Out of scope (cannot or should not be cloned)

- Duolingo name, owl mascot, logos, illustrations, sound effects, UI artwork, distinctive copy, proprietary course sequence, lesson prompts, translations, stories, audio, or any other protected content/assets.
- Duolingo source code, binaries, private APIs, undocumented endpoints, traffic inspection, or scraping/crawling. No account was used; review current terms before any future account-based research.
- Duolingo learners, social graph, leaderboard population, achievements/history, account data, and other network effects.
- Duolingo's paid entitlements, exact prices, AI voice/model behavior, or partner/integration deals. Build independent pricing and original validated features if desired.
- Guarantees of equivalent curriculum coverage, proficiency outcomes, speech recognition accuracy, or current feature/platform parity. Build, test, and substantiate independently.
- Native app-only capabilities in the initial web slice (push, app-store billing, device-native handwriting); use responsive browser alternatives and scope native clients separately.

## Size

Screens 22, flows 10, entities 14. Hard parts: original Chinese curriculum and spaced review; high-quality Mandarin audio and robust tone/pronunciation feedback; progression/reward state and timezone edges; accessible responsive exercise interactions; optional subscriptions/social features. Size: **L** for the full-learning-app scope. Suggested vertical slice before broad build: S02 -> S04 -> S06 -> S08 -> S11, backed by original beginner lesson data and persisted progress. Social, subscription, advanced AI speaking, and large story libraries should follow only after the core loop is validated.
