/* ==========================================================================
   Majal Day 1 — structured content.
   Everything is a plain window global so file:// works with no fetch().
   ========================================================================== */
window.MAJAL = window.MAJAL || {};

/* ---- Block 1: diagnostic ------------------------------------------------ */
MAJAL.diagnostic = [
  { q: "What does an IP address identify?",
    a: "A host / network interface — which machine (or which network) a packet is going to or from." },
  { q: "What does a port number identify?",
    a: "Which service or application on that machine — one host runs many services, the port picks one." },
  { q: "What port does HTTPS use?", a: "443" },
  { q: "What port does SSH use?", a: "22" },
  { q: "In one sentence, what's the difference between TCP and UDP?",
    a: "TCP is connection-oriented: a handshake, ordered delivery, acknowledgements — reliable. UDP is connectionless: fire-and-forget, no delivery guarantee, but fast." },
  { q: "What does DNS do?",
    a: "Translates human names (example.com) into IP addresses. It's the phone book of the internet." },
  { q: "In Linux, what does `ls -la` show that plain `ls` doesn't?",
    a: "Hidden dotfiles (-a) and the long format (-l): permissions, owner, group, size, and modification time." },
  { q: "What does `grep` do?",
    a: "Searches text (files or a stream) and prints the lines that match a pattern." },
  { q: "What is /etc/passwd?",
    a: "A world-readable file listing the user accounts on a Linux system — usernames, UIDs, home directories, login shells. (Passwords haven't lived here for decades; they're in /etc/shadow.)" },
  { q: "What is a hash, and how is it different from encryption?",
    a: "A hash is a one-way fingerprint of data — you cannot reverse it back to the original. Encryption is two-way — with the key you get the original back." },
  { q: "What's the difference between authentication and authorization?",
    a: "Authentication proves who you are. Authorization decides what that proven identity is allowed to reach." },
  { q: "What does a firewall decide?",
    a: "Whether to allow or block a given piece of traffic, based on rules — addresses, ports, protocols, direction." },
  { q: "What does \"persistence\" mean for malware?",
    a: "Its ability to survive a reboot and keep (or regain) execution — via services, scheduled tasks, startup entries, etc." },
  { q: "Have you used a virtual machine before?", a: "yes / no", yesno: true },
  { q: "Have you spent more than 10 minutes total of your life in a command line?", a: "yes / no", yesno: true }
];

/* ---- Block 2.1: controls -> C/I/A buckets ------------------------------- */
/* buckets a chip legitimately belongs to. Several belong to more than one. */
MAJAL.chips = [
  { t: "BitLocker (disk encryption)", b: ["C"] },
  { t: "LUKS encryption",             b: ["C"] },
  { t: "MFA",                          b: ["C"] },
  { t: "Least privilege",              b: ["C"] },
  { t: "Data masking",                 b: ["C"] },
  { t: "Badge reader",                 b: ["C"] },
  { t: "Air gap",                      b: ["C"] },
  { t: "SHA-256 checksum",             b: ["I"] },
  { t: "Digital signature",            b: ["I"] },
  { t: "Input validation",             b: ["I"] },
  { t: "Append-only logs",             b: ["I"] },
  { t: "ECC memory",                   b: ["I"] },
  { t: "RAID-5",                       b: ["A"] },
  { t: "Rate limiting",                b: ["A"] },
  { t: "DDoS scrubbing",               b: ["A"] },
  { t: "RTO / RPO planning",           b: ["A"] },
  { t: "Failover cluster",             b: ["A"] },
  /* --- the multi-bucket chips (the defense-in-depth beat) --- */
  { t: "TLS",                b: ["C", "I"] },
  { t: "HMAC",               b: ["I"] },
  { t: "WORM media",         b: ["I", "A"] },
  { t: "Immutable backups",  b: ["I", "A"] },
  { t: "Log forwarding",     b: ["I", "A"] },
  { t: "Separation of duties", b: ["C", "I"] }
];
MAJAL.bucketNames = { C: "Confidentiality", I: "Integrity", A: "Availability" };

