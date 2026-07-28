# Day 3 — Moving Through the Network

**Majal Initiative · Cybersecurity Bootcamp**

| | |
|---|---|
| **Duration** | ~2.5 hours (three linked labs) |
| **Environment** | Kali Linux VM |
| **Level** | Intermediate |
| **Format** | Capture analysis → network recon → exploitation |

## Overview

Today you stop being an outsider. This morning you learned the language the
network speaks; this afternoon you learn to *abuse* it. The three labs below are
one continuous operation, run against the same target range:

> **Lab 1 — Listen.** Read traffic off the wire and reconstruct what happened.
> **Lab 2 — Map.** Get fluent with Nmap by scanning the lab network.
> **Lab 3 — Break in.** Turn one weakness into a shell, and capture the flag.

Each lab feeds the next. Pay attention in the early ones — details you notice now
become weapons later. That's exactly how real intrusions work.

---

## Rules of Engagement

> ⚠️ **Only touch the lab target your instructor gives you.**
> The tools in this room are the real thing. Scanning, connecting to, or
> attacking any machine other than the assigned target — a classmate's laptop,
> the instructor's box, anything on the wider network — is out of bounds and
> ends your session. Everything here is legal *because* it's confined to a
> deliberately vulnerable target on an isolated lab network. Keep it there.

## Before You Start — Prerequisites

You'll work from **Kali Linux**. The tools you need are:

- **Wireshark** — graphical packet analysis (Lab 1)
- **Nmap** — network scanner (Lab 2 & 3)
- **netcat (`nc`)** — raw TCP connection tool (Lab 3)
- **telnet** — interactive TCP client (Lab 3)

Most ship by default on Kali. `telnet` occasionally doesn't, so make sure it's present:

```bash
sudo apt update && sudo apt install -y telnet
```

Confirm the rest are available:

```bash
which wireshark nmap nc telnet
```

> Working from your own **Windows** or **Mac** machine instead of (or alongside)
> the Kali VM? Use the equivalent commands below to get set up.

### macOS

