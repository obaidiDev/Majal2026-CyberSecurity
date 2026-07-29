# Majal Store — Security Assessment: Rules of Engagement

**Document ref:** MJL-RoE-2026-07 · **Classification:** Internal · **Status:** Executed

## 1. Engagement summary

Majal Store commissioned an internal security assessment of its e-commerce
application. Fifty-one testers participated under written authorisation.

| Field | Value |
|---|---|
| Target system | Majal Store web application |
| Target address | `192.168.8.198` (TCP/80) |
| Assessment date | **Wednesday 29 July 2026** |
| Authorised window | **09:00 – 11:30 UTC** |
| Authorised source range | **`192.168.8.0/24`** only |
| Test account provided | seeded lab accounts (`student01`–`student50`) |

## 2. Authorised tester addresses

Only the addresses below were issued to participating testers. Activity from
any other address is **outside this authorisation**, regardless of what it does.

| # | Address |
|---|---|
|  1 | `192.168.8.26` |
|  2 | `192.168.8.45` |
|  3 | `192.168.8.53` |
|  4 | `192.168.8.80` |
|  5 | `192.168.8.81` |
|  6 | `192.168.8.86` |
|  7 | `192.168.8.87` |
|  8 | `192.168.8.91` |
|  9 | `192.168.8.93` |
| 10 | `192.168.8.94` |
| 11 | `192.168.8.99` |
| 12 | `192.168.8.101` |
| 13 | `192.168.8.103` |
| 14 | `192.168.8.125` |
| 15 | `192.168.8.128` |
| 16 | `192.168.8.135` |
| 17 | `192.168.8.149` |
| 18 | `192.168.8.150` |
| 19 | `192.168.8.152` |
| 20 | `192.168.8.153` |
| 21 | `192.168.8.155` |
| 22 | `192.168.8.156` |
| 23 | `192.168.8.159` |
| 24 | `192.168.8.163` |
| 25 | `192.168.8.164` |
| 26 | `192.168.8.165` |
| 27 | `192.168.8.166` |
| 28 | `192.168.8.169` |
| 29 | `192.168.8.170` |
| 30 | `192.168.8.175` |
| 31 | `192.168.8.176` |
| 32 | `192.168.8.178` |
| 33 | `192.168.8.186` |
| 34 | `192.168.8.187` |
| 35 | `192.168.8.189` |
| 36 | `192.168.8.194` |
| 37 | `192.168.8.195` |
| 38 | `192.168.8.197` |
| 39 | `192.168.8.200` |
| 40 | `192.168.8.203` |
| 41 | `192.168.8.204` |
| 42 | `192.168.8.211` |
| 43 | `192.168.8.212` |
| 44 | `192.168.8.213` |
| 45 | `192.168.8.214` |
| 46 | `192.168.8.215` |
| 47 | `192.168.8.216` |

Operations support addresses, also authorised, continuously:

| Address | Role |
|---|---|
| `192.168.8.5` | Store administrator workstation |
| `192.168.8.9` | Availability monitoring (`/healthz` probe, 5-minute interval) |
| `192.168.8.7` | Backup server (accepts SSH from application hosts) |

## 3. In scope

Testers were permitted to attempt, against `192.168.8.198` only:

- SQL injection, cross-site scripting (reflected and stored), CSRF
- Command injection via the administrative network tools page
- Path traversal and insecure direct object reference (IDOR)
- Directory and content enumeration, port and service scanning

## 4. Out of scope — prohibited actions

The following were **expressly forbidden** and are grounds for treating the
activity as an incident even when performed from an authorised address:

1. **Retrieval of live customer data.** Testers demonstrating file-read or
   IDOR flaws were required to stop at the seeded proof-of-concept file. Pulling
   real customer receipts, order contents or personal details was not permitted.
2. **Establishing persistence.** No creation, modification or retention of
   accounts, credentials, scheduled tasks or any other durable access.
3. **Testing outside the authorised window** (09:00 – 11:30 UTC, 29 July 2026).
4. **Testing from outside `192.168.8.0/24`.**
5. Denial of service, data destruction, or modification of production records.

## 5. Note for the responding analyst

This document is your authorisation baseline. During the window the application
received a very high volume of genuinely hostile-looking traffic — injection
strings, traversal sequences, script payloads — **almost all of it authorised**.

Attack signatures alone cannot tell you what to escalate. Three questions can:

> **Was the source authorised? Was it inside the window? Did it stay in scope?**

An event needs to fail only one of those to matter.