/* ---- Block 2.1: evidence-first inference -------------------------------- */
/* Show only the analyst observation; student picks the mechanism; row unfolds */
MAJAL.evidence = [
  // Confidentiality
  { prop: "C",
    obs: ["account SVC_BACKUP  reads  \\\\FS01\\HR\\  — 4,412 files in 90 seconds",
          "first access to this share in 400 days of history"],
    options: ["Credential theft", "Excessive permissions", "Eavesdropping", "Physical theft"],
    answer: "Excessive permissions",
    row: "A backup service account should never touch HR. No exploit was needed — the share was simply reachable by an account that had no business there, and the mass read is the data being staged. The attack here is a permission that should not have existed." },
  { prop: "C",
    obs: ["user jsmith  authenticated from Riyadh 09:14",
          "user jsmith  authenticated from Rotterdam 10:02  (1h 02m later)"],
    options: ["Credential theft", "Insider disclosure", "Misconfiguration", "Side channel"],
    answer: "Credential theft",
    row: "Impossible travel. One human cannot be in two continents an hour apart, so two parties are using one identity. The password is in someone else's hands." },
  { prop: "C",
    obs: ["workstation WKS-114 -> 185.220.101.4  :80",
          "3.2 GB outbound in a single 40-minute session"],
    options: ["Data exfiltration", "DDoS", "Replay attack", "Config drift"],
    answer: "Data exfiltration",
    row: "Workstations pull data down; they do not push gigabytes up to a random host on plain HTTP. Large, one-directional outbound volume is data leaving. 'Did it leave?' is the first question in every serious investigation." },
  { prop: "C",
    obs: ["ARP table on 10.0.0.57:",
          "gateway 10.0.0.1  now shares a MAC with host 10.0.0.99"],
    options: ["ARP spoofing (MITM)", "DNS failure", "Privilege escalation", "Ransomware"],
    answer: "ARP spoofing (MITM)",
    row: "Two IPs claiming one MAC means a host has inserted itself as the gateway. Traffic now flows through the attacker, who can read — and alter — everything on the wire." },
  { prop: "C",
    obs: ["S3 bucket policy 'company-backups':",
          "\"Principal\": \"*\",  \"Action\": \"s3:GetObject\""],
    options: ["Misconfiguration", "Insider disclosure", "Brute force", "Supply chain"],
    answer: "Misconfiguration",
    row: "No attacker required. Principal:* means the whole internet can read the backups. The most common cloud breach is not a hack — it's a setting." },
  { prop: "C",
    obs: ["03:31  finance-pc  pos.exe",
          "2,000 card-shaped strings read from process memory"],
    options: ["Memory scraping (data in use)", "Eavesdropping on the wire", "Log tampering", "Replay"],
    answer: "Memory scraping (data in use)",
    row: "Data at rest is encrypted; data in transit is over TLS. But to be processed it must be decrypted in memory — and that's exactly where scraping malware reads it. Data 'in use' is the hard, unsolved third of confidentiality." },
  // Integrity
  { prop: "I",
    obs: ["DC01  Security log cleared  02:14",
          "next recorded event ID: 1102 (audit log was cleared)"],
    options: ["Log tampering", "Disk failure", "Rate limiting", "Backup failure"],
    answer: "Log tampering",
    row: "A cleared security log is hostile until proven otherwise. Attackers erase history to break your ability to reconstruct events — which is exactly why logs are forwarded off-host in real time." },
  { prop: "I",
    obs: ["report.xlsx",
          "modified-time 2026-03-01  precedes  created-time 2026-07-10"],
    options: ["Timestomping", "Config drift", "Eavesdropping", "DDoS"],
    answer: "Timestomping",
    row: "A file cannot be modified before it existed. The timestamps were forged (timestomping) to make a planted file blend into old, trusted data. Impossible metadata is a fingerprint of tampering." },
  { prop: "I",
    obs: ["/var/www/html/  now contains  up.php  (18 KB)",
          "not present in the deployment manifest"],
    options: ["Web shell (code injection)", "Misconfiguration", "Replay", "Resource exhaustion"],
    answer: "Web shell (code injection)",
    row: "A script in your web root that nobody deployed is a web shell — attacker-controlled code appended to a legitimate site. It gives them a command prompt over HTTPS that looks like ordinary web traffic." },
  { prop: "I",
    obs: ["payroll  emp_4471  net_salary:  8,200 -> 82,000",
          "no change ticket, no approver"],
    options: ["Unauthorized modification", "Ransomware", "Eavesdropping", "DDoS"],
    answer: "Unauthorized modification",
    row: "The data still exists and the system still works — it's just wrong. A record altered without authorization is the quietest breach there is; it can sit undetected for years. This is why file/record integrity monitoring is its own product category." },
  { prop: "I",
    obs: ["auth token captured at 10:00:01",
          "same token replayed 3× within 5 seconds — each accepted"],
    options: ["Replay attack", "Brute force", "Privilege escalation", "Misconfiguration"],
    answer: "Replay attack",
    row: "A valid message re-sent to repeat its effect. Nothing was cracked or altered — a captured request was simply played back, and the server had no way to know it had seen it before." },
  // Availability
  { prop: "A",
    obs: ["FS01  03:02",
          "vssadmin.exe delete shadows /all /quiet"],
    options: ["Shadow-copy deletion (ransomware precursor)", "Backup failure", "DDoS", "Config drift"],
    answer: "Shadow-copy deletion (ransomware precursor)",
    row: "Deleting volume shadow copies removes your ability to roll back — it is a near-certain precursor to encryption. Attackers destroy recovery options first, on purpose, so you can't undo what comes next." },
  { prop: "A",
    obs: ["FS01",
          "2,141 files renamed to *.locked in 6 minutes"],
    options: ["Ransomware", "Disk failure", "Eavesdropping", "Replay"],
    answer: "Ransomware",
    row: "Mass renames to one uniform extension at machine speed is encryption in progress. The data still exists, but it is no longer usable in its true form — the classic availability attack." },
  { prop: "A",
    obs: ["backup job NIGHTLY-FULL",
          "last success 41 days ago — 41 silent failures, no alert"],
    options: ["Silent backup failure", "DDoS", "Ransomware", "ARP spoofing"],
    answer: "Silent backup failure",
    row: "A backup you have never restored from is not a backup, it is a hope. Jobs that fail quietly are discovered at the worst possible moment — the day you need them. No attacker needed." },
  { prop: "A",
    obs: ["inbound to :443",
          "48,000 SYN/sec from ~12,000 distinct source IPs"],
    options: ["DDoS (SYN flood)", "Brute force", "Data exfiltration", "Config drift"],
    answer: "DDoS (SYN flood)",
    row: "A flood from thousands of sources exhausts the connection table so real users can't get in. Note the sources are spoofable because SYN floods abuse the TCP handshake — no completed connection required." },
  { prop: "A",
    obs: ["/var partition 100% full",
          "syslog now dropping messages"],
    options: ["Resource exhaustion", "Ransomware", "Log tampering", "DDoS"],
    answer: "Resource exhaustion",
    row: "A full disk is an availability incident even with no attacker — and a nasty one, because when the log partition fills, you also stop recording evidence. Most outages are exhaustion or unpatched bugs, not attacks." }
];

