# Lab 1 — Linux Command-Line Foundations

**Majal Initiative · Cybersecurity Bootcamp**

| | |
|---|---|
| **Duration** | 60–90 minutes |
| **Environment** | Kali Linux VM (terminal) |
| **Level** | Beginner → Intermediate |
| **Format** | Task-style exercises with a hint line each |

## Objectives

By the end of this lab you can navigate a Linux system confidently, manipulate files and permissions, chain commands into useful pipelines, inspect files for integrity and metadata, and run a small log investigation — the core muscle memory every blue-team analyst relies on daily.

## Setup

Open a terminal in your Kali VM. Everything runs from there — no extra installs required. Where a command needs elevated rights, use `sudo` (Kali's default user has sudo access). If you get stuck, `man <command>` or `<command> --help` is always available.

> **How to use this lab:** Skim Section 0 and the cheat sheet first — they're your reference. Then work the exercises: read each task, try to build the command yourself, and check the hint only if you need a nudge. The point is to *derive* the command, not memorize it.

---

## 0. Anatomy of a Command

Almost every Linux command follows the same grammar. Learn the *shape* once and you can read a command you've never seen before.

```text
  ls   -l -a   --color=auto        /var/log
  │    │  │    │                   │
  │    │  │    │                   └─ argument  — what to act on (file, path, target)
  │    │  │    └─ long option with a value
  │    │  └─ short option (flag)
  │    └─ short option (flag)
  └─ command — the program you're running
```

**General template:**
```text
command  [-short]  [--long]  [--option=value]  [argument ...]
```

| Piece | Looks like | Notes |
|---|---|---|
| **Command** | `ls`, `grep`, `nmap` | The program itself. |
| **Short flag** | `-l`, `-a`, `-r` | Single dash, single letter. **Combinable:** `-la` = `-l -a`. |
| **Long flag** | `--all`, `--help` | Double dash, a whole word. Self-documenting and easier to read in scripts. |
| **Flag with a value** | `-n 20`, `--delimiter=:` | Some flags need input right after them. |
| **Argument / operand** | `/var/log`, `file.txt` | The thing the command acts on — often a file, path, or target. |

**When you're unsure what a command or flag does:**
```text
man <command>        # full manual page (q to quit)
<command> --help     # quick summary of options
```

**Combining commands** — the real power of the shell comes from wiring commands together:
```text
cmd1 | cmd2       pipe: send cmd1's output into cmd2
cmd  > file       redirect output to a file (overwrite)
cmd  >> file      redirect output to a file (append)
cmd  2> file      redirect only errors (stderr)
cmd1 && cmd2      run cmd2 only if cmd1 succeeded
cmd1 ;  cmd2      run cmd1 then cmd2, regardless
cmd  &            run cmd in the background
$(cmd)            substitute a command's output into another command
```

---

# Cheat Sheet — Linux Command Reference

*Every command below is used somewhere in this lab. Flags shown are the ones worth memorizing; run `man <cmd>` for the full list.*

### Navigation & files

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `ls` | `-l` long · `-a` all/hidden · `-h` human sizes · `-S` sort by size · `-t` sort by time · `-r` reverse · `-R` recursive | List directory contents | `ls -lah /var/log` |
| `cd` | `<path>` go there · `~` home · `-` previous dir · `..` up one | Change directory | `cd /var/log` then `cd -` |
| `pwd` | — | Print current working directory | `pwd` |
| `find` | `<path>` start dir · `-type f\|d` · `-name '*.log'` (`-iname` = case-insensitive) · `-mtime -1` · `-size +10M` · `-exec <cmd> {} \;` | Search the filesystem | `find /var/log -type f -name '*.log' -mtime -7` |
| `which` / `whereis` | `<cmd>` | Locate a program (path / path + man + source) | `which nmap` |
| `cp` `mv` `rm` `mkdir` | `-r` recursive · `-i` prompt · `-f` force · `mkdir -p` make parents | Copy / move / remove / make dir | `cp -r dir/ backup/` |

> ⚠️ `rm -rf` deletes with no confirmation and no undo.

### Reading & editing

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `cat` | `-n` number lines | Print / concatenate files | `cat -n /etc/hostname` |
| `less` | `/pattern` search · `n` next · `G` end · `g` top · `q` quit | Scrollable pager | `less /etc/os-release` |
| `head` / `tail` | `-n <N>` line count · `tail -f` follow live · `tail -F` follow through rotation | Show top / bottom of a file | `tail -n 20 /var/log/syslog` |
| `echo` | `> file` write · `>> file` append | Print text | `echo "notes" > notes.txt` |
| `nano` | `Ctrl+O` save · `Ctrl+X` exit | Beginner-friendly editor | `nano notes.txt` |
| `vim` | `i` insert · `Esc` · `:wq` save+quit · `:q!` quit no save | Modal editor | `vim notes.txt` |

### Permissions & privilege

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `whoami` / `id` | — | Current username / uid, gid, groups | `id` |
| `sudo` | `-l` list allowed · `-u <user>` run as user · `-i` root login shell | Run a command as root | `sudo -l` |
| `su` | `<user>` switch · `-` load login environment | Switch user | `su - root` |
| `chmod` | Octal `755` · symbolic `u+x,go-w` · `-R` recursive | Change permissions | `chmod 744 test.sh` |
| `chown` | `user:group` · `-R` recursive | Change ownership | `chown kali:kali file` |

**Octal quick reference**

| Digit | Permission | Meaning |
|---|---|---|
| `7` | `rwx` | read + write + execute |
| `6` | `rw-` | read + write |
| `5` | `r-x` | read + execute |
| `4` | `r--` | read only |

*Values add up: `r=4  w=2  x=1`. Three digits = owner, group, others.*

### Package management (apt)

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `apt` | `update` · `upgrade` · `search <term>` · `show <pkg>` · `install <pkg>` · `remove <pkg>` · `list --installed` | Manage packages | `sudo apt update` |
| `dpkg` | `-l` list installed · `-L <pkg>` files placed · `-S <file>` owning package | Low-level package queries | `dpkg -S /usr/bin/nmap` |
| `pip` / `pip3` | `list` · `show <pkg>` · `install <pkg>` | Manage Python packages | `pip list` |

### Text processing (the SOC power tools)

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `grep` | `-i` ignore case · `-c` count · `-n` line numbers · `-r` recursive · `-v` invert · `-o` matched part only · `-E` extended regex | Search text by pattern | `grep -in "failed password" /var/log/auth.log` |
| `cut` | `-d<char>` delimiter · `-f<N>` field(s) e.g. `-f1,3` · `-c<range>` by character | Extract columns | `cut -d: -f1 /etc/passwd` |
| `sort` | `-n` numeric · `-r` reverse · `-u` unique · `-k<N>` by column · `-h` human-numeric | Order lines | `sort -u names.txt` |
| `uniq` | `-c` prefix counts · `-d` only dupes · `-u` only uniques | Collapse *adjacent* duplicates (sort first!) | `sort ips.txt \| uniq -c` |
| `wc` | `-l` lines · `-w` words · `-c` bytes | Count | `wc -l /etc/passwd` |
| `awk` | `-F<sep>` field separator · `'{print $1,$3}'` · `'$3>100'` filter · `'END{print NR}'` row count | Field-aware text processor | `awk -F: '{print $1, $6}' /etc/passwd` |
| `sed` | `'s/old/new/'` first · `'s/old/new/g'` all · `-i` edit in place · `-n '5,10p'` line range | Stream editor / find-replace | `sed 's/a/@/g' /etc/hostname` |

### Pipes, redirection & chaining

| Symbol | What it does | Example |
|---|---|---|
| `\|` | Pipe stdout into the next command | `ps aux \| grep bash` |
| `>` / `>>` | Redirect output — overwrite / append | `ip a > netinfo.txt` |
| `2>` | Redirect errors only (stderr) | `ls /nope 2> errors.txt` |
| `&>` | Redirect stdout *and* stderr | `cmd &> all.log` |
| `<` | Read input from a file | `sort < names.txt` |
| `tee` | Write to file *and* screen (`-a` append) | `cmd \| tee out.txt` |
| `xargs` | Turn input lines into arguments (`-I{}` placeholder · `-n1` one per run) | `ls /etc/*.conf \| xargs file` |
| `;` | Run in sequence regardless of result | `cmd1 ; cmd2` |
| `&&` | Run next only if previous succeeded | `apt update && apt upgrade` |
| `\|\|` | Run next only if previous failed | `cmd1 \|\| echo "failed"` |
| `&` | Run in background | `long-scan &` |
| `$(cmd)` | Substitute a command's output | `echo "Host: $(hostname)"` |

### Processes & system

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `ps` | `aux` all w/ user, %cpu, %mem · `-ef` alternate view | Snapshot of running processes | `ps aux \| grep ssh` |
| `top` / `htop` | `q` to quit (`htop` is friendlier) | Live process monitor | `htop` |
| `kill` | `<pid>` graceful (TERM) · `-9 <pid>` force (KILL) · `pkill <name>` by name | Terminate a process | `kill -9 1337` |
| `df` | `-h` human-readable · `-i` inodes | Disk free per filesystem | `df -h` |
| `du` | `-h` sizes · `-s` summary total | Disk usage per file/dir | `du -sh /var/log` |
| `systemctl` | `status` · `is-active` · `start`/`stop`/`restart` · `enable`/`disable` | Manage services | `systemctl status ssh` |

### Networking basics

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `ip` | `a` addresses · `r` routes · `link` interfaces | Network configuration | `ip a` |
| `ss` | `-t` TCP · `-u` UDP · `-l` listening · `-p` process (sudo) · `-n` numeric | Show sockets / open ports | `sudo ss -tulpn` |
| `ping` | `-c <N>` send N then stop | Reachability test | `ping -c 4 8.8.8.8` |
| `dig` | `+short` answer only · `MX`/`TXT` record type · `-x <ip>` reverse | DNS lookup | `dig example.com +short` |
| `nslookup` | `<domain>` | Simpler DNS lookup | `nslookup example.com` |
| `curl` | `-I` headers only · `-o <file>` save · `-L` follow redirects · `-s` silent · `-X <METHOD>` | HTTP client | `curl -I http://example.com` |
| `wget` | `-O <file>` save as · `-c` resume | Download files | `wget -O out.zip <url>` |
| `ssh` / `scp` | `user@host` · `-p <port>` (ssh) · `-P <port>` (scp) | Remote shell / remote copy | `scp file user@host:/tmp` |

### File inspection, hashes & metadata

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `sha256sum` | `-c <file>` verify against stored hashes | SHA-256 hash of a file | `sha256sum /bin/ls` |
| `md5sum` | `-c <file>` verify | MD5 hash (legacy — collision-prone) | `md5sum sample.bin` |
| `file` | `<path>` | Detect true type from magic bytes, not extension | `file /bin/ls` |
| `stat` | `<path>` | Full metadata + Access/Modify/Change (MAC) times | `stat /bin/ls` |
| `strings` | `-n <N>` minimum length | Printable text inside a binary | `strings -n 6 /bin/ls` |
| `exiftool` | `<file>` | Rich metadata (camera, GPS, author, timestamps) | `exiftool photo.jpg` |

### Archives

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `tar` | `-c` create · `-x` extract · `-z` gzip · `-v` verbose · `-f <file>` filename · `-t` list | Create/extract archives | `tar -czvf out.tar.gz dir/` |
| `zip` / `unzip` | `-r` recursive (zip) · `-l` list contents (unzip) | Zip archives | `unzip -l file.zip` |

### Handy log helpers

| Command | Key flags & arguments | What it does | Example |
|---|---|---|---|
| `journalctl` | `-u <svc>` one service · `-f` follow · `--since "1 hour ago"` · `-p err` by priority | systemd journal (alternative to `/var/log`) | `journalctl -u ssh --since today` |
| `history` | — | Your command history | `history \| grep sudo` |

---

# Lab Exercises

## 1. Filesystem Navigation & Finding Files

Knowing where you are and how to move around is step zero for everything else.

**1.1** — Print your current working directory, then list everything in it *including hidden files*, in long format.
> *Hint: two commands. Hidden files start with a dot; `ls` has flags for "all" and "long".*

**1.2** — Navigate to `/var/log`, then return to your home directory in a single command (without typing the full path).
> *Hint: `cd` with no argument, or the `~` shortcut.*

**1.3** — Starting from your home directory, find every file (not directory) modified in the last 24 hours.
> *Hint: `find`, with `-type` and `-mtime`. A negative number means "within the last N days".*

**1.4** — Locate the full path of the `nmap` binary on the system.
> *Hint: `which` tells you what runs when you type it; `whereis` finds related files too.*

---

## 2. Reading & Editing Files

**2.1** — Display the last 20 lines of `/var/log/syslog`.
> *Hint: `tail` has a flag for line count.*

**2.2** — Open `/etc/os-release` in a pager you can scroll and search through, then quit.
> *Hint: `less`. Press `/` to search, `q` to quit.*

**2.3** — Create a file called `notes.txt` in your home directory containing a single line of text, without opening an editor.
> *Hint: `echo` plus output redirection (`>`).*

---

## 3. Permissions & Privilege

Permissions decide who can read, write, or execute a file. Understanding — and checking — privilege is also a real reconnaissance step. *(MITRE ATT&CK: T1548 — Abuse Elevation Control Mechanism; T1033 — System Owner/User Discovery.)*

**3.1** — Show your current username, your user/group IDs, and the groups you belong to.
> *Hint: `whoami` for the name; `id` for the full picture.*

**3.2** — List what commands your user is permitted to run via `sudo` — without actually running anything.
> *Hint: `sudo` has an `-l` (list) flag. This is exactly what an attacker checks after landing on a box.*

**3.3** — Create a script file `test.sh`, then give it read/write/execute for the owner and read-only for group and others — using octal notation.
> *Hint: `touch` to create, then `chmod` with a three-digit number. Owner rwx = 7.*

---

## 4. Package Management

On Kali (Debian-based), `apt` installs and manages software.

**4.1** — Refresh the package index, then search the repositories for a package related to "exiftool".
> *Hint: `apt update` refreshes; `apt search <term>` searches.*

**4.2** — Show detailed info about the `nmap` package (version, description, dependencies) *without* installing anything.
> *Hint: `apt show <package>`.*

**4.3** — List the Python packages currently installed via pip.
> *Hint: `pip list` (or `pip3 list`).*

---

## 5. Text Processing — the Power Tools

This is where the command line becomes a superpower. Grep, cut, sort, uniq, awk, and sed are what turn a 100,000-line log into a two-line answer.

**5.1** — Count how many lines in `/etc/passwd` mention `/bin/bash` as the login shell.
> *Hint: `grep` the pattern, then pipe to `wc -l`. Or use grep's own count flag.*

**5.2** — From `/etc/passwd`, print *only* the username (the first field). The file is colon-delimited.
> *Hint: `cut` with `-d` (delimiter) and `-f` (field).*

**5.3** — Take that list of usernames, sort it alphabetically, and remove duplicates.
> *Hint: `sort`, then `uniq` — or `sort -u` in one step.*

**5.4** — Using `awk`, print the username and the user's home directory (fields 1 and 6) from `/etc/passwd`, separated by a space.
> *Hint: `awk -F: '{print $1, $6}'` — `-F` sets the field separator.*

**5.5** — Use `sed` to display `/etc/hostname` with every occurrence of the letter `a` replaced by `@` (on screen only — don't modify the file).
> *Hint: `sed 's/a/@/g'`. The `g` makes it global (all occurrences per line).*

---

## 6. Pipes, Redirection & xargs

Small tools, chained together, solve big problems.

**6.1** — Redirect the output of `ip a` into a file called `netinfo.txt`, then *append* the output of `date` to the same file.
> *Hint: `>` creates/overwrites, `>>` appends.*

**6.2** — Run a command that produces an error and send *only* the error output to a file called `errors.txt` (e.g. `ls /nonexistent`).
> *Hint: standard error is file descriptor `2`. `2>` redirects it.*

**6.3** — Find every `.log` file under `/var/log` and count how many there are, in a single pipeline.
> *Hint: `find … -name '*.log'` piped into `wc -l`.*

**6.4** — Use `xargs` to run `file` on every `.conf` file in `/etc` (top level only).
> *Hint: `ls /etc/*.conf | xargs file` — `xargs` turns input lines into arguments.*

---

## 7. Processes & System

**7.1** — Show all running processes in full detail, then filter that list down to only lines mentioning your shell.
> *Hint: `ps aux` piped into `grep`.*

**7.2** — Display how much disk space is used and free on all mounted filesystems, in human-readable units.
> *Hint: `df` with the `-h` flag.*

**7.3** — Check whether the `ssh` service is currently active.
> *Hint: `systemctl status ssh` (or `is-active`).*

---

## 8. Networking Basics

A foundation for Lab 3. These four commands answer "what's my address, where does traffic go, what's listening, and can I reach that host?"

**8.1** — Show your VM's IP address(es) and its routing table.
> *Hint: `ip a` for addresses, `ip r` for routes.*

**8.2** — List every listening TCP and UDP port on the machine, numerically, with the owning process.
> *Hint: `ss -tulpn` (prefix with `sudo` to see process names). This is a core SOC check — you're asking "what's exposed on this host?"*

**8.3** — Resolve the IP address(es) of `example.com`.
> *Hint: `dig example.com +short` or `nslookup example.com`.*

**8.4** — Fetch just the HTTP response *headers* from `http://example.com`.
> *Hint: `curl -I` (capital i) returns headers only.*

---

## 9. File Inspection — Hashes & Metadata

Analysts constantly ask three questions about a file: *what is it, has it changed, and what does it reveal?* These commands answer all three. *(MITRE ATT&CK: T1036 — Masquerading is often caught exactly this way.)*

**9.1** — Generate the SHA-256 hash of `/bin/ls`.
> *Hint: `sha256sum <file>`.*

**9.2** — Determine the actual file *type* of `/bin/ls` (don't trust the extension — trust the content).
> *Hint: `file <path>` reads the file's magic bytes.*

**9.3** — Show the full metadata for `/bin/ls`, including its access, modify, and change timestamps.
> *Hint: `stat <file>` — those MAC times matter in forensics.*

**9.4** — Extract any human-readable text strings of length 6 or more from `/bin/ls`.
> *Hint: `strings -n 6 <file>`.*

---

## Capstone — Live Log Investigation

You've been running `sudo` throughout this lab. Every one of those actions was logged. Now investigate your own trail — this is triage in miniature, and it's exactly the workflow of a SOC analyst. Work against the live logs on your Kali box (`/var/log/auth.log`).

> If `auth.log` is empty or missing on your build, try `journalctl` instead (see cheat sheet).

**C.1** — Identify which file in `/var/log` is currently the *largest*.
> *Hint: `ls -lS /var/log` sorts by size; or `du -h /var/log/* | sort -h`.*

**C.2** — Show every line in `/var/log/auth.log` that records a `sudo` command being run.
> *Hint: `grep sudo /var/log/auth.log`.*

**C.3** — Count how many times `sudo` was invoked in that log.
> *Hint: pipe the previous result into `wc -l`, or use `grep -c`.*

**C.4** — Extract just the timestamps (first three fields) of those sudo events, so you have a clean timeline.
> *Hint: `grep sudo … | awk '{print $1, $2, $3}'`.*

**C.5** — Pick any binary you inspected in Section 9, hash it, and note the value. In a real investigation you'd compare this against a known-good source or a threat-intel database to confirm the file hasn't been tampered with.
> *Hint: `sha256sum /bin/ls` — reflect on why an analyst does this.*

**Wrap-up question:** In two or three sentences, describe what your sudo timeline tells you about what happened on this machine during the lab. That short narrative *is* a triage note — the same thing you'll write in a ticket in the SOC lab.

---

*Majal Initiative — hands-on IT & cybersecurity training.*
