// Builds spam_list.csv, the file every Teleph0ne phone downloads.
//
//   node scripts/build.mjs          fetch the reports, merge the data/ files, write spam_list.csv
//   node scripts/build.mjs --check  only validate the data/ files (used on pull requests)
//
// Sources, later ones override earlier ones:
//   1. the Teleph0ne report service: numbers reported by several phones, plus the US FTC data
//   2. data/ranges.csv: official telemarketing ranges
//   3. data/additions.csv: reviewed additions from pull requests
//   4. data/removals.csv: numbers that must never be listed (wrongly reported)
import { readFileSync, writeFileSync } from "node:fs";

const REPORTS_URL = "https://teleph0ne.ram0nes.com/spam_list.csv";
const CATEGORIES = new Set(["spam", "scam", "telemarketing", "robocall"]);
const NUMBER = /^\+[1-9][0-9]{7,14}$/;
const RANGE = /^\+[1-9][0-9]{1,9}$/;

/** Rows of a data file, without the header, blank lines and # comments. */
function rows(path) {
  return readFileSync(path, "utf8")
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(",").map((f) => f.trim()));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readData() {
  const ranges = rows("data/ranges.csv").map(([prefix, country, source], i) => {
    if (!RANGE.test(prefix ?? "")) fail(`data/ranges.csv line ${i + 2}: "${prefix}" is not a prefix like +33162`);
    if (!country || !source) fail(`data/ranges.csv line ${i + 2}: country and source are required`);
    return prefix;
  });
  const additions = rows("data/additions.csv").map(([number, severity, category, source], i) => {
    const where = `data/additions.csv line ${i + 2}`;
    if (!NUMBER.test(number ?? "")) fail(`${where}: "${number}" is not an international number like +33612345678`);
    if (!["1", "2", "3", "5"].includes(severity)) fail(`${where}: severity must be 1, 2, 3 or 5`);
    if (!CATEGORIES.has(category)) fail(`${where}: category must be one of ${[...CATEGORIES].join(", ")}`);
    if (!source) fail(`${where}: a source (link or explanation) is required`);
    return [number, Number(severity), category];
  });
  const removals = rows("data/removals.csv").map(([number], i) => {
    if (!NUMBER.test(number ?? "") && !RANGE.test((number ?? "").replace(/\*$/, ""))) {
      fail(`data/removals.csv line ${i + 2}: "${number}" is not an international number`);
    }
    return number;
  });
  return { ranges, additions, removals };
}

async function fetchReports() {
  // The report service is sometimes briefly unavailable; retry before giving up.
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const res = await fetch(REPORTS_URL);
      if (res.ok) return await res.text();
      console.warn(`Attempt ${attempt}: HTTP ${res.status}`);
    } catch (e) {
      console.warn(`Attempt ${attempt}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, attempt * 5000));
  }
  fail("The report service could not be reached; keeping the previous spam_list.csv.");
}

const data = readData();
if (process.argv.includes("--check")) {
  console.log(`OK: ${data.ranges.length} ranges, ${data.additions.length} additions, ${data.removals.length} removals`);
  process.exit(0);
}

const entries = new Map();
for (const line of (await fetchReports()).split(/\r?\n/).slice(1)) {
  const [number, severity, category] = line.split(",");
  if (number && Number(severity) >= 1 && CATEGORIES.has(category)) entries.set(number, [Number(severity), category]);
}
const reported = entries.size;
for (const prefix of data.ranges) entries.set(`${prefix}*`, [2, "telemarketing"]);
for (const [number, severity, category] of data.additions) entries.set(number, [severity, category]);
for (const number of data.removals) entries.delete(number);

const csv =
  ["number,severity,category", ...[...entries.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([n, [s, c]]) => `${n},${s},${c}`)].join("\n") +
  "\n";
writeFileSync("spam_list.csv", csv);
console.log(`spam_list.csv: ${entries.size} entries (${reported} from the report service)`);