/* ---- Block 2.1: CIA tension scenarios (commit-gate) --------------------- */
MAJAL.scenarios = [
  { id: 1, title: "The stolen laptop",
    text: "A laptop is stolen from a car. Full-disk encryption was on and the employee was logged out.",
    note: "Nothing was violated — a control worked. The disk is encrypted and the session was closed, so confidentiality, integrity and availability of the company's data all held. If you called this a breach, ask yourself: what evidence did you actually have that any data was read? This is the whole point — a control doing its job is not an incident." },
  { id: 2, title: "The phished accountant",
    text: "An accountant's password is phished. The attacker logs in, reads two years of email, and leaves.",
    note: "Confidentiality violated; integrity and availability held (nothing was changed or destroyed). The control that would have stopped it: MFA, which turns a stolen password into a useless one. Remember confidentiality is the one you cannot undo — that email is now gone, permanently." },
  { id: 3, title: "The 2am migration",
    text: "A junior admin drops a production table during a 2am migration.",
    note: "Availability (and arguably integrity) violated — by accident, with no attacker anywhere. Yes, it is a security incident: the CIA properties don't care about intent. This is the case that breaks the student habit of filing every outage under 'not real security.' Controls that help: change management, backups, least privilege." },
  { id: 4, title: "The self-service balance",
    text: "A customer-facing app has a SQL injection flaw. An attacker uses it to change their own account balance.",
    note: "Integrity violated (a record was altered) and confidentiality too (SQLi reads the database as easily as it writes). The control: input validation / parameterised queries — untrusted input must never be treated as instructions. This is a Day 4 topic; note it's an integrity failure at the application layer." },
  { id: 5, title: "The Thursday-night ransomware",
    text: "Ransomware encrypts a file server. Backups exist and are offline. Data was exfiltrated first.",
    note: "All three violated — but only one permanently. Availability: restore from the offline backup. Integrity: restore clean. Confidentiality: the exfiltrated data is gone and cannot be recalled. When you see an availability event, assume confidentiality was already lost and go check — attackers steal first, then encrypt, because encryption is the moment you notice." },
  { id: 6, title: "The Friday-evening certificate",
    text: "A certificate expires on the payment gateway on a Friday evening.",
    note: "Availability broken (customers can't pay), no attacker, and a security-adjacent control (the certificate) is what failed. Is it a 'security incident'? There is no clean answer — and that's the lesson. Reasonable people put this in different boxes; what matters is that it's detected, owned, and fixed, not which label wins." }
];

