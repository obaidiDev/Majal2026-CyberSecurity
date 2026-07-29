# Day 5 — The Other Side of the Glass

On Wednesday 29 July, Majal Store ran an **authorised security assessment**.
Fifty-one testers, one morning, full written permission.

Someone else used that window as cover.

You are the incident response team. You have the logs. Work out what happened.

> The traffic in `access.log` is real. Sixteen thousand of these lines are
> **your own attacks from Day 4** — your payloads, your addresses, your
> mistakes. That is the haystack.

## Open this first

**`console.html`** — the investigation console. Double-click it; it runs offline
in the browser with no install and no server.

- **Alert queue** on the left: five cases, Story Mode through Nightmare
- **Timeline** across the top: drag to zoom, or switch to *by hour of day*
- **Click any value** to filter by it · **shift-click** to exclude it
- **`+case`** pins an event to your case timeline with its citation attached
- **Report** panel on the right: your answers, checked instantly

## The evidence

| File | What it is |
|---|---|
| `SCOPE.md` | **Rules of engagement.** Read this before anything else. |
| `access.log` | Web server access log, 26–29 July |
| `auth.log` | Application authentication events — **the only source with usernames** |
| `evidence-01-phish.eml` | A reported email. Check the headers carefully. |
| `evidence-02-assessment-notice.eml` | Internal notice about the assessment |
| `evidence-03-bash_history.txt` | Shell history recovered from the server |
| `evidence-04-store.db` | The store database (open with DB Browser for SQLite) |
| `evidence-05-c2.pcap` | A network capture (open with Wireshark) |

Everything you need is in these files. Nothing you need is outside them.

## How this is scored

Every field takes an answer **and a confidence level**.

| | |
|---|---|
| Correct, high confidence | **+2** |
| Correct, moderate or low | **+1** |
| Correct *cannot be determined* | **+3** |
| Wrong, low confidence | **−1** |
| **Wrong, high confidence** | **−3** |

> **A confidently wrong answer scores below "I don't know."**

That is not a gimmick. An analyst who invents a source IP does more damage than
one who says they are not sure. Some fields genuinely **cannot be answered** from
the evidence — finding those is worth more than any other single field.

Three attempts per field. Your work is saved in the browser as you go.

## Two things worth knowing before you start

**Almost every hostile-looking event in this log is authorised.** Searching for
attack signatures will return dozens of addresses and will not tell you which
one matters. Three questions will:

> Was the source authorised? Was it inside the window? Did it stay in scope?

**Loud is not the same as dangerous.** The noisiest thing in the dataset achieved
very little. The quietest thing in it is the actual breach.

---

*Instructor: the answer key and pack generators are deliberately kept out of this
public repository. See `.gitignore` in this directory.*
