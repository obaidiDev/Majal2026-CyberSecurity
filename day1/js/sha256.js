/* ==========================================================================
   Pure-JS SHA-256 — no dependencies, works fully offline from file://.
   Compact public-domain implementation (returns lowercase hex).
   UTF-8 safe: input string is byte-encoded first.
   ========================================================================== */
window.MAJAL = window.MAJAL || {};

MAJAL.sha256 = (function () {
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

  // round constants (first 32 bits of the fractional parts of the cube roots
  // of the first 64 primes) and initial hash values — precomputed once.
  var K = [], H0 = [];
  (function () {
    var n = 2, p = 0, isComp;
    function frac(x) { return ((x - Math.floor(x)) * 4294967296) | 0; }
    while (p < 64) {
      isComp = false;
      for (var d = 2; d * d <= n; d++) if (n % d === 0) { isComp = true; break; }
      if (!isComp) {
        if (p < 8) H0[p] = frac(Math.pow(n, 1 / 2));
        K[p] = frac(Math.pow(n, 1 / 3));
        p++;
      }
      n++;
    }
  })();

  function toBytes(str) {
    // UTF-8 encode into an array of byte values
    var utf8 = unescape(encodeURIComponent(str)), b = [];
    for (var i = 0; i < utf8.length; i++) b.push(utf8.charCodeAt(i) & 0xff);
    return b;
  }

  return function (message) {
    var bytes = toBytes(message);
    var bitLen = bytes.length * 8;

    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0x00);
    // 64-bit big-endian length (top 32 bits are 0 for our sizes)
    for (var i = 7; i >= 0; i--) bytes.push((i < 4) ? (bitLen >>> (i * 8)) & 0xff : 0);

    var h = H0.slice();
    var w = new Array(64);

    for (var off = 0; off < bytes.length; off += 64) {
      for (i = 0; i < 16; i++) {
        w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16)
             | (bytes[off + i * 4 + 2] << 8) | (bytes[off + i * 4 + 3]);
      }
      for (i = 16; i < 64; i++) {
        var s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }

      var a = h[0], b = h[1], c = h[2], d = h[3],
          e = h[4], f = h[5], g = h[6], hh = h[7];

      for (i = 0; i < 64; i++) {
        var S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (hh + S1 + ch + K[i] + w[i]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0;
        d = c; c = b; b = a; a = (t1 + t2) | 0;
      }

      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }

    var hex = "";
    for (i = 0; i < 8; i++) hex += ("00000000" + (h[i] >>> 0).toString(16)).slice(-8);
    return hex;
  };
})();