/* ---- Block 2.2: sentence builder --------------------------------------- */
MAJAL.sentence = {
  asset: ["the customer database", "the student records system", "the payroll system",
          "the source-code repository", "the VPN gateway", "the email archive"],
  vuln: ["an unpatched mail server", "reused admin passwords", "an internet-exposed RDP port",
         "staff who've never seen a phishing email", "a public storage bucket", "default credentials"],
  threat: ["a ransomware affiliate group", "a careless insider", "a hacktivist collective",
           "a nation-state actor", "an opportunistic script kiddie"],
  risk: ["could encrypt it and hold it hostage", "could exfiltrate and leak it",
         "could quietly alter it", "could take it offline for days", "could sell access to it"],
  jargon: ["cve", "port", "unpatched", "payload", "endpoint", "exploit", "rce", "vector",
           "rdp", "sqli", "ttp", "c2", "lsass", "hash", "brute-force", "bruteforce",
           "zero-day", "0day", "smb", "445", "3389", "ssh", "phishing-kit"]
};

/* ---- Block 2.2: attack surface counters -------------------------------- */
MAJAL.surface = {
  network: { count: 41, label: "Network",
    items: "exposed ports · the VPN endpoint · the mail gateway · 3 public web apps · an FTP box nobody remembers · 4 cloud storage buckets · a forgotten staging subdomain · the RDP jump host · public DNS records · a legacy VPN concentrator …" },
  software: { count: 183, label: "Software",
    items: "every application, every library, every dependency, every input field on every form — each one is a place untrusted input meets your code." },
  human: { count: 1247, label: "Human",
    items: "every single employee with an email address, a phone number, and a LinkedIn profile. Every one of them can be asked, nicely, to click." }
};

/* ---- Block 2.2: threat-actor attribution ------------------------------- */
MAJAL.actors = ["Script kiddie", "Hacktivist", "Cybercriminal / ransomware crew", "Insider", "Nation-state / APT"];
MAJAL.briefs = [
  { brief: "Loud port scans across the entire address range at midday, using a scanner whose default User-Agent is sitting right there in the logs. The next morning the public homepage is defaced with a political slogan.",
    answer: "Hacktivist",
    tell: "Ideology + a public statement (the defacement) + zero attempt at stealth. They want to be seen. A criminal crew hides; a hacktivist announces." },
  { brief: "A phishing email leads to a VPN login, then RDP, then nine days of quiet. On day nine: data archived and uploaded, backups deleted, every file encrypted, and a ransom note in each folder.",
    answer: "Cybercriminal / ransomware crew",
    tell: "The textbook money pipeline: phish → remote access → dwell → steal → destroy backups → encrypt. This is the volume business of cybersecurity and where almost everything you'll investigate comes from." },
  { brief: "Legitimate credentials, normal working hours, nothing technically unauthorized — but a finance clerk downloaded the entire customer list two days after being passed over for promotion.",
    answer: "Insider",
    tell: "Every control on your list assumes the attacker is outside. Here the credentials are valid and the access is authorized; only the motive and the pattern are wrong. This is the one nobody plans for.",
    ambiguous: true },
  { brief: "Eighteen months undetected. A custom implant, but only ever using tools already on the system. Exfiltration in tiny bursts encoded over DNS. They touched only the R&D documents and nothing else.",
    answer: "Nation-state / APT",
    tell: "Patience (18 months), custom tooling, living-off-the-land to stay quiet, and a narrow espionage objective. High capability, low noise. Gets the documentaries; rarely gets your weekends." },
  { brief: "A valid domain-admin credential used from day one. Movement only during business hours, noisy tools carefully avoided — it looks exactly like a trusted insider. But the credential was bought from an access broker, and on day five they deployed ransomware.",
    answer: "Cybercriminal / ransomware crew",
    tell: "The access pattern mimics an insider — that's deliberate. The tells that give it away: the credential was purchased, and the endgame is ransomware. Behaviour can be disguised; the objective usually can't.",
    ambiguous: true },
  { brief: "Breached a government subdomain, left 'owned by 0xGh0st' across the page, exploited a three-year-old public CVE with a copy-pasted exploit, did no cleanup, and bragged about it on a forum an hour later.",
    answer: "Script kiddie",
    tell: "It looks alarming (a government target!) but every signal is low-skill: a public exploit, no stealth, no cleanup, and bragging. Capability, not target, is what places an actor. Don't let the target scare you into over-attributing.",
    ambiguous: true }
];

