# Simplify — Publishing and Video

Audit before code (simplify-common, phase A). Data: Day 30, every Atlas and Juno event triggered from ⇧D, then
Publishing › Queues « Ask Atlas to fill ». Words are measured with `design-plans/text-density.js` at 1440 × 900.

## 1. Current map

| Route | Tabs / blocks | Words, first screen | Words, page |
|---|---|---|---|
| `/publishing` (Ideas) | PageHead 18 · Tabs 11 (6 tabs, 4 badges) · **Needs you** block 188 (5 groups with headers, hints and group primaries, a count filter row) · Atlas's summary sentence · Ready to review · New ideas · Series (group headers) | 217 | 607 |
| `/publishing/calendar` | PageHead · Tabs · toolbar 12 · **summary line** 16 (« 5 need you · 1 failed · 2 drafts to schedule · 1 idea ») · **shared-pause note** · Select all · week grid ~340 | 400 | 432 |
| `/publishing/plan` | head card 95 (who built it, cadence, pillars, mix, warnings, diff) · list by day 70 · footer 13 | 207 | 456 |
| `/publishing/drafts` | Author filter · **Waiting for your approval** card (a copy of Needs you) · Drafts card 113 | 145 | 203 |
| `/publishing/queues` | lede 12 · 2 queue cards 64 + 59 | 164 | 164 |
| `/publishing/media` | **Atlas needs you on N visuals** card 43 (a copy of 2 Needs you cards) · search + tag chips 19 · grid 110 | 201 | 317 |
| `/video` (Clips) | PageHead 14 · Tabs 5 · Filters 11 · list 201 | 235 | 352 |
| `/video/sources` | Watching card 19 (agent sentence + 2 switches) · Add a video 17 · Videos 59 | 117 | 117 |
| `/video/brand` | lede 13 · Captions 64 (5 templates with a note each) · On every clip 28 · Language versions | 127 | 155 |

Panels: the Composer, the post panel (`PostPreview`) and the clip editor are tools; the idea panel repeats its
« Spotted by · confidence » line under the proof, and again behind « Why? ».

## 2. Usage

| Where | Who, what decision | How often |
|---|---|---|
| Needs you (on Ideas) | Sam: approve Atlas's posts, retry a failure, answer a question, approve the plan | every day |
| Ideas list | Sam: schedule, draft or put away an idea | every day |
| Atlas's summary sentence | nobody decides on it; it restates the counts | demo |
| Calendar week / month / list | Sam: see the week, move a post, open one | every day |
| Calendar summary line | narrows the calendar to a status; the Filters popover already has Status | weekly |
| Calendar shared-pause note | one Echo alert (demo event) | demo |
| Plan review | Sam: approve the Thursday plan | weekly, reached from its Needs-you row |
| Drafts | Sam: schedule a draft | weekly |
| Drafts › Waiting for your approval | copy of Needs you | never (duplicate) |
| Queues | Sam: change a recurring slot; ask Atlas to fill | rarely (setup) |
| Media grid | Sam: find, upload, tag a photo | weekly |
| Media › Atlas needs you on visuals | copy of the « Missing visual » and « Licence » cards | demo |
| Video › Clips | Sam: review and send clips | every day |
| Video › Sources | Sam: add a video, open a transcript | weekly |
| Video › Sources › Watching | switch auto-clipping on or off | rarely (setup) |
| Video › Brand kit | caption style, logo, music, languages | rarely (setup) |

## 3. Tailored components → standard pattern

| Today | Replaced by |
|---|---|
| `PublishingNeeds` (`Needs.tsx`): group headers, hints, group primaries « Approve all 9 », « Retry all », count chips | §14 list: « Needs you » is the first `Filters` item; one row per card, a `Pill` + « Why? » when it is Failed or Paused, one decision visible, the rest in a `Menu`; « Approve N » in the list head, `BulkBar` while selecting |
| Paused group listing each paused post, with its shared hint | the pause card is one row (Pill « Paused », Why? = the alert); « Keep them paused » visible, « Resume all now » in the menu; a single post resumes from its panel |
| Atlas's summary sentence (`summarize`) | gone: the counts are the filters |
| Ready to review / New ideas / Series group headers | one « Ideas » filter, ready first; a series says « Series · N posts » in its meta line |
| Calendar summary line (`cal-attn`) | gone: the Status facet in Filters does the same; what needs Sam is on the landing |
| Calendar shared-pause note (`cal-shared`) | gone: each paused card says « During … » on its line, Resume all is on the Needs-you row |
| Drafts › Waiting for your approval | gone (duplicate of Needs you) |
| Drafts tab | « Drafts » filter of the landing list, same rows, `PostsBulk` while selecting; the Author filter is in Calendar › Filters |
| Media › Atlas needs you on visuals | gone (duplicate of Needs you); a post waiting for an upload gets « Upload a visual » in its own panel |
| Queues tab | `Sheet` from the Calendar toolbar (« Queues »): recurring slots are a setting of the calendar |
| Video › Watching card + Brand kit tab | one « Settings » `Sheet` from the Video header (Watching, Captions, On every clip, Languages) |
| Caption template notes (« The word being said lights up ») | the sample shows it; the note moves to the radio's title |

## 4. Target map

| Before | After | Why |
|---|---|---|
| Publishing: Ideas · Calendar · Plan review · Drafts · Queues · Media (6 tabs) | **Ideas · Calendar · Media** (3 tabs) | three different views: a list to act on, a schedule, a library |
| Ideas: Needs-you block + summary + 3 groups | one §14 list: `Needs you · Ideas · Drafts` | one block above the list (the filters), counts in the filters |
| Plan review tab | `/publishing/plan`, a page under Ideas with a back link, opened from its Needs-you row, the Desk card and the idea panel | a weekly set to validate, not a place to browse |
| Drafts tab | `/publishing/drafts` → `/publishing?show=drafts` | a state of a post, not a place |
| Queues tab | `/publishing/queues` → Calendar with the Queues sheet open | a setting of the calendar |
| Media tab | stays | a real library (upload, tags, rights) the composer also picks from |
| Calendar summary line, shared note | gone | statuses on the cards, Status in Filters |
| Video: Clips · Sources · Brand kit (3 tabs) | **Clips · Videos** (2 tabs) + « Settings » sheet | Brand kit and Watching are setup, used rarely |
| `/video/brand` | → `/video?settings=1` | |
| Brand kit to the Playbook? | No: it is the clip template (style, logo, music), not a brand rule; the Playbook belongs to another lot | |

## 5. References (structure only)

- Buffer: one Publish view per channel; Queue, Drafts and Approvals are filters of it, not separate pages; the posting
  schedule (time slots) sits in the channel's settings.
- Later: Calendar first; the Media Library is a side panel of the calendar and of the post editor.
- Hootsuite: Planner (calendar) and Content (a list with Drafts, Pending approval, Scheduled as filters).
- Sprout Social: Publishing › Calendar, with Drafts and Approvals as states and the queue as a setting.
- Klaviyo › Reviews ([Mobbin](https://mobbin.com/screens/cd19443d-d489-439d-8e93-a80ed79243a7)): status as a filter of one
  list; settings behind a header button, not a tab.

Shared lesson: one list filtered by state, one calendar, settings behind a button.
