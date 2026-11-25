# Post detail: benchmark

How seven tools show one post that is scheduled, waiting for approval, published or failed. We kept the hierarchy and
the flows. We did not copy any visual style: the view stays Protopulse.

**Sources.** Mobbin has real screens for Hootsuite, Buffer and Later. Planable and Agorapulse come from their own guides
and help articles. Sprout Social and Loomly come from search snippets and a blog post: their help centers refused
automated reads, so treat those two as lower confidence.

| Tool | Top of the view | Approval and comments | Date, network | Published results | Actions, failures |
|---|---|---|---|---|---|
| Hootsuite | Side sheet. The **status is the title** ("Scheduled"), with "Scheduled by …" under it | Details / Internal comments tabs ("won't be published"). Ask for approval, up to 3 levels, approval history | Network above a native-looking preview | Separate sheet: author, date, then every metric named | Edit, Delete, "…". Failed: red in the planner and an email |
| Buffer | No sheet. Queue / Drafts / Approvals / Sent tabs | Approve, and the button then says **"Add to Queue" or "Schedule Post"**. Reject sends it back to Drafts | Time in the day gutter, channel avatar | One row per Sent post: Reactions, Comments, Eng. rate, Views, Shares, Saves | View post, then "⋮" |
| Later | Composer modal: profile, publish mode and date first, then "Activity · 0 comments" | "Submit for review" next to Schedule | Header row | "Post performance": the post, then Post stats, each one named | Delete bottom left, Schedule bottom right |
| Sprout Social* | Message preview | Approve / Reject, and the optional note goes to **Approval activity** and to the author | Calendar item | Not checked | Failed stream: a **banner states the problem**, Show details, resend |
| Planable | **Preview true to the network**, comments on the right | **One Approve button**, which you can undo. Inline suggestions on the caption. Schedule on approval. Version history | Inside the preview | Not covered | Feedback goes through comments, with no "request changes" button |
| Loomly* | Post view page | The state changes in the post view. Public or private comments. History of the copy | Not documented | Not checked | Not checked |
| Agorapulse | Read-only pop-up, preview at the top | **Approve** (split button) or **Request changes**, which sets the post to Rejected. Internal or external comments | Tabs: Reports, Properties (dates, author, labels), Conversation, History | Metrics named and defined, plus "View on network" | **Error shown in the preview**, Retry now when the error is temporary |

\* lower confidence

## Patterns we kept, and why

1. **The status answers first.** Hootsuite makes the status the title, and Sprout opens a failed post with a banner. Sam
   opens a post to find out where it stands, so the view now starts with a state band: a status pill, one sentence,
   then the reason.
2. **The approve button says what happens next** ("Approve and schedule", as in Buffer and Agorapulse). This way Sam
   knows the post will go out at the time shown.
3. **One main verb and its opposite, next to the reason.** Approve, Request changes, Edit. This puts the decision in one
   place (Sprout, Agorapulse). In Protopulse the request goes to Atlas (shorter, warmer, more formal) through the same
   thread as the Desk card, because no reviewer stands between Sam and the post.
4. **Show the version Sam is approving.** Planable and Agorapulse show the preview exactly as the network will. When
   Atlas revises the draft on the Desk card, the preview shows that revision, because that is the text approving
   schedules.
5. **Results named in text, then a link to the full report.** Buffer and Later show 4 to 6 named metrics, never an icon
   next to a number. Protopulse shows Reach and Engagement rate against the network's median, Atlas's reading of them,
   and "See in Insights".
6. **Show the failure with the fix next to it** (Agorapulse, Sprout). The view shows what the network refused, when it
   refused it, and the retry options Atlas offers, with the recommended one first.
7. **A small, stable set of actions: the main action, one or two secondary actions, then "More"** (Hootsuite, Buffer).
   The main action changes with the status. Reschedule, Duplicate and Delete go in More.
8. **History is kept apart from the decision** (Agorapulse's History tab, Sprout's Approval activity). The view lists
   who did what and when: Atlas, Claire, Sam.

## What we left out

- Comments that only some people can see, and comments sent to a client (Agorapulse, Hootsuite). Protopulse has one
  outside reviewer, Claire, and she answers through her lane on the Desk.
- Suggestions inside the caption and locking a post after approval (Planable). These need a real way to edit text
  together, and the prototype doesn't have one.
- A full metrics list (Hootsuite). Iris owns the analysis in Insights, so the post view stays a summary.

## Links

- Mobbin, Hootsuite: [1](https://mobbin.com/screens/f143273e-b1c7-4b6b-a605-3dfb81d472f0), [2](https://mobbin.com/screens/e57031db-f722-4518-a718-1466a319eee5), [3](https://mobbin.com/screens/a7fce7a6-32e4-4886-9f7e-32794fcf72f8), [4](https://mobbin.com/screens/4c7b7f70-cac6-4b10-9ff4-f76b9a05664a)
- Mobbin, Buffer: [1](https://mobbin.com/screens/f03f6ccc-5c1d-4978-8371-1701a8f1b831), [2](https://mobbin.com/screens/992508f9-1d1a-43d6-8ecd-574b2e6bf1a3). Later: [1](https://mobbin.com/screens/8d8c58c9-d474-459f-9080-e03cd15ebc68), [2](https://mobbin.com/screens/32e0c31e-2119-4eff-86db-45a7b0ccd56c), [3](https://mobbin.com/screens/2d2b5a75-4ab5-4295-8dd4-472586f82f68)
- [Agorapulse: review a post as an approver](https://support.agorapulse.com/en/articles/10353571-how-to-review-a-post-as-an-approver) · [view a published or failed post](https://support.agorapulse.com/en/articles/10184307-how-to-view-a-published-or-failed-post)
- [Planable: content approvals](https://planable.io/guides/content-approvals-in-planable/)
- [Buffer: requesting and approving drafts](https://support.buffer.com/articles/requesting-approval-and-approving-draft-posts-57li7M8tDA.md)
- [Loomly: collaboration in Post view](https://www.loomly.com/blog/team-and-client-collaboration-in-loomlys-post-view)