/* ---- Block 3: kill chain ----------------------------------------------- */
MAJAL.killchain = [
  { stage: "Reconnaissance", narrative: "Reads the company website and LinkedIn. Names the finance team. Finds the mail server. Spots a supplier named in a press release.",
    log: null, logNote: "no log exists" },
  { stage: "Weaponization", narrative: "Builds an invoice email referencing that real supplier, linking to a pixel-perfect copy of the company's own login page.",
    log: "(nothing lands yet — this happens on the attacker's own machine)" },
  { stage: "Delivery", narrative: "Sends it to four people in finance on a Sunday evening.",
    log: "Mail gateway: sender, attachment, URL, and whether it was clicked." },
  { stage: "Exploitation", narrative: "One accountant enters her credentials. No exploit code anywhere — the 'exploit' was a plausible sentence.",
    log: "Auth log: a successful login — unusual hour, unusual country, unusual device." },
  { stage: "Installation", narrative: "Logs into the VPN with her credentials, lands on her workstation, installs a remote-access tool that survives reboot.",
    log: "New service created · new scheduled task · new startup entry · new file in a persistence location." },
  { stage: "Command & Control", narrative: "That tool beacons out every 60 seconds over HTTPS on port 443 — indistinguishable from web browsing.",
    log: "Firewall / proxy: repeated outbound connections to one destination at a fixed interval." },
  { stage: "Actions on Objectives", narrative: "Enumerates the shares, finds finance, archives it, uploads it. Deletes the backups. Encrypts everything on a Thursday night before a holiday.",
    log: "Mass file access · archive creation · large upload · backup deletion · mass rename." }
];

/* ---- Block 3: ATT&CK frozen snapshot (T1003.001) ----------------------- */
MAJAL.attack = {
  id: "T1003.001", tactic: "Credential Access", name: "OS Credential Dumping: LSASS Memory",
  parent: "T1003  OS Credential Dumping",
  description: "Adversaries may attempt to access credential material stored in the process memory of the Local Security Authority Subsystem Service (LSASS). After a user logs on, the system generates and stores a variety of credential materials in LSASS process memory. These credentials can be harvested by an administrative user or SYSTEM and then used to move laterally or access restricted information.",
  procedures: [
    ["G0016  APT29", "has used Mimikatz to dump credentials from LSASS memory during intrusions."],
    ["S0002  Mimikatz", "performs credential dumping (sekurlsa) to obtain account logins and passwords from LSASS."],
    ["G0032  Lazarus Group", "has been observed creating a memory dump of LSASS via comsvcs.dll for offline credential extraction."],
    ["S0154  Cobalt Strike", "can spawn a job that injects into LSASS and dumps password hashes."]
  ],
  detection: [
    ["Process access", "Monitor for processes opening a handle to lsass.exe with unusual access rights (e.g. PROCESS_VM_READ). Legitimate access is rare and comes from a known short list of processes."],
    ["Command line", "Look for rundll32.exe calling comsvcs.dll MiniDump, or procdump targeting lsass — classic hands-on-keyboard dumping."],
    ["Sysmon", "Event ID 10 (ProcessAccess) targeting lsass.exe is one of the highest-value credential-theft signals you can collect."]
  ]
};

