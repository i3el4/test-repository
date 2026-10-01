(function () {
  const Mail = window.SwitchtubeMail;
  const STORAGE_KEY = "fhnw-switchtube-serienbrief-v1";
  const DATA_KEY = "fhnw-switchtube-serienbrief-data-v1";

  const $ = (id) => document.getElementById(id);
  let videos = [];
  let sourceLabel = "";
  let state = Mail.defaultSettings();
  let filling = false;
  let selectedEmail = "";
  let confirmAction = null;
  const confirmModal = new bootstrap.Modal($("confirm-modal"));
  const progressModal = new bootstrap.Modal($("progress-modal"));
  const copyModal = new bootstrap.Modal($("copy-modal"));

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergeWave(base, saved) {
    return Object.assign(clone(base), saved || {});
  }

  function loadState() {
    const defaults = Mail.defaultSettings();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.version !== 1) return defaults;
      defaults.fromName = saved.fromName || defaults.fromName;
      defaults.fromEmail = saved.fromEmail || defaults.fromEmail;
      defaults.wave = Mail.WAVE_ORDER.includes(saved.wave) ? saved.wave : "test";
      defaults.filters = Object.assign(defaults.filters, saved.filters || {});
      defaults.excluded = Array.isArray(saved.excluded) ? saved.excluded : [];
      defaults.testRecipients = Array.isArray(saved.testRecipients) && saved.testRecipients.length
        ? saved.testRecipients
        : defaults.testRecipients;
      defaults.testVideoIds = Array.isArray(saved.testVideoIds) ? saved.testVideoIds.map(String) : [];
      Mail.WAVE_ORDER.forEach((id) => {
        defaults.waves[id] = mergeWave(defaults.waves[id], saved.waves && saved.waves[id]);
      });
      return defaults;
    } catch (error) {
      return defaults;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadVideos() {
    let bundled = (window.SWITCHTUBE_DATA && window.SWITCHTUBE_DATA.videos) || [];
    sourceLabel = (window.SWITCHTUBE_DATA && window.SWITCHTUBE_DATA.sourceFile) || "mitgelieferte Liste";
    try {
      const custom = JSON.parse(localStorage.getItem(DATA_KEY) || "null");
      if (custom && Array.isArray(custom.videos) && custom.videos.length) {
        bundled = custom.videos;
        sourceLabel = custom.sourceFile || "geladene Excel-Liste";
      }
    } catch (error) {
      /* Die mitgelieferte Liste bleibt aktiv. */
    }
    videos = bundled.map(Mail.normalizeVideo).filter((video) => video.title && video.url);
    if (!state.testVideoIds.length) {
      const sample = videos.find((video) => video.owner === "frank.sippach@fhnw.ch")
        || videos.find((video) => video.channelOwner === "frank.sippach@fhnw.ch")
        || videos[0];
      state.testVideoIds = sample ? [sample.id] : [];
      saveState();
    }
  }

  function currentWave() {
    return state.waves[state.wave];
  }

  function allowedSrcs() {
    return Object.entries(state.filters).filter((entry) => entry[1]).map((entry) => entry[0]);
  }

  function allRecipients() {
    return Mail.groupRecipients(videos, allowedSrcs());
  }

  function activeRecipients() {
    const excluded = new Set(state.excluded);
    return allRecipients().filter((recipient) => !excluded.has(recipient.email));
  }

  function testEmails() {
    return state.testRecipients.filter(Mail.isEmail);
  }

  function testEntries() {
    const wanted = new Set(state.testVideoIds.map(String));
    return videos.filter((video) => wanted.has(video.id)).map((video) => ({
      id: video.id,
      title: video.title,
      url: video.url,
      seen: video.seen,
      channel: video.channel,
      roles: [],
    }));
  }

  function messageFor(entries) {
    const wave = currentWave();
    return Mail.buildMessage({
      kicker: wave.kicker,
      subject: wave.subject,
      body: wave.body,
      action: wave.action,
      signature: wave.signature,
      deadline: state.wave === "test" ? "" : wave.deadline,
      entries,
      mode: state.wave === "test" ? "test" : "personal",
    });
  }

  function selectedTarget() {
    if (state.wave === "test") {
      const emails = testEmails();
      if (!emails.length) return null;
      if (!emails.includes(selectedEmail)) selectedEmail = emails[0];
      return { email: selectedEmail, entries: testEntries() };
    }
    const recipients = activeRecipients();
    if (!recipients.length) return null;
    const found = recipients.find((recipient) => recipient.email === selectedEmail) || recipients[0];
    selectedEmail = found.email;
    return found;
  }

  function deliveryList() {
    if (state.wave === "test") {
      const entries = testEntries();
      return testEmails().map((email) => ({ email, entries }));
    }
    return activeRecipients();
  }

  function setStatus(text) {
    $("status-line").textContent = text;
  }

  function readForm() {
    if (filling) return;
    state.fromName = $("from-name").value.trim();
    state.fromEmail = $("from-email").value.trim();
    const wave = currentWave();
    wave.kicker = $("field-kicker").value;
    wave.subject = $("field-subject").value;
    wave.body = $("field-body").value;
    wave.action = $("field-action").value;
    wave.signature = $("field-signature").value;
    wave.deadline = $("field-deadline").value;
    if (state.wave === "test") {
      const parsed = Mail.parseRecipientText($("test-recipients").value);
      state.testRecipients = parsed.emails;
    }
    saveState();
    renderPreview();
    renderWaves();
    renderActionBar();
  }

  function fillForm() {
    filling = true;
    const wave = currentWave();
    $("from-name").value = state.fromName;
    $("from-email").value = state.fromEmail;
    $("field-kicker").value = wave.kicker;
    $("field-subject").value = wave.subject;
    $("field-body").value = wave.body;
    $("field-action").value = wave.action;
    $("field-signature").value = wave.signature;
    $("field-deadline").value = wave.deadline || "";
    $("test-recipients").value = state.testRecipients.join("\n");
    $("filter-ma").checked = !!state.filters.MA;
    $("filter-st").checked = !!state.filters.ST;
    $("filter-ext").checked = !!state.filters.EXT;
    $("deadline-wrap").classList.toggle("d-none", state.wave === "test");
    $("test-audience").classList.toggle("d-none", state.wave !== "test");
    $("live-audience").classList.toggle("d-none", state.wave === "test");
    filling = false;
  }

  function renderWaves() {
    const host = $("wave-cards");
    host.innerHTML = Mail.WAVE_ORDER.map((id) => {
      const meta = Mail.WAVE_META[id];
      const wave = state.waves[id];
      const sent = wave.sentAt
        ? `<span class="badge text-bg-success sent-pill">Verschickt ${escapeText(formatStamp(wave.sentAt))}</span>`
        : `<span class="badge text-bg-light sent-pill">Noch offen</span>`;
      return `<div class="col-md-6 col-xl-3">
        <button class="wave-card ${state.wave === id ? "active" : ""}" type="button" data-wave="${id}" style="--wave:${id === "test" || id === "e1" ? "var(--test)" : id === "e2" ? "var(--e2)" : "var(--e3)"}">
          <div class="d-flex justify-content-between gap-2 mb-1"><span class="wave-label">${meta.label}</span>${sent}</div>
          <div class="small text-secondary">${meta.hint}</div>
          <div class="wave-subject mt-2">${escapeText(wave.subject || "Ohne Betreff")}</div>
        </button>
      </div>`;
    }).join("");
  }

  function escapeText(value) {
    return Mail.escapeHtml(value);
  }

  function formatStamp(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
  }

  function renderBanner() {
    const banner = $("mode-banner");
    const meta = Mail.WAVE_META[state.wave];
    if (state.wave === "test") {
      banner.className = "mode-banner test mb-3";
      banner.textContent = "Testmodus. Es gehen keine Mails an die Dozierenden. Dieselben Beispielinhalte gehen nur an die Testadressen.";
    } else {
      banner.className = "mode-banner live mb-3";
      banner.textContent = `${meta.label}: jede Person erhält nur die Videos, bei denen sie als Video- oder Kanaladresse eingetragen ist.`;
    }
    $("editor-title").textContent = `Text für ${meta.label}`;
    $("editor-hint").textContent = state.wave === "test"
      ? "Der Text stammt aus der Testanfrage. Die Videoliste wird unter dem Text automatisch ergänzt."
      : "Entwurf zum Anpassen. Die Videoliste, der Link und der letzte Aufruf werden automatisch eingesetzt.";
  }

  function renderPreview() {
    const target = selectedTarget();
    const from = `${state.fromName} <${state.fromEmail}>`;
    $("preview-from").textContent = from;
    $("preview-subject").textContent = currentWave().subject || "(ohne Betreff)";
    if (!target) {
      $("preview-to").textContent = "Niemand ausgewählt";
      $("preview-frame").srcdoc = "<p style='font-family:sans-serif;padding:24px;'>Keine Empfänger für diese Auswahl.</p>";
      return;
    }
    $("preview-to").textContent = target.email;
    const message = messageFor(target.entries || target.videos || []);
    $("preview-frame").srcdoc = message.html;
  }

  function renderAudience() {
    if (state.wave === "test") {
      $("audience-title").textContent = "Testempfänger";
      $("audience-lead").textContent = "Frank schickt den Test zuerst an diese fünf Adressen und bittet um Weiterleitung als Rückmeldung.";
      renderVideoPicker();
      return;
    }
    const everyone = Mail.groupRecipients(videos, ["MA", "ST", "EXT"]);
    const buckets = { MA: 0, ST: 0, EXT: 0 };
    everyone.forEach((person) => {
      if (person.srcs.includes("MA")) buckets.MA += 1;
      else if (person.srcs.includes("ST")) buckets.ST += 1;
      else buckets.EXT += 1;
    });
    $("count-ma").textContent = `(${buckets.MA})`;
    $("count-st").textContent = `(${buckets.ST})`;
    $("count-ext").textContent = `(${buckets.EXT})`;
    const recipients = allRecipients();
    const active = recipients.filter((recipient) => !state.excluded.includes(recipient.email));
    $("audience-title").textContent = "Wer diese Runde erhält";
    $("audience-lead").textContent = `${active.length} von ${everyone.length} Personen sind angewählt, ${videos.length} Videos in der Liste. Dieselbe Adresse bekommt ein Video nur einmal, auch wenn sie Video und Kanal besitzt. Studierende stehen mit in der Excel-Liste. Für einen Versand nur an Mitarbeitende die anderen Schalter ausschalten.`;
    const query = $("recipient-search").value.trim().toLowerCase();
    const rows = recipients.filter((recipient) => {
      if (!query) return true;
      if (recipient.email.includes(query)) return true;
      return recipient.videos.some((video) => video.title.toLowerCase().includes(query));
    });
    const sent = new Set(currentWave().sentTo || []);
    $("recipient-rows").innerHTML = rows.map((recipient) => {
      const excluded = state.excluded.includes(recipient.email);
      const activeRow = recipient.email === selectedEmail ? "active" : "";
      const groups = recipient.srcs.map((src) => Mail.srcLabel(src)).join(", ");
      const first = recipient.videos[0] ? recipient.videos[0].title : "";
      const mark = sent.has(recipient.email) ? " · im Protokoll" : "";
      return `<tr class="${activeRow}" data-email="${escapeText(recipient.email)}">
        <td>${escapeText(recipient.email)}${excluded ? " · ausgelassen" : ""}${mark}</td>
        <td>${recipient.videos.length}</td>
        <td>${escapeText(groups)}</td>
        <td>${escapeText(first)}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-secondary" type="button" data-exclude="${escapeText(recipient.email)}">${excluded ? "wieder aufnehmen" : "auslassen"}</button></td>
      </tr>`;
    }).join("") || `<tr><td colspan="5" class="text-secondary">Keine Person passt zur Auswahl.</td></tr>`;
    $("source-note").textContent = `Grundlage: ${sourceLabel}. Eine neuere Liste ersetzt die Daten nur in diesem Browser.`;
  }

  function renderVideoPicker() {
    const query = $("video-search").value.trim().toLowerCase();
    const hits = query
      ? videos.filter((video) => (
        video.title.toLowerCase().includes(query)
        || video.owner.includes(query)
        || video.id === query
      )).slice(0, 8)
      : [];
    $("video-hits").innerHTML = hits.map((video) => `
      <button class="search-hit" type="button" data-video="${escapeText(video.id)}">
        <strong>${escapeText(video.title)}</strong>
        <span class="d-block small text-secondary">${escapeText(video.owner)} · zuletzt ${escapeText(Mail.formatSeen(video.seen) || "kein Aufruf")}</span>
      </button>`).join("");
    const selected = testEntries();
    $("video-chips").innerHTML = selected.map((video) => `
      <span class="chip">${escapeText(video.title)}
        <button type="button" data-remove-video="${escapeText(video.id)}" aria-label="Video entfernen">×</button>
      </span>`).join("") || `<span class="text-secondary small">Noch kein Beispielvideo gewählt.</span>`;
  }

  function renderActionBar() {
    const list = deliveryList();
    const meta = Mail.WAVE_META[state.wave];
    $("action-summary").textContent = `${meta.label}: ${list.length} ${list.length === 1 ? "E-Mail" : "E-Mails"}`;
  }

  function render() {
    fillForm();
    renderWaves();
    renderBanner();
    renderAudience();
    renderPreview();
    renderActionBar();
  }

  function problems() {
    const issues = [];
    if (!Mail.isEmail(state.fromEmail)) issues.push("Die Absenderadresse ist ungültig.");
    if (!currentWave().subject.trim()) issues.push("Der Betreff ist leer.");
    const list = deliveryList();
    if (!list.length) issues.push("Es gibt keine Empfänger für diese Auswahl.");
    if (state.wave === "test" && !testEntries().length) issues.push("Bitte mindestens ein Beispielvideo wählen.");
    if (state.wave === "test") {
      const invalid = Mail.parseRecipientText($("test-recipients").value).invalid;
      if (invalid.length) issues.push(`Diese Testadressen sind ungültig: ${invalid.join(", ")}`);
    }
    return issues;
  }

  function guard() {
    const issues = problems();
    if (!issues.length) return true;
    setStatus(issues[0]);
    return false;
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1500);
  }

  function emlFor(recipient) {
    const message = messageFor(recipient.entries || recipient.videos || []);
    return Mail.buildEml({
      fromName: state.fromName,
      fromEmail: state.fromEmail,
      to: recipient.email,
      subject: message.subject,
      html: message.html,
    });
  }

  function fileBase() {
    const names = { test: "Test", e1: "Erinnerung-1", e2: "Erinnerung-2", e3: "Erinnerung-3" };
    return `SWITCHtube-${names[state.wave]}`;
  }

  function saveOne() {
    if (!guard()) return;
    const target = selectedTarget();
    const blob = new Blob([emlFor(target)], { type: "message/rfc822" });
    const filename = `${fileBase()}-${Mail.slugEmail(target.email)}.eml`;
    downloadBlob(blob, filename);
    setStatus(`Gespeichert: ${filename}. Rechtsklick auf die Datei, «Öffnen mit», Microsoft Outlook, dann Senden.`);
  }

  function askConfirm(title, body, action) {
    $("confirm-title").textContent = title;
    $("confirm-body").textContent = body;
    confirmAction = action;
    confirmModal.show();
  }

  async function buildZip(kind) {
    const list = deliveryList();
    await showProgress();
    const zip = new JSZip();
    const folderName = fileBase();
    if (kind === "eml") {
      const folder = zip.folder(folderName);
      for (let index = 0; index < list.length; index += 1) {
        const recipient = list[index];
        const name = `${String(index + 1).padStart(4, "0")}-${Mail.slugEmail(recipient.email)}.eml`;
        folder.file(name, emlFor(recipient));
        if (index % 20 === 0) {
          updateProgress(index, list.length, "E-Mail-Dateien werden gepackt …");
          await pause();
        }
      }
      folder.file("Bitte-lesen.txt", Mail.utf8Bom([
        "Jede Datei ist eine E-Mail.",
        "Auf dem Mac: Rechtsklick, Öffnen mit, Microsoft Outlook, dann auf Senden klicken.",
        "Ein normaler Doppelklick öffnet die Datei manchmal in der App Mail.",
        "Für viele Mails in der Browser-Seite den Knopf «Outlook auf dem Mac» verwenden.",
        "",
      ].join("\r\n")));
    } else {
      const root = zip.folder(folderName);
      root.file("Mails senden.command", Mail.MAC_COMMAND, { unixPermissions: 0o755 });
      root.file("Bitte-lesen.txt", Mail.utf8Bom(Mail.outlookReadme({
        waveLabel: Mail.WAVE_META[state.wave].label,
        count: list.length,
        fromEmail: state.fromEmail,
      })));
      const mails = root.folder("mails");
      for (let index = 0; index < list.length; index += 1) {
        const recipient = list[index];
        const message = messageFor(recipient.entries || recipient.videos || []);
        const stem = String(index + 1).padStart(4, "0");
        const subject = message.subject.replace(/[\r\n]+/g, " ").trim();
        mails.file(`${stem}.meta`, `${recipient.email}\n${subject}\n`);
        mails.file(`${stem}.html`, message.html);
        if (index % 20 === 0) {
          updateProgress(index, list.length, "Outlook-Paket wird gepackt …");
          await pause();
        }
      }
    }
    updateProgress(list.length, list.length, "Datei wird gespeichert …");
    const blob = await zip.generateAsync({ type: "blob", platform: "UNIX" });
    const suffix = kind === "eml" ? "E-Mails.zip" : "Outlook-Mac.zip";
    downloadBlob(blob, `${folderName}-${suffix}`);
    await hideProgress();
    setStatus(`Gespeichert: ${folderName}-${suffix}. ZIP öffnen und dem Hinweis in Bitte-lesen.txt folgen.`);
  }

  function updateProgress(done, total, label) {
    const percent = total ? Math.round((done / total) * 100) : 0;
    $("progress-label").textContent = `${label} ${done} von ${total}`;
    $("progress-bar").style.width = `${percent}%`;
  }

  function pause() {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function whenModal(id, eventName) {
    return new Promise((resolve) => {
      const element = $(id);
      const done = () => {
        element.removeEventListener(eventName, done);
        resolve();
      };
      element.addEventListener(eventName, done);
    });
  }

  async function afterShown(modal, id) {
    if (modal._isShown && !modal._isTransitioning) return;
    await new Promise((resolve) => {
      const element = $(id);
      const done = () => {
        element.removeEventListener("shown.bs.modal", done);
        resolve();
      };
      element.addEventListener("shown.bs.modal", done);
      if (modal._isShown && !modal._isTransitioning) done();
    });
  }

  async function hideModal(modal, id) {
    const element = $(id);
    if (!element.classList.contains("show") && !modal._isTransitioning && !modal._isShown) return;
    await afterShown(modal, id);
    const hidden = whenModal(id, "hidden.bs.modal");
    modal.hide();
    await hidden;
  }

  async function showProgress() {
    const shown = whenModal("progress-modal", "shown.bs.modal");
    progressModal.show();
    await shown;
  }

  function hideProgress() {
    return hideModal(progressModal, "progress-modal");
  }

  function hideConfirm() {
    return hideModal(confirmModal, "confirm-modal");
  }

  function saveZip() {
    if (!guard()) return;
    const list = deliveryList();
    if (state.wave === "test") {
      buildZip("eml");
      return;
    }
    askConfirm(
      "Echte Runde speichern?",
      `Es werden ${list.length} persönliche E-Mails erzeugt. Die Testadressen sind darin nicht automatisch enthalten. Jede Person erhält nur die eigenen Videos.`,
      () => buildZip("eml"),
    );
  }

  function saveOutlook() {
    if (!guard()) return;
    const list = deliveryList();
    const text = `Das Paket enthält ${list.length} E-Mails für Outlook auf dem Mac. Nach dem Entpacken «Mails senden.command» doppelklicken. «Nur Entwürfe» legt sie zum Prüfen ab, «Jetzt senden» verschickt sie sofort. Beim ersten Mal darf das Terminal Outlook steuern.`;
    askConfirm("Outlook-Paket für den Mac speichern?", text, () => buildZip("outlook"));
  }

  function markSent() {
    const list = deliveryList();
    if (!list.length) {
      setStatus("Es gibt nichts zu markieren.");
      return;
    }
    askConfirm(
      "Runde als verschickt markieren?",
      `${list.length} Adressen werden in diesem Browser als verschickt gespeichert. Das verschickt selbst noch keine E-Mail.`,
      () => {
        const wave = currentWave();
        wave.sentAt = new Date().toISOString();
        wave.sentTo = [...new Set([...(wave.sentTo || []), ...list.map((item) => item.email)])];
        saveState();
        render();
        setStatus(`${Mail.WAVE_META[state.wave].label} ist als verschickt markiert.`);
      },
    );
  }

  function copyText() {
    const target = selectedTarget();
    if (!target) return;
    const message = messageFor(target.entries || target.videos || []);
    const text = `An: ${target.email}\nBetreff: ${message.subject}\n\n${message.text}`;
    $("copy-area").value = text;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setStatus("Nur-Text ist in der Zwischenablage.");
      }).catch(() => copyModal.show());
    } else {
      copyModal.show();
    }
  }

  function importExcel(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const book = XLSX.read(reader.result, { type: "array", cellDates: true });
        const sheet = book.Sheets[book.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        const parsed = Mail.parseRows(rows);
        if (!parsed.length) {
          setStatus("In der Datei wurden keine Videozeilen erkannt. Die Spaltennamen müssen zur bisherigen Liste passen.");
          return;
        }
        videos = parsed;
        sourceLabel = file.name;
        try {
          localStorage.setItem(DATA_KEY, JSON.stringify({ sourceFile: file.name, videos }));
        } catch (error) {
          setStatus("Die Liste ist geladen, passt aber nicht in den Speicher des Browsers. Nach einem Neuladen gilt wieder die mitgelieferte Liste.");
        }
        render();
        setStatus(`${parsed.length} Videos aus ${file.name} geladen.`);
      } catch (error) {
        setStatus("Die Excel-Datei konnte nicht gelesen werden.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function importLog(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").replace(/^\uFEFF/, "");
      const emails = [];
      text.split(/\r?\n/).slice(1).forEach((line) => {
        const [email, status] = line.split(";");
        if (email && (!status || status.trim() === "ok")) emails.push(email.trim().toLowerCase());
      });
      const wave = currentWave();
      wave.sentTo = [...new Set([...(wave.sentTo || []), ...emails])];
      if (emails.length) wave.sentAt = wave.sentAt || new Date().toISOString();
      saveState();
      render();
      setStatus(`${emails.length} Adressen aus dem Protokoll übernommen.`);
    };
    reader.readAsText(file, "utf-8");
  }

  function exportCsv() {
    const rows = [["E-Mail", "Anzahl Videos", "Gruppe", "Ausgelassen", "Im Protokoll"]];
    const sent = new Set(currentWave().sentTo || []);
    allRecipients().forEach((recipient) => {
      rows.push([
        recipient.email,
        String(recipient.videos.length),
        recipient.srcs.map(Mail.srcLabel).join(", "),
        state.excluded.includes(recipient.email) ? "ja" : "nein",
        sent.has(recipient.email) ? "ja" : "nein",
      ]);
    });
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${fileBase()}-Empfaenger.csv`);
    setStatus("Empfängerliste gespeichert. Semikolon als Trennzeichen, damit Excel sie direkt öffnet.");
  }

  function csvCell(value) {
    const text = String(value ?? "");
    if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function bind() {
    document.body.addEventListener("input", (event) => {
      if (event.target.closest(".panel, #audience")) readForm();
    });
    $("wave-cards").addEventListener("click", (event) => {
      const button = event.target.closest("[data-wave]");
      if (!button) return;
      state.wave = button.dataset.wave;
      selectedEmail = "";
      saveState();
      render();
    });
    ["filter-ma", "filter-st", "filter-ext"].forEach((id) => {
      $(id).addEventListener("change", () => {
        state.filters.MA = $("filter-ma").checked;
        state.filters.ST = $("filter-st").checked;
        state.filters.EXT = $("filter-ext").checked;
        saveState();
        renderAudience();
        renderPreview();
        renderActionBar();
      });
    });
    $("recipient-search").addEventListener("input", renderAudience);
    $("video-search").addEventListener("input", renderVideoPicker);
    $("recipient-rows").addEventListener("click", (event) => {
      const exclude = event.target.closest("[data-exclude]");
      if (exclude) {
        const email = exclude.dataset.exclude;
        if (state.excluded.includes(email)) state.excluded = state.excluded.filter((item) => item !== email);
        else state.excluded.push(email);
        saveState();
        renderAudience();
        renderPreview();
        renderActionBar();
        return;
      }
      const row = event.target.closest("[data-email]");
      if (!row) return;
      selectedEmail = row.dataset.email;
      renderAudience();
      renderPreview();
    });
    $("video-hits").addEventListener("click", (event) => {
      const button = event.target.closest("[data-video]");
      if (!button) return;
      if (!state.testVideoIds.includes(button.dataset.video) && state.testVideoIds.length < 12) {
        state.testVideoIds.push(button.dataset.video);
      }
      $("video-search").value = "";
      saveState();
      renderVideoPicker();
      renderPreview();
    });
    $("video-chips").addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-video]");
      if (!button) return;
      state.testVideoIds = state.testVideoIds.filter((id) => id !== button.dataset.removeVideo);
      saveState();
      renderVideoPicker();
      renderPreview();
    });
    $("reset-wave").addEventListener("click", () => {
      const fresh = Mail.defaultSettings().waves[state.wave];
      state.waves[state.wave] = fresh;
      saveState();
      render();
      setStatus("Der Standardtext dieser Runde ist wiederhergestellt.");
    });
    $("save-one").addEventListener("click", saveOne);
    $("save-zip").addEventListener("click", saveZip);
    $("save-outlook").addEventListener("click", saveOutlook);
    $("mark-sent").addEventListener("click", markSent);
    $("copy-text").addEventListener("click", copyText);
    $("confirm-ok").addEventListener("click", async () => {
      const action = confirmAction;
      confirmAction = null;
      await hideConfirm();
      if (action) await action();
    });
    $("import-excel").addEventListener("click", () => $("excel-file").click());
    $("excel-file").addEventListener("change", () => {
      const file = $("excel-file").files[0];
      if (file) importExcel(file);
      $("excel-file").value = "";
    });
    $("import-log").addEventListener("click", () => $("log-file").click());
    $("log-file").addEventListener("change", () => {
      const file = $("log-file").files[0];
      if (file) importLog(file);
      $("log-file").value = "";
    });
    $("export-csv").addEventListener("click", exportCsv);
    $("reset-data").addEventListener("click", () => {
      localStorage.removeItem(DATA_KEY);
      loadVideos();
      render();
      setStatus("Wieder die mitgelieferte Liste vom 4. Mai 2026.");
    });
  }

  state = loadState();
  loadVideos();
  bind();
  render();
})();
