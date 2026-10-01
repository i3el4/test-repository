/* Reine Brief-Logik ohne Oberfläche. Wird von app.js und von den Prüfungen genutzt. */
(function (root) {
  const MONTHS = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];

  const TEST_RECIPIENTS = [
    "frank.sippach@fhnw.ch",
    "sebastian.linxen@fhnw.ch",
    "evelyn.kopec@fhnw.ch",
    "bela.ackermann@fhnw.ch",
    "silvan.albicker@fhnw.ch",
  ];

  function defaultSettings() {
    return {
      version: 1,
      fromName: "Frank Sippach",
      fromEmail: "frank.sippach@fhnw.ch",
      wave: "test",
      filters: { MA: true, ST: true, EXT: true },
      excluded: [],
      testRecipients: TEST_RECIPIENTS.slice(),
      testVideoIds: [],
      waves: {
        test: {
          kicker: "Testnachricht",
          subject: "Test: SWITCHtube-Bereinigung",
          body: [
            "Liebes Team",
            "Die FHNW führt eine umfassende Bereinigung der Videoplattform SWITCHtube durch. Hintergrund ist, dass sich aktuell über 100'000 Videos auf der Videoplattform befinden, von denen ein grosser Teil seit längerer Zeit nicht mehr genutzt wird. Da sehr viele Videos betroffen sind und dementsprechend viele Kolleg*innen angeschrieben werden müssen, möchten wir gerne vorab testen, wie wir diesen Prozess vereinfachen können.",
            "Ihr bekommt heute eine Email mit einem Link zu dem entsprechenden Video. Könntet ihr mir bitte Rückmeldung geben, ob Euch diese Nachricht inklusive Link erreicht hat (am besten die Email an mich weiterleiten). Mehr müsst Ihr hier nicht tun.",
            "Vielen lieben Dank.\nFrank",
          ].join("\n\n"),
          action: "",
          signature: "",
          deadline: "",
          sentAt: "",
          sentTo: [],
        },
        e1: {
          kicker: "Erste Information",
          subject: "SWITCHtube: Ihre Videos sind von der Bereinigung betroffen",
          body: [
            "Guten Tag",
            "die FHNW bereinigt die Videoplattform SWITCHtube. Dort liegen derzeit über 100'000 Videos, ein grosser Teil davon seit längerer Zeit ungenutzt. Die unten aufgeführten Videos sind von dieser Bereinigung betroffen und zur Löschung vorgesehen.",
            "Bitte sehen Sie sich die Liste an. Sie erhalten diese Information insgesamt dreimal. Dies ist die erste Nachricht.",
          ].join("\n\n"),
          action: "Wenn Sie ein Video weiterhin benötigen oder Fragen zur Löschung haben, antworten Sie bitte auf diese E-Mail und nennen Sie den Videotitel.",
          signature: "Freundliche Grüsse\nFrank Sippach\nFHNW Hochschule für Wirtschaft\nfrank.sippach@fhnw.ch",
          deadline: "",
          sentAt: "",
          sentTo: [],
        },
        e2: {
          kicker: "Zweite Information",
          subject: "Erinnerung: SWITCHtube-Bereinigung Ihrer Videos",
          body: [
            "Guten Tag",
            "wir erinnern Sie an die laufende Bereinigung der Videoplattform SWITCHtube. Die unten aufgeführten Videos sind weiterhin zur Löschung vorgesehen.",
            "Dies ist die zweite von drei Informationen.",
          ].join("\n\n"),
          action: "Wenn Sie ein Video weiterhin benötigen oder Fragen haben, antworten Sie bitte auf diese E-Mail und nennen Sie den Videotitel.",
          signature: "Freundliche Grüsse\nFrank Sippach\nFHNW Hochschule für Wirtschaft\nfrank.sippach@fhnw.ch",
          deadline: "",
          sentAt: "",
          sentTo: [],
        },
        e3: {
          kicker: "Letzte Erinnerung",
          subject: "Letzte Erinnerung: Löschung Ihrer SWITCHtube-Videos",
          body: [
            "Guten Tag",
            "dies ist die letzte Erinnerung vor der Löschung der unten aufgeführten Videos auf SWITCHtube.",
            "Bitte prüfen Sie die Liste. Danach werden die genannten Videos im Rahmen der Bereinigung entfernt.",
          ].join("\n\n"),
          action: "Wenn ein Video erhalten bleiben soll, antworten Sie bitte umgehend auf diese E-Mail und nennen Sie den Titel.",
          signature: "Freundliche Grüsse\nFrank Sippach\nFHNW Hochschule für Wirtschaft\nfrank.sippach@fhnw.ch",
          deadline: "",
          sentAt: "",
          sentTo: [],
        },
      },
    };
  }

  const WAVE_ORDER = ["test", "e1", "e2", "e3"];

  const WAVE_META = {
    test: { label: "Test", hint: "Nur an das Projektteam" },
    e1: { label: "Erinnerung 1", hint: "Erste Information" },
    e2: { label: "Erinnerung 2", hint: "Zweite Information" },
    e3: { label: "Erinnerung 3", hint: "Letzte Erinnerung" },
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  function linkify(escaped) {
    return escaped
      .replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:#7c2432;text-decoration:underline;">${url}</a>`)
      .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (email) => `<a href="mailto:${email}" style="color:#7c2432;text-decoration:underline;">${email}</a>`);
  }

  function paragraphs(text) {
    const trimmed = String(text || "").replace(/\r\n/g, "\n").trim();
    if (!trimmed) return "";
    return trimmed.split(/\n{2,}/).map((block) => {
      const inner = linkify(escapeHtml(block).replace(/\n/g, "<br>"));
      return `<p class="mb-3" style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#241c19;">${inner}</p>`;
    }).join("");
  }

  function normalizeSrc(src) {
    const value = String(src || "").trim().toUpperCase();
    if (value === "MA" || value === "ST" || value === "EXT") return value;
    return "EXT";
  }

  function normalizeDate(value) {
    if (value == null || value === "") return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      const utc = new Date(Math.round((value - 25569) * 86400 * 1000));
      const y = utc.getUTCFullYear();
      const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
      const d = String(utc.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const text = String(value).trim();
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const ch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(text);
    if (ch) return `${ch[3]}-${ch[2].padStart(2, "0")}-${ch[1].padStart(2, "0")}`;
    return "";
  }

  function normalizeVideo(raw) {
    return {
      id: String(raw.id ?? "").trim(),
      title: String(raw.title ?? "").trim(),
      owner: String(raw.owner ?? "").trim().toLowerCase(),
      ownerSrc: raw.owner ? normalizeSrc(raw.ownerSrc) : "",
      url: String(raw.url ?? "").trim(),
      seen: normalizeDate(raw.seen),
      channel: String(raw.channel ?? "").trim(),
      channelOwner: String(raw.channelOwner ?? "").trim().toLowerCase(),
      channelSrc: raw.channelOwner ? normalizeSrc(raw.channelSrc) : "",
    };
  }

  function parseRows(rows) {
    return rows.map((row) => {
      const get = (name) => {
        const key = Object.keys(row).find((candidate) => String(candidate).trim().toLowerCase() === name);
        return key == null ? "" : row[key];
      };
      return normalizeVideo({
        id: get("video_id"),
        title: get("video_title"),
        owner: get("video_owner_email"),
        ownerSrc: get("video_owner_src"),
        url: get("video_url"),
        seen: get("last_viewed"),
        channel: get("channel_name"),
        channelOwner: get("channel_owner_email"),
        channelSrc: get("channel_owner_src"),
      });
    }).filter((video) => video.title && video.url && (video.owner || video.channelOwner));
  }

  function compareVideos(a, b) {
    if (!a.seen && b.seen) return -1;
    if (a.seen && !b.seen) return 1;
    if (a.seen !== b.seen) return a.seen < b.seen ? -1 : 1;
    return String(a.title).localeCompare(String(b.title), "de");
  }

  function groupRecipients(videos, allowed) {
    const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);
    const map = new Map();
    videos.forEach((video) => {
      const parties = new Map();
      const add = (email, src, role) => {
        const key = String(email || "").trim().toLowerCase();
        if (!key || !key.includes("@")) return;
        let party = parties.get(key);
        if (!party) {
          party = { srcs: new Set(), roles: new Set() };
          parties.set(key, party);
        }
        party.srcs.add(normalizeSrc(src));
        party.roles.add(role);
      };
      add(video.owner, video.ownerSrc, "video");
      add(video.channelOwner, video.channelSrc, "channel");
      parties.forEach((party, email) => {
        const visible = [...party.srcs].some((src) => allowedSet.has(src));
        if (!visible) return;
        let recipient = map.get(email);
        if (!recipient) {
          recipient = { email, srcs: new Set(), videos: [] };
          map.set(email, recipient);
        }
        party.srcs.forEach((src) => recipient.srcs.add(src));
        recipient.videos.push({
          id: video.id,
          title: video.title,
          url: video.url,
          seen: video.seen,
          channel: video.channel,
          roles: [...party.roles],
        });
      });
    });
    const list = [...map.values()].map((recipient) => {
      recipient.srcs = [...recipient.srcs].sort();
      recipient.videos.sort(compareVideos);
      return recipient;
    });
    list.sort((a, b) => a.email.localeCompare(b.email, "de"));
    return list;
  }

  function formatSeen(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!match) return "";
    const month = MONTHS[Number(match[2]) - 1];
    if (!month) return "";
    return `${Number(match[3])}. ${month} ${match[1]}`;
  }

  function deadlineSentence(iso) {
    const pretty = formatSeen(iso);
    if (!pretty) return "";
    return `Bitte melden Sie sich bis zum ${pretty}.`;
  }

  function safeUrl(url) {
    const value = String(url || "").trim();
    return /^https?:\/\//i.test(value) ? value : "";
  }

  function roleText(roles) {
    const set = new Set(roles || []);
    if (set.has("video") && set.has("channel")) return "Video und Kanal";
    if (set.has("channel")) return "Kanal";
    return "Video";
  }

  function srcLabel(src) {
    if (src === "MA") return "Mitarbeitende";
    if (src === "ST") return "Studierende";
    return "Externe";
  }

  function videoTable(entries) {
    const hasChannelRole = entries.some((entry) => (entry.roles || []).includes("channel") && !(entry.roles || []).includes("video"));
    const rows = entries.map((entry, index) => {
      const href = safeUrl(entry.url);
      const title = escapeHtml(entry.title || "Ohne Titel");
      const titleHtml = href
        ? `<a href="${escapeHtml(href)}" style="color:#7c2432;text-decoration:underline;font-weight:600;">${title}</a>`
        : title;
      const seen = formatSeen(entry.seen) || "kein Aufruf erfasst";
      const bg = index % 2 === 0 ? "#ffffff" : "#faf6f4";
      return `<tr class="${index % 2 ? "table-light" : ""}">
        <td style="padding:10px 12px;border-bottom:1px solid #eadfd6;background:${bg};vertical-align:top;">${titleHtml}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eadfd6;background:${bg};vertical-align:top;white-space:nowrap;">${escapeHtml(seen)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eadfd6;background:${bg};vertical-align:top;">${escapeHtml(entry.channel || "–")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eadfd6;background:${bg};vertical-align:top;"><span class="badge rounded-pill" style="display:inline-block;background:#f3e6e8;color:#7c2432;border-radius:999px;padding:2px 8px;font-size:12px;font-weight:600;">${escapeHtml(roleText(entry.roles))}</span></td>
      </tr>`;
    }).join("");
    const note = hasChannelRole
      ? `<p class="small text-muted" style="margin:8px 0 0;font-size:12px;line-height:1.45;color:#7a6a62;">Video = Sie sind für das Video eingetragen. Kanal = Sie sind für den Kanal eingetragen, in dem das Video liegt.</p>`
      : "";
    return `<table class="table table-sm align-middle" role="table" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;margin:0;">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;background:#f3e6e8;color:#5c1522;border-bottom:1px solid #e4cfd3;font-size:12px;letter-spacing:.03em;text-transform:uppercase;">Video</th>
          <th style="text-align:left;padding:8px 12px;background:#f3e6e8;color:#5c1522;border-bottom:1px solid #e4cfd3;font-size:12px;letter-spacing:.03em;text-transform:uppercase;">Zuletzt angesehen</th>
          <th style="text-align:left;padding:8px 12px;background:#f3e6e8;color:#5c1522;border-bottom:1px solid #e4cfd3;font-size:12px;letter-spacing:.03em;text-transform:uppercase;">Kanal</th>
          <th style="text-align:left;padding:8px 12px;background:#f3e6e8;color:#5c1522;border-bottom:1px solid #e4cfd3;font-size:12px;letter-spacing:.03em;text-transform:uppercase;">Ihre Rolle</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>${note}`;
  }

  function videoCard(entry, mode) {
    const href = safeUrl(entry.url);
    const seen = formatSeen(entry.seen) || "kein Aufruf erfasst";
    const roleLine = mode === "personal"
      ? `<div style="font-size:14px;line-height:1.5;color:#4a403b;margin-bottom:16px;">Ihre Rolle: <strong>${escapeHtml(roleText(entry.roles))}</strong></div>`
      : "";
    const button = href
      ? `<a class="btn btn-primary" href="${escapeHtml(href)}" style="display:inline-block;background:#7c2432;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;font-size:15px;"><span style="color:#ffffff;">Video auf SWITCHtube öffnen</span></a>
         <div class="small text-muted" style="margin-top:10px;font-size:12px;line-height:1.45;color:#7a6a62;">Falls der Knopf nicht reagiert, diesen Link öffnen:<br><a href="${escapeHtml(href)}" style="color:#7c2432;text-decoration:underline;">${escapeHtml(href)}</a></div>`
      : `<p class="mb-0" style="margin:0;color:#7a6a62;">Für dieses Video ist kein Link hinterlegt.</p>`;
    return `<table class="card" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#faf7f5;border:1px solid #eadfd6;border-radius:12px;margin:0 0 8px;">
      <tr>
        <td class="card-body" style="padding:18px 20px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
          <div class="small text-muted" style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#7a6a62;margin-bottom:6px;">Videotitel</div>
          <div class="fw-semibold" style="font-size:18px;font-weight:650;line-height:1.35;color:#241c19;margin-bottom:10px;">${escapeHtml(entry.title || "Ohne Titel")}</div>
          <div style="font-size:14px;line-height:1.5;color:#4a403b;margin-bottom:4px;">Zuletzt angesehen: <strong>${escapeHtml(seen)}</strong></div>
          <div style="font-size:14px;line-height:1.5;color:#4a403b;margin-bottom:${mode === "personal" ? "4px" : "16px"};">Kanal: ${escapeHtml(entry.channel || "–")}</div>
          ${roleLine}
          ${button}
        </td>
      </tr>
    </table>`;
  }

  function videoBlock(entries, mode) {
    if (!entries.length) {
      return `<p class="alert alert-warning" style="margin:0;padding:12px 14px;background:#fff6e8;border:1px solid #efd3a4;border-radius:8px;color:#6b4a16;">In dieser Nachricht ist kein Video enthalten.</p>`;
    }
    if (entries.length === 1) return videoCard(entries[0], mode);
    const heading = mode === "test" ? "Videos in dieser Nachricht" : "Ihre Videos";
    const missing = entries.filter((entry) => !entry.seen).length;
    const summary = mode === "test"
      ? `${entries.length} Beispielvideos`
      : `${entries.length} ${entries.length === 1 ? "Video" : "Videos"}${missing ? `, davon ${missing} ohne erfassten Aufruf` : ""}`;
    return `<h2 class="h5 fw-semibold" style="margin:0 0 6px;font-size:18px;color:#241c19;">${heading}</h2>
      <p class="text-muted" style="margin:0 0 12px;font-size:14px;color:#7a6a62;">${escapeHtml(summary)}</p>
      ${videoTable(entries)}`;
  }

  function buildEmailHtml({ kicker, body, action, signature, deadline, entries, mode }) {
    const preheader = String(body || "").replace(/\s+/g, " ").trim().slice(0, 140);
    const deadlineHtml = deadlineSentence(deadline)
      ? `<p class="fw-semibold" style="margin:0 0 14px;font-size:16px;line-height:1.5;color:#5c1522;"><strong>${escapeHtml(deadlineSentence(deadline))}</strong></p>`
      : "";
    const actionHtml = String(action || "").trim()
      ? `<table class="alert alert-warning" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0 4px;">
          <tr>
            <td style="padding:14px 16px;background:#fbf6ee;border-left:4px solid #a67c3d;border-radius:8px;font-size:15px;line-height:1.5;color:#3f342c;">
              ${paragraphs(action).replace(/margin:0 0 14px/g, "margin:0 0 8px")}
            </td>
          </tr>
        </table>`
      : "";
    const signatureHtml = String(signature || "").trim()
      ? `<div class="mt-3" style="margin-top:22px;padding-top:14px;border-top:1px solid #eadfd6;">${paragraphs(signature)}</div>`
      : "";
    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(kicker || "SWITCHtube")}</title>
  <style>
    body { margin:0; padding:0; background:#f6f1ea; }
    a { color:#7c2432; }
    .btn { display:inline-block; font-weight:600; text-align:center; text-decoration:none; vertical-align:middle; border-radius:8px; }
    .btn-primary { background:#7c2432; color:#ffffff !important; }
    .table { width:100%; border-collapse:collapse; }
    .card { background:#faf7f5; }
    .alert { border-radius:8px; }
    .badge { font-weight:600; }
    .text-muted { color:#7a6a62; }
    .fw-semibold, .h5 { font-weight:650; }
    .small { font-size:12px; }
  </style>
</head>
<body class="bg-light" style="margin:0;padding:0;background:#f6f1ea;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table class="container" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;background:#f6f1ea;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse;background:#fffdfb;border:1px solid #e7ddd4;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:26px 32px 22px;background:#7c2432;color:#fffdfb;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
              <div class="small" style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#f3d5da;margin-bottom:8px;">FHNW · Hochschule für Wirtschaft</div>
              <div style="font-size:26px;line-height:1.2;font-weight:650;font-family:Palatino,Georgia,serif;">SWITCHtube-Bereinigung</div>
              <div style="margin-top:8px;font-size:14px;color:#f8e8eb;">${escapeHtml(kicker || "")}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
              ${paragraphs(body)}
              ${deadlineHtml}
              ${videoBlock(entries, mode)}
              <div style="height:16px;"></div>
              ${actionHtml}
              ${signatureHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 22px;background:#faf7f5;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
              <p class="small text-muted mb-0" style="margin:0;font-size:12px;line-height:1.5;color:#7a6a62;">Diese Nachricht gehört zur Bereinigung der Videoplattform SWITCHtube an der FHNW Hochschule für Wirtschaft. Bitte antworten Sie bei Fragen direkt auf diese E-Mail.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  function buildPlainText({ body, action, signature, deadline, entries, mode }) {
    const lines = [String(body || "").trim(), ""];
    const due = deadlineSentence(deadline);
    if (due) lines.push(due, "");
    lines.push(mode === "test" ? "Video zu dieser Nachricht" : "Ihre Videos", "");
    entries.forEach((entry) => {
      lines.push(`- ${entry.title || "Ohne Titel"}`);
      lines.push(`  Zuletzt angesehen: ${formatSeen(entry.seen) || "kein Aufruf erfasst"}`);
      if (entry.channel) lines.push(`  Kanal: ${entry.channel}`);
      if (mode !== "test") lines.push(`  Ihre Rolle: ${roleText(entry.roles)}`);
      if (safeUrl(entry.url)) lines.push(`  Link: ${entry.url}`);
      lines.push("");
    });
    if (String(action || "").trim()) lines.push(String(action).trim(), "");
    if (String(signature || "").trim()) lines.push(String(signature).trim(), "");
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }

  function buildMessage(options) {
    const html = buildEmailHtml(options);
    const text = buildPlainText(options);
    return { html, text, subject: String(options.subject || "").trim() };
  }

  function utf8Base64(value) {
    const bytes = new TextEncoder().encode(String(value));
    let binary = "";
    const chunk = 0x1000;
    for (let index = 0; index < bytes.length; index += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunk));
    }
    return btoa(binary);
  }

  function wrapBase64(value) {
    return value.replace(/.{1,76}/g, (line) => `${line}\r\n`).replace(/\r\n$/, "");
  }

  function encodeHeader(value) {
    const text = String(value || "");
    if (/^[\t\x20-\x7e]*$/.test(text)) return text;
    return `=?UTF-8?B?${utf8Base64(text)}?=`;
  }

  function formatAddress(name, email) {
    const cleanEmail = String(email || "").trim();
    const cleanName = String(name || "").trim();
    if (!cleanName) return cleanEmail;
    const quoted = `"${cleanName.replace(/["\\]/g, "")}"`;
    return `${encodeHeader(quoted)} <${cleanEmail}>`;
  }

  function buildEml({ fromName, fromEmail, to, subject, html }) {
    const encodedHtml = wrapBase64(utf8Base64(html));
    const lines = [
      "X-Unsent: 1",
      "MIME-Version: 1.0",
      `From: ${formatAddress(fromName, fromEmail)}`,
      `To: ${String(to || "").trim()}`,
      `Reply-To: ${String(fromEmail || "").trim()}`,
      `Subject: ${encodeHeader(subject)}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodedHtml,
      "",
    ];
    return lines.join("\r\n");
  }

  function slugEmail(email) {
    return String(email || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "empfaenger";
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function parseRecipientText(text) {
    const found = [];
    const invalid = [];
    String(text || "").split(/[\s,;]+/).forEach((part) => {
      const email = part.trim().toLowerCase();
      if (!email) return;
      if (isEmail(email)) found.push(email);
      else invalid.push(part.trim());
    });
    return { emails: [...new Set(found)], invalid };
  }

  const POWERSHELL = [
    "param(",
    "  [Parameter(Mandatory = $true)]",
    "  [ValidateSet('senden','entwurf')]",
    "  [string]$Modus",
    ")",
    "$ErrorActionPreference = 'Continue'",
    "$here = Split-Path -Parent $MyInvocation.MyCommand.Path",
    "$mailDir = Join-Path $here 'mails'",
    "$logPath = Join-Path $here 'protokoll.csv'",
    "$resultPath = Join-Path $here 'ergebnis.txt'",
    "if (-not (Test-Path -LiteralPath $mailDir)) {",
    "  Set-Content -LiteralPath $resultPath -Encoding Ascii -Value 'Der Ordner mails fehlt.'",
    "  exit 1",
    "}",
    "try {",
    "  $outlook = New-Object -ComObject Outlook.Application",
    "} catch {",
    "  Set-Content -LiteralPath $resultPath -Encoding Ascii -Value 'Outlook liess sich nicht starten. Ist Outlook installiert?'",
    "  exit 1",
    "}",
    "$done = @{}",
    "if (Test-Path -LiteralPath $logPath) {",
    "  Get-Content -LiteralPath $logPath -Encoding UTF8 | Select-Object -Skip 1 | ForEach-Object {",
    "    $parts = $_.Split(';')",
    "    if ($parts.Length -ge 2 -and $parts[1] -eq 'ok') { $done[$parts[0]] = $true }",
    "  }",
    "}",
    "if (-not (Test-Path -LiteralPath $logPath)) {",
    "  Set-Content -LiteralPath $logPath -Encoding UTF8 -Value 'email;status;zeit;hinweis'",
    "}",
    "$files = @(Get-ChildItem -LiteralPath $mailDir -Filter '*.json' | Sort-Object Name)",
    "$ok = 0",
    "$skip = 0",
    "$fail = 0",
    "$n = 0",
    "foreach ($file in $files) {",
    "  $n++",
    "  $to = $file.Name",
    "  try {",
    "    $raw = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8",
    "    $item = $raw | ConvertFrom-Json",
    "    $to = [string]$item.to",
    "    if ($done.ContainsKey($to)) {",
    "      $skip++",
    "      Write-Host ('[{0}/{1}] schon erledigt: {2}' -f $n, $files.Count, $to)",
    "      continue",
    "    }",
    "    $mail = $outlook.CreateItem(0)",
    "    $mail.To = $to",
    "    $mail.Subject = [string]$item.subject",
    "    $null = $mail.GetInspector",
    "    $mail.HTMLBody = [string]$item.html",
    "    $mail.BodyFormat = 2",
    "    if ($Modus -eq 'senden') { $mail.Send() } else { $mail.Save() }",
    "    $ok++",
    "    $done[$to] = $true",
    "    $line = '{0};ok;{1};{2}' -f $to, (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'), $Modus",
    "    Add-Content -LiteralPath $logPath -Encoding UTF8 -Value $line",
    "    Write-Host ('[{0}/{1}] {2} {3}' -f $n, $files.Count, $Modus, $to)",
    "  } catch {",
    "    $fail++",
    "    $hint = ($_.Exception.Message -replace '\\s+', ' ')",
    "    $line = '{0};fehler;{1};{2}' -f $to, (Get-Date -Format 'yyyy-MM-ddTHH:mm:ss'), $hint",
    "    Add-Content -LiteralPath $logPath -Encoding UTF8 -Value $line",
    "    Write-Host ('[{0}/{1}] FEHLER {2}' -f $n, $files.Count, $to)",
    "  }",
    "  Start-Sleep -Milliseconds 250",
    "}",
    "$summary = \"Modus: $Modus | Erfolgreich: $ok | Uebersprungen: $skip | Fehler: $fail | Gesamt: $($files.Count)\"",
    "Set-Content -LiteralPath $resultPath -Encoding Ascii -Value $summary",
    "Write-Host $summary",
    "if ($fail -gt 0) { exit 2 }",
    "exit 0",
    "",
  ].join("\r\n");

  const VBS = [
    "Option Explicit",
    "Dim sh, fso, here, choice, mode, command, ts, result",
    "Set sh = CreateObject(\"Wscript.Shell\")",
    "Set fso = CreateObject(\"Scripting.FileSystemObject\")",
    "here = fso.GetParentFolderName(WScript.ScriptFullName)",
    "choice = MsgBox(\"Wie sollen die E-Mails vorbereitet werden?\" & vbCrLf & vbCrLf & \"Ja = jetzt mit Outlook senden\" & vbCrLf & \"Nein = nur als Entwuerfe speichern, damit Sie sie pruefen koennen\" & vbCrLf & \"Abbrechen = nichts tun\" & vbCrLf & vbCrLf & \"Outlook sollte geoeffnet und mit dem richtigen Postfach angemeldet sein.\", vbYesNoCancel + vbInformation, \"SWITCHtube Serienbrief\")",
    "If choice = vbCancel Then WScript.Quit 0",
    "If choice = vbYes Then",
    "  mode = \"senden\"",
    "Else",
    "  mode = \"entwurf\"",
    "End If",
    "command = \"powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \" & Chr(34) & \"Get-ChildItem -LiteralPath '\" & here & \"' -Recurse | Unblock-File; exit 0\" & Chr(34)",
    "sh.Run command, 0, True",
    "command = \"powershell.exe -NoProfile -ExecutionPolicy Bypass -File \" & Chr(34) & here & \"\\senden.ps1\" & Chr(34) & \" -Modus \" & mode",
    "sh.Run command, 1, True",
    "result = \"Der Ablauf ist beendet. Details stehen in ergebnis.txt und protokoll.csv.\"",
    "If fso.FileExists(here & \"\\ergebnis.txt\") Then",
    "  Set ts = fso.OpenTextFile(here & \"\\ergebnis.txt\", 1, False, 0)",
    "  result = ts.ReadAll",
    "  ts.Close",
    "End If",
    "MsgBox result, vbInformation, \"SWITCHtube Serienbrief\"",
    "",
  ].join("\r\n");

  function outlookReadme({ waveLabel, count, fromEmail }) {
    return [
      "SWITCHtube Serienbrief",
      "",
      `Runde: ${waveLabel}`,
      `Anzahl E-Mails: ${count}`,
      `Absender-Postfach: ${fromEmail}`,
      "",
      "So verschicken Sie die Mails auf einem Windows-Computer mit Outlook:",
      "",
      "1. Outlook öffnen und mit dem genannten Postfach anmelden.",
      "2. Die automatische Outlook-Signatur für neue Nachrichten kurz ausschalten, damit sie nicht doppelt unter der Grussformel steht.",
      "3. Die Datei Starten.vbs doppelklicken.",
      "4. Ja = sofort senden. Nein = nur Entwürfe in Outlook, die Sie zuerst ansehen können.",
      "5. Warten, bis das Fenster Fertig meldet. Nicht ein zweites Mal starten, während der erste Lauf noch geht.",
      "6. Adressen, die schon im protokoll.csv stehen, werden beim nächsten Start übersprungen.",
      "7. In der Browser-Seite können Sie protokoll.csv laden. Die Runde wird dann als verschickt angezeigt.",
      "",
      "Wenn Outlook fragt, ob ein Programm E-Mails senden darf: Zulassen wählen.",
      "Auf einem Mac diese Dateien nicht verwenden. Dort die E-Mail-Dateien (.eml) aus der anderen ZIP-Datei öffnen.",
      "",
    ].join("\r\n");
  }

  function utf8Bom(text) {
    return `\uFEFF${text}`;
  }

  root.SwitchtubeMail = {
    MONTHS,
    TEST_RECIPIENTS,
    WAVE_ORDER,
    WAVE_META,
    defaultSettings,
    escapeHtml,
    normalizeSrc,
    normalizeDate,
    normalizeVideo,
    parseRows,
    groupRecipients,
    formatSeen,
    deadlineSentence,
    safeUrl,
    roleText,
    srcLabel,
    buildEmailHtml,
    buildPlainText,
    buildMessage,
    buildEml,
    slugEmail,
    isEmail,
    parseRecipientText,
    POWERSHELL,
    VBS,
    outlookReadme,
    utf8Bom,
  };
})(typeof window !== "undefined" ? window : globalThis);