/* ---- Block 4: four-questions connection record ------------------------- */
MAJAL.fourq = {
  record: "2026-07-19 03:41:52   src=10.0.0.57:50122   dst=203.0.113.47:443   proto=TCP   state=ESTABLISHED   tls_sni=api.attacker-c2.net   bytes_out=41,208",
  fields: [
    { key: "who", label: "Who? (the internal host)", accept: ["10.0.0.57"], hint: "an internal 10.x address" },
    { key: "service", label: "Which service? (port + name)", accept: ["443", "https", "443 https", "443/https", "https 443"], hint: "a port number and its service" },
    { key: "what", label: "What did they say? (protocol / payload)", accept: ["tls", "https", "tls/https", "encrypted", "tls handshake"], hint: "look at the payload clue" },
    { key: "reliable", label: "Reliably delivered? (TCP or UDP)", accept: ["tcp", "yes tcp", "tcp yes"], hint: "handshake = ?" }
  ]
};

/* ---- Block 4: ports drill ---------------------------------------------- */
MAJAL.ports = [
  { p: "22", s: "SSH", why: "Remote admin — the brute-force target on Linux" },
  { p: "25 / 587", s: "SMTP", why: "Mail — phishing delivery and exfiltration" },
  { p: "53", s: "DNS", why: "Tunneling and C2 channel" },
  { p: "80 / 443", s: "HTTP / HTTPS", why: "Where C2 hides in plain sight" },
  { p: "88", s: "Kerberos", why: "Windows authentication — ticket attacks" },
  { p: "135 / 139 / 445", s: "RPC / NetBIOS / SMB", why: "Lateral movement, ransomware spread" },
  { p: "389 / 636", s: "LDAP / LDAPS", why: "Directory enumeration" },
  { p: "1433 / 3306", s: "MSSQL / MySQL", why: "Data-theft target" },
  { p: "3389", s: "RDP", why: "The single most common initial-access port" },
  { p: "5985 / 5986", s: "WinRM", why: "Remote command execution on Windows" }
];

/* ---- Block 4: HTTP dissector + UA lineup -------------------------------- */
MAJAL.http = {
  request: [
    { tok: "GET", def: "The HTTP method — what the client wants to do. GET retrieves; POST submits data." },
    { tok: "/admin/login.php", def: "The path — which resource on the server is being requested." },
    { tok: "HTTP/1.1", def: "The protocol version the client is speaking." },
    { tok: "Host: shop.example.sa", def: "Which site — one server can host many, so the client names the one it wants." },
    { tok: "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)", def: "A string the CLIENT chooses to describe itself. It can say anything. It can lie completely — which is exactly why lazy malware gives itself away here." },
    { tok: "Cookie: PHPSESSID=8f2a1c9e4b7d", def: "The session token the client sends back to prove it's the same visitor as before." },
    { tok: "Accept: text/html", def: "What content types the client is willing to receive." }
  ],
  response: [
    { tok: "HTTP/1.1 200 OK", def: "The status code. 200 = success. (401/403 = auth problems, 404 = not found, 500 = server error.)" },
    { tok: "Server: Apache/2.4.41", def: "What the server chooses to reveal about itself — often trimmed in production to give attackers less." },
    { tok: "Set-Cookie: PHPSESSID=8f2a1c9e4b7d; HttpOnly", def: "The server handing the client a session token." },
    { tok: "HttpOnly", def: "A flag that tells the browser: do not let JavaScript read this cookie. It blunts cookie theft via cross-site scripting (XSS) — a small flag that stops a large class of session-hijacking." },
    { tok: "Content-Length: 4471", def: "How many bytes of body follow." }
  ],
  uas: [
    { s: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", malware: false, note: "Ordinary Chrome on Windows 10. Boring and correct." },
    { s: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15", malware: false, note: "Ordinary Safari on macOS. Fine." },
    { s: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0", malware: false, note: "Ordinary Firefox on Windows. Fine." },
    { s: "python-requests/2.25.1", malware: true, note: "THE MALWARE. This is the default User-Agent of Python's requests library — a real browser never sends it. It's a script or an implant beaconing home, and the author never bothered to disguise it. A meaningful share of detection engineering is exactly this unglamorous." },
    { s: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36", malware: false, note: "Chrome on Linux. Fine." },
    { s: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", malware: false, note: "The Google crawler. Legitimate — and it even tells you where to verify it. (Worth knowing that other tells exist too: nonsense version numbers like Chrome/1.0, or a 'Windos NT' typo, are the same lazy fingerprint as #4.)" }
  ]
};
