const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const context = { console, TextEncoder, TextDecoder, btoa, atob, Uint8Array, Array, Set, Map, Date, JSON, Math, Number, String, Object, RegExp };
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "data.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "mail.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "vendor/xlsx.full.min.js"), "utf8"), context);

const Mail = context.SwitchtubeMail;
const videos = context.SWITCHTUBE_DATA.videos.map(Mail.normalizeVideo);
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error("FAIL", message);
  }
}

assert(videos.length === 6816, `expected 6816 videos, got ${videos.length}`);

const all = Mail.groupRecipients(videos, ["MA", "ST", "EXT"]);
assert(all.length === 823, `expected 823 recipients, got ${all.length}`);

const frank = all.find((person) => person.email === "frank.sippach@fhnw.ch");
assert(frank && frank.videos.length === 115, `Frank should have 115 videos, got ${frank && frank.videos.length}`);

const staff = Mail.groupRecipients(videos, ["MA"]);
const students = Mail.groupRecipients(videos, ["ST"]);
assert(staff.length < all.length, "staff filter should be smaller than everyone");
assert(students.every((person) => person.email.endsWith("@students.fhnw.ch") || person.srcs.includes("ST")), "student filter leaked");
assert(!students.some((person) => person.email === "frank.sippach@fhnw.ch"), "Frank is not a student recipient");

const sample = [
  { id: "1", title: "<script>alert(1)</script>", owner: "a@fhnw.ch", ownerSrc: "MA", url: "https://tube.switch.ch/videos/aaa", seen: "", channel: "Kanal", channelOwner: "a@fhnw.ch", channelSrc: "MA" },
  { id: "2", title: "Zweitens", owner: "a@fhnw.ch", ownerSrc: "MA", url: "https://tube.switch.ch/videos/bbb", seen: "2020-01-02", channel: "Kanal", channelOwner: "b@fhnw.ch", channelSrc: "MA" },
  { id: "3", title: "Student", owner: "s@students.fhnw.ch", ownerSrc: "ST", url: "https://tube.switch.ch/videos/ccc", seen: "2019-05-01", channel: "K", channelOwner: "s@students.fhnw.ch", channelSrc: "ST" },
];
const grouped = Mail.groupRecipients(sample, ["MA", "ST", "EXT"]);
const personA = grouped.find((person) => person.email === "a@fhnw.ch");
const personB = grouped.find((person) => person.email === "b@fhnw.ch");
assert(personA.videos.length === 2, "same owner is not duplicated, second video included");
assert(personA.videos[0].title.startsWith("<script>"), "unseen video is sorted first");
assert(personA.videos[0].roles.includes("video") && personA.videos[0].roles.includes("channel"), "both roles on the same address");
assert(personB.videos.length === 1 && personB.videos[0].roles.join() === "channel", "channel owner receives the video once");

const defaults = Mail.defaultSettings();
assert(defaults.waves.test.body.includes("Liebes Team"), "test greeting missing");
assert(defaults.waves.test.body.includes("100'000 Videos"), "test context missing");
assert(defaults.waves.test.body.includes("an mich weiterleiten"), "test request missing");
assert(defaults.testRecipients.length === 5, "five test addresses");
["frank.sippach@fhnw.ch", "sebastian.linxen@fhnw.ch", "evelyn.kopec@fhnw.ch", "bela.ackermann@fhnw.ch", "silvan.albicker@fhnw.ch"]
  .forEach((email) => assert(defaults.testRecipients.includes(email), `missing ${email}`));

const message = Mail.buildMessage({
  kicker: "Testnachricht",
  subject: defaults.waves.test.subject,
  body: defaults.waves.test.body,
  action: "",
  signature: "",
  deadline: "",
  mode: "test",
  entries: [{ title: frank.videos[0].title, url: frank.videos[0].url, seen: frank.videos[0].seen, channel: frank.videos[0].channel, roles: [] }],
});
assert(message.html.includes("btn btn-primary"), "bootstrap button class missing");
assert(message.html.includes("table"), "table markup missing");
assert(message.html.includes("Video auf SWITCHtube öffnen"), "open button missing");
assert(message.html.includes(frank.videos[0].url), "video url missing");
assert(!message.html.includes("<script>"), "raw script tag leaked into a normal mail");
assert(message.text.includes("Liebes Team"), "plain text lost the greeting");

