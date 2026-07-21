/* ==========================================================================
   Seeded log generators. Deterministic, so every student's file is identical.
   ========================================================================== */
window.MAJAL = window.MAJAL || {};

/* tiny seeded PRNG (mulberry32) — same seed => same sequence everywhere */
MAJAL.rng = function (seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ---- Cold-open SSH brute-force wall ------------------------------------ */
/* 2,847 "Failed password" lines + one "Accepted password" needle near the end */
MAJAL.buildLogWall = function () {
  var rand = MAJAL.rng(20260719);
  var users = ["admin", "oracle", "backup", "postgres", "test", "user", "git", "jenkins",
    "ubuntu", "ftp", "www", "mysql", "nagios", "guest", "info", "webmaster", "tomcat",
    "student", "dev", "support", "sysadmin", "root", "operator", "svc", "pi", "ansible"];
  var lines = [];
  var pid = 4471, port = 55214;
  var hh = 3, mm = 12, ss = 7;
  function stamp() {
    var s = "Jul 19 " + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") +
      ":" + String(ss).padStart(2, "0");
    ss += Math.floor(rand() * 3);
    if (ss >= 60) { ss -= 60; mm += 1; }
    if (mm >= 60) { mm -= 60; hh += 1; }
    return s;
  }
  var TOTAL = 2847;
  var needleAt = TOTAL - 3; // third from the end
  var needle = -1;
  for (var i = 0; i < TOTAL; i++) {
    var t = stamp();
    pid += 1 + Math.floor(rand() * 2);
    port += 2 + Math.floor(rand() * 4);
    if (i === needleAt) {
      needle = i;
      lines.push(t + " srv-web-02 sshd[" + pid + "]: Accepted password for deploy from 203.0.113.47 port " + port + " ssh2");
    } else {
      var u = users[Math.floor(rand() * users.length)];
      lines.push(t + " srv-web-02 sshd[" + pid + "]: Failed password for invalid user " + u +
        " from 203.0.113.47 port " + port + " ssh2");
    }
  }
  return { lines: lines, needle: needle };
};

/* ---- Benign DNS resolution log (for the tunneling exercise) ------------ */
MAJAL.buildDnsLog = function (n) {
  n = n || 3000;
  var rand = MAJAL.rng(424242);
  var parents = ["google.com", "cloudflare.com", "microsoft.com", "apple.com",
    "windowsupdate.com", "office365.com", "akamai.net", "amazonaws.com", "github.com",
    "gstatic.com", "doubleclick.net", "fbcdn.net", "cdn.example.sa", "whatsapp.net",
    "icloud.com", "ntp.org", "ubuntu.com", "mozilla.org", "bing.com", "office.com"];
  // a small pool of dictionary subdomains — so any benign parent has FEW unique
  var subs = ["www", "mail", "api", "cdn", "login", "auth", "update", "static"];
  // CDN parents that legitimately serve a handful of hash-like hostnames.
  // These create ENTROPY false-positives without inflating unique counts much.
  var cdnParents = ["akamai.net", "gstatic.com", "fbcdn.net"];
  function hashLabel(len) {
    var h = ""; while (h.length < len) h += Math.floor(rand() * 16).toString(16); return h;
  }
  var cdnHashes = {};                       // parent -> small fixed set of hash hosts
  cdnParents.forEach(function (p) {
    // 20-char hashes so their entropy overlaps the tunnel's — the ENTROPY
    // false-positive — while their small count keeps unique-count clean.
    cdnHashes[p] = []; for (var k = 0; k < 4; k++) cdnHashes[p].push(hashLabel(20));
  });

  var log = [];
  var hh = 8, mm = 0, ss = 0;
  function stamp() {
    ss += Math.floor(rand() * 4);
    while (ss >= 60) { ss -= 60; mm++; }
    while (mm >= 60) { mm -= 60; hh++; }
    return String(hh % 24).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0");
  }
  for (var i = 0; i < n; i++) {
    var host = "10.0.0." + (10 + Math.floor(rand() * 60));
    var parent = parents[Math.floor(rand() * parents.length)];
    var sub;
    if (cdnHashes[parent] && rand() < 0.35) {
      sub = cdnHashes[parent][Math.floor(rand() * cdnHashes[parent].length)]; // reuse -> few unique
    } else {
      sub = subs[Math.floor(rand() * subs.length)];
    }
    log.push({ t: stamp(), host: host, q: sub + "." + parent });
  }
  return log;
};

/* hex-encode a secret into chunked DNS-tunnel queries.
   Real tunnels chunk a file into MANY unique queries — so we generate a healthy
   run of unique labels (the secret first, then continuation chunks) so the
   attacker's parent domain has far more unique subdomains than any benign one. */
MAJAL.encodeTunnel = function (secret, host, domain) {
  host = host || "10.0.0.57";
  domain = domain || "exfil.attacker.com";
  var secretHex = "";
  for (var i = 0; i < secret.length; i++) {
    secretHex += secret.charCodeAt(i).toString(16).padStart(2, "0");
  }
  while (secretHex.length % 20 !== 0) secretHex += "00";
  var rand = MAJAL.rng(1337);
  // full stream: the secret, then random continuation bytes to ~30 chunks total
  var stream = secretHex;
  while (stream.length < 30 * 20) { stream += Math.floor(rand() * 16).toString(16); }
  if (stream.length % 20 !== 0) stream = stream.slice(0, stream.length - (stream.length % 20));

  var out = [];
  var hh = 8, mm = 5, ss = 2;
  for (var j = 0; j < stream.length; j += 20) {
    var label = stream.substr(j, 20);
    ss += 1 + Math.floor(rand() * 2);
    while (ss >= 60) { ss -= 60; mm++; }
    while (mm >= 60) { mm -= 60; hh++; }
    out.push({ t: String(hh % 24).padStart(2, "0") + ":" + String(mm).padStart(2, "0") + ":" + String(ss).padStart(2, "0"),
      host: host, q: label + "." + domain, tunnel: true });
  }
  return { queries: out, hex: secretHex, domain: domain };  // decode only the secret part
};

/* decode hex back to text (for the payoff) */
MAJAL.decodeHex = function (hex) {
  var s = "";
  for (var i = 0; i < hex.length; i += 2) {
    var code = parseInt(hex.substr(i, 2), 16);
    if (code > 0) s += String.fromCharCode(code);
  }
  return s;
};