Install with [Homebrew](https://brew.sh):

```bash
brew install wireshark nmap netcat telnet
```

Confirm:

```bash
which wireshark nmap nc telnet
```

### Windows

Install with [winget](https://learn.microsoft.com/windows/package-manager/winget/)
(or grab installers straight from wireshark.org and nmap.org):

```powershell
winget install WiresharkFoundation.Wireshark
winget install Insecure.Nmap
```

`nc` and `telnet` aren't built in on modern Windows:

- Nmap's installer already bundles **`ncat`** — a drop-in `nc` replacement.
  Wherever this lab says `nc`, use `ncat` instead.
- The Telnet client is a Windows feature you enable, not a package:

```powershell
dism /online /Enable-Feature /FeatureName:TelnetClient /All
```

Confirm what's on your PATH:

```powershell
where.exe wireshark nmap ncat telnet
```

---
---

# Lab 1 — Packet Detective 🕵️

**Duration:** ~45 min · **Tool:** Wireshark · **File:** `majal_day3_lab1.pcap`

<p><a class="dl" href="majal_day3_lab1.pcap" download>⬇ Download the packet capture — majal_day3_lab1.pcap (35 KB)</a></p>

## The Situation

Something leaked. A confidential file left the network in the clear, and we have
a packet capture of the traffic from around that time. The capture is **busy** —
normal browsing, downloads, background chatter, and encrypted sessions are all
mixed in. Your evidence is buried in that noise.

Your job is to open the capture, filter out the noise, and reconstruct exactly
what happened — then recover the proof.

## Your Objectives

Work through the capture and produce answers to each of the following. Every
answer is *in the file* — you don't need anything outside Wireshark.

1. **Get oriented.** Survey the hosts talking on this network and the mix of
   protocols in use. Which protocols carry readable content, and which are
   encrypted? Form a first impression of who's on the wire.

2. **Find the odd connection.** Among all the name lookups in the capture, one
   destination does not belong on a corporate network — it has the shape of a
   malicious site. Identify it, and identify **which host on the network reached
   out to it.** That host is your prime suspect.

3. **Catch a credential.** The suspect logged into an internal service over an
   **unencrypted** protocol. Locate that login and recover the **username and
   password** that were sent — in plain text — across the network.

4. **Recover the leaked file.** A confidential document was transferred over the
   same unencrypted protocol. Extract that file straight out of the captured
   traffic, open it, and read it. It contains a **`MAJAL{...}` token** — that
   token is your Lab 1 flag.

5. **Bonus — spot what doesn't fit.** The suspect also touched an older service
   on the network and did something unusual during that exchange. Take note of
   anything odd you see there. You may not understand its significance yet —
   write it down anyway. It will matter this afternoon.

## Deliverables

Record and be ready to submit:

- [ ] The suspicious destination and the suspect host's IP
- [ ] The recovered username and password
- [ ] The **`MAJAL{...}`** flag from the leaked file
- [ ] (Bonus) A note on the odd exchange from Objective 5

## Analyst's Habit

Real analysts never scroll through every packet — they **filter**. If you find
yourself lost in thousands of frames, you're doing it the hard way. Narrow the
view down to the protocol or host you care about, then read only what's left.

---
---

# Lab 2 — Mapping the Target with Nmap 🗺️

**Duration:** ~45 min · **Tool:** Nmap

## The Situation

This lab has one goal: get you **fluent with Nmap**. You have a foothold on the
lab network — a whole subnet in front of you. Before you can attack anything on
a network, you need to know how to look at it: which hosts are alive, which
ports are open, and *what software* is answering on each one. This is
reconnaissance, and it's the step amateurs rush and professionals never skip.

Nmap is the standard tool for this. The rest of this lab teaches you its most
important options; the tasks at the end put them to work, one command at a
time. There's no fixed target here and nothing to carry forward — just you,
the network, and the scanner.

## Understanding Nmap

At its simplest, Nmap takes a target and reports which ports are **open**,
**closed**, or **filtered**, and — with the right options — what's running behind
them. The general shape of a command is:

```bash
nmap [options] TARGET_IP
```

The power is all in the options. Here are the ones that matter.

### Host Discovery

| Flag | Meaning |
|------|---------|
| `-sn` | **Ping scan.** Discover which hosts are alive *without* scanning ports. Use it first to map a whole subnet (e.g. `nmap -sn 192.168.10.0/24`) and see who's up. |
| `-Pn` | **Skip host discovery.** Treat the target as online even if it doesn't answer pings. Useful when a firewall drops ping but the host is really there. |

### Choosing Which Ports to Scan

| Flag | Meaning |
|------|---------|
| `-p 80` | Scan a **specific port**. |
| `-p 21,22,80` | Scan a **list** of ports. |
| `-p 1-1000` | Scan a **range** of ports. |
| `-p-` | Scan **all 65,535 ports**. Thorough, but slower. |
| `-F` | **Fast scan** — only the ~100 most common ports. |
| _(default)_ | With no `-p`, Nmap scans the top 1,000 most common ports. |

### Digging Into What's Running

This is where recon gets interesting — going from "port 80 is open" to "port 80
is running *this exact software, this exact version*."

| Flag | Meaning |
|------|---------|
| `-sV` | **Service & version detection.** Probes each open port to identify the service *and its version number* — e.g. not just "SSH" but "OpenSSH 4.7p1". This is the difference between knowing a door exists and knowing exactly which lock is on it. |
| `-O` | **OS detection.** Guesses the target's operating system from its network fingerprint. |
| `-A` | **Aggressive scan.** Turns on version detection, OS detection, default scripts, and traceroute all at once. The loud, everything-at-once option. |
| `--script <name>` | **Run an NSE script.** Nmap ships hundreds of small scripts (the Nmap Scripting Engine) that go beyond simple port checks — probing for specific misconfigurations, default credentials, exposed shares, or known weaknesses in a service. Example: `--script http-title` fetches the page title from a web server, or `--script banner` grabs the raw banner a service announces itself with. Browse them in `/usr/share/nmap/scripts/`. |

### Scan Types (how the probing is done)

| Flag | Meaning |
|------|---------|
| `-sS` | **SYN scan.** The default when run as root — fast and relatively quiet. |
| `-sT` | **TCP connect scan.** Completes a full connection; used when you can't run as root. |
| `-sU` | **UDP scan.** For UDP services (DNS, DHCP, SNMP…), which the TCP scans miss. |

### Speed and Output

| Flag | Meaning |
|------|---------|
| `-T0` … `-T5` | **Timing template.** `-T0` is glacially slow and stealthy; `-T4` is a good fast default on a local lab; `-T5` is fastest and loudest. |
| `-oN file.txt` | Save **normal** output to a file. |
| `-oG file.txt` | Save **greppable** output (easy to search later). |
| `-v` | **Verbose** — show progress and results as they come in. |

## Your Objectives

Work through these one at a time. Each task is one nmap invocation — the point
is to get the command right and read what it hands back.

1. **Task 1 — Scan the local network.** Run a ping sweep across the lab
   subnet and see which hosts answer. This is host discovery — the first
   move on any network you don't already know.
2. **Task 2 — Port scan a specific IP.** Pick one live IP from your sweep and
   enumerate its open ports. Don't assume the defaults are enough — consider
   scanning beyond the top 1,000.
3. **Task 3 — Service & version scan that same IP.** Take the IP from Task 2
   and identify the **service and exact version number** behind each open
   port you found. This is the single most valuable thing recon gives you —
   write the versions down precisely.

### Optional — go further

4. **Task 4 — Save your work.** Output a scan to a file (`-oN` / `-oG`) instead
   of just the terminal. A saved scan is a habit worth building early.
5. **Task 5 — OS fingerprint.** Run OS detection (`-O`) against your chosen IP
   and compare its guess against what you already inferred from the open
   ports and versions.

> 🧭 **Want more reps?** [TryHackMe's Nmap room](https://tryhackme.com/room/nmap02)
> is a solid next stop for extra practice once you're comfortable with the
> tasks above.

## Deliverable — Recon Notes

Fill this in as you go.

**Task 1 — live hosts found**

| IP | Notes |
|----|-------|
|    |       |

**Tasks 2–3 — chosen IP, ports & versions**

| Port | Protocol | Service | **Version** |
|------|----------|---------|-------------|
|      |          |         |             |
|      |          |         |             |

> 🔎 Look hard at those **version numbers**. Old software is old for a reason,
> and a version string is often the single most valuable thing recon gives you.

---
---

# Lab 3 — Pop the Box 💥

**Duration:** ~60 min · **Tools:** Nmap, telnet, netcat (`nc`)

## The Objective

This is the payoff. You are going to **break into the target machine at
`TARGET_IP`, gain a shell on it, and capture a flag that lives on the machine
itself.**

The flag is a **`MAJAL{...}`** token your instructor has placed somewhere on the
target's filesystem. To read it, you must first get command execution on the box
— then find and read the file. Reaching a shell *is* the challenge; the flag is
your proof you succeeded.

## Step 1 — Point Your Recon at the Target

You already met the tool you need for this in Lab 2. Before you attack anything,
re-examine the target and get its services and **version numbers** in front of
you. The way in is hiding in a version string — a service running software old
enough to have a well-known, published weakness.

> Lean on the flags from Lab 2 that reveal **service versions** and let you probe
> **individual services**. If you skipped straight here, go back and get a
> precise version inventory first — you cannot exploit what you haven't
> identified.

## Step 2 — Investigate What You Found

Your recon gave you a list of services and, crucially, **version numbers**. That
version inventory is your lead list. Now you turn detective.

Take the versions you identified and **research them.** Software versions are
public knowledge, and so are their weaknesses — security researchers document
them, catalogue them, and publish how they work. One of the services on this box
is running a version old enough that its problems are very well known. Your task
is to find out *which* service that is, *what* is wrong with it, and *how* that
weakness is triggered.

- Search for each service name together with its exact version number.
- Look for the words "vulnerability," "exploit," or "known issues."
- When you find the weakness, read how it's actually triggered — what has to be
  sent to the service, and what happens when it is.

Do this properly and you'll know exactly what to do next. The tools below are how
you'll act on what you learn.

## Step 3 — The Tools You'll Use

### `telnet` — talking to a service by hand

`telnet` opens a **raw TCP connection to a port and lets you type at it**. It was
originally a remote-login protocol (long since abandoned as insecure because it
sends everything in plain text — exactly the kind of thing you exploited in Lab
1), but its real usefulness today is as a manual way to *speak a text-based
protocol directly.*

You connect like this:

```bash
telnet TARGET_IP <port>
```

Once connected, whatever you type is sent straight to the service, and you can
issue the service's own commands by hand. Many text-based services expect typed
commands, and telnet lets you send them yourself, exactly as you choose. That
control is the point: it lets you hand a service input a normal, well-behaved
client never would.

### `netcat` (`nc`) — the TCP Swiss Army knife

`nc` is the go-to tool for **reading from and writing to network connections**.
In its simplest form it connects to a port and hands you an interactive session
with whatever is on the other end:

```bash
nc TARGET_IP <port>
```

If there's a shell listening on that port, `nc` drops you straight into it —
anything you type is run on the remote machine, and its output comes back to you.
That makes it the tool of choice for interacting with a shell once one becomes
available to you. (`nc` can also *listen* for incoming connections with `-l` —
worth remembering; which direction you need depends on the situation.) On
Windows, use `ncat` in place of `nc` — same idea, same flags.

Once you have a shell, confirm who you are with:

```bash
whoami
id
```

## Your Objectives

1. **Confirm your target.** Re-scan and pin down the service and version you're
   going after.
2. **Research the weakness.** Using the version you identified, find out what's
   publicly known about it and how it's triggered.
3. **Exploit it.** Use the tools above to interact with the weak service by hand
   and turn it into command execution on the box.
4. **Get a shell and confirm access.** Verify you can run commands on the target
   (check `whoami` / `id`).
5. **Capture the flag.** Explore the filesystem, locate the `MAJAL{...}` file
   your instructor planted, and read it.

## Deliverable

- [ ] A shell on the target (show the output of `whoami` / `id`)
- [ ] The **`MAJAL{...}`** flag from the machine

## Something to Carry Into Day 5

Everything you just did left tracks — an odd interaction with a service, a
connection to an unusual port, a shell spawned by a process that had no business
spawning one. On Friday you switch sides and become the defender. Ask
yourself now: **what would this attack have looked like in the logs?** Hold that
thought.