const hostile = Mail.buildMessage({
  kicker: "Erste Information",
  subject: "Betreff",
  body: "Guten Tag",
  action: "",
  signature: "",
  deadline: "2026-06-15",
  mode: "personal",
  entries: personA.videos,
});
assert(hostile.html.includes("&lt;script&gt;"), "title was not escaped");
assert(hostile.html.includes("15. Juni 2026"), "deadline was not rendered");
assert(hostile.html.includes("Ihre Rolle"), "role missing for a single personal video");
assert(Mail.deadlineSentence("2026-06-15") === "Bitte melden Sie sich bis zum 15. Juni 2026.", Mail.deadlineSentence("2026-06-15"));

const eml = Mail.buildEml({
  fromName: "Frank Sippach",
  fromEmail: "frank.sippach@fhnw.ch",
  to: "bela.ackermann@fhnw.ch",
  subject: "Test: Grüsse",
  html: message.html,
});
assert(eml.startsWith("X-Unsent: 1\r\n"), "eml must open as an unsent Outlook draft");
assert(eml.includes("To: bela.ackermann@fhnw.ch"), "recipient missing");
assert(eml.includes("Subject: =?UTF-8?B?"), "non-ascii subject was not encoded");
const payload = eml.split("\r\n\r\n")[1].replace(/\r\n/g, "");
const decoded = Buffer.from(payload, "base64").toString("utf8");
assert(decoded.includes("Liebes Team"), "eml body did not decode to the letter");
assert(decoded.includes(frank.videos[0].url), "eml body lost the link");

assert(Mail.POWERSHELL.includes("param("), "powershell script missing");
assert(Mail.POWERSHELL.includes("ValidateSet('senden','entwurf')"), "powershell mode switch missing");
assert(Mail.VBS.includes("-Modus"), "launcher does not pass the mode");
assert(!Mail.POWERSHELL.includes("`r"), "powershell script contains a broken escape");
assert(Mail.VBS.includes("vbYesNoCancel"), "windows launcher missing the question dialog");

const bettina = all.find((person) => person.email === "bettina.schneider@fhnw.ch");
const bettinaMail = Mail.buildMessage({
  kicker: "Erste Information",
  subject: "SWITCHtube",
  body: "Guten Tag",
  action: "Bitte antworten.",
  signature: "Frank",
  deadline: "",
  mode: "personal",
  entries: bettina.videos,
});
const bettinaLinks = bettinaMail.html.match(/https:\/\/tube\.switch\.ch\/videos\/[A-Za-z0-9]+/g) || [];
assert(bettina.videos.length === 466, `Bettina should have 466 videos, got ${bettina.videos.length}`);
assert(new Set(bettinaLinks).size === 466, `Bettina mail lost links: ${new Set(bettinaLinks).size}`);
assert(bettinaMail.html.includes("466 Videos"), "summary count missing");

const book = context.XLSX.read(fs.readFileSync(path.join(root, "quelle/2026-05-04_Detail_HSW.xlsx")), { type: "buffer", cellDates: true });
const rows = context.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: "" });
const parsed = Mail.parseRows(rows);
assert(parsed.length === 6816, `excel import parsed ${parsed.length}`);
const first = parsed.find((video) => video.title === "Video #1: Please watch full screen");
assert(first && first.seen === "2021-03-26", `excel date shifted: ${first && first.seen}`);
assert(first.owner === "safak.korkut@fhnw.ch", "excel owner mapping failed");
assert(first.url === "https://tube.switch.ch/videos/a5aa2097", "excel url mapping failed");

if (failed) {
  console.error(`${failed} checks failed`);
  process.exit(1);
}
console.log(`ok: ${videos.length} videos, ${all.length} people, ${staff.length} staff, ${students.length} students`);
