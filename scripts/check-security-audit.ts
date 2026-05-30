import { execFileSync } from "node:child_process";

type AuditVia = string | { name?: string; title?: string; url?: string; severity?: string };
type AuditVulnerability = {
  name: string;
  severity: "info" | "low" | "moderate" | "high" | "critical";
  via?: AuditVia[];
};
type AuditReport = {
  vulnerabilities?: Record<string, AuditVulnerability>;
};

const allowedModerateAdvisories = [
  {
    packageName: "postcss",
    viaName: "postcss",
    title: "PostCSS has XSS via Unescaped </style> in its CSS Stringify Output",
  },
  {
    packageName: "next",
    viaName: "postcss",
  },
];

function runAudit() {
  try {
    return execFileSync("npm", ["audit", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    const stdout = (error as { stdout?: Buffer | string }).stdout;
    if (!stdout) throw error;
    return Buffer.isBuffer(stdout) ? stdout.toString("utf8") : stdout;
  }
}

function viaMatches(via: AuditVia, expectedName: string) {
  if (typeof via === "string") return via === expectedName;
  return via.name === expectedName || via.title?.includes(expectedName) || via.url?.includes(expectedName);
}

function isAllowedModerate(vulnerability: AuditVulnerability) {
  return allowedModerateAdvisories.some((allowed) => {
    if (vulnerability.name !== allowed.packageName) return false;
    if (!allowed.viaName) return true;
    return (vulnerability.via || []).some((via) => viaMatches(via, allowed.viaName));
  });
}

const report = JSON.parse(runAudit()) as AuditReport;
const vulnerabilities = Object.values(report.vulnerabilities || {});
const blockers = vulnerabilities.filter((vulnerability) => {
  if (vulnerability.severity === "high" || vulnerability.severity === "critical") return true;
  if (vulnerability.severity === "moderate") return !isAllowedModerate(vulnerability);
  return false;
});

if (blockers.length > 0) {
  console.error("Security audit failed. Review these vulnerabilities:");
  for (const vulnerability of blockers) {
    console.error(`- ${vulnerability.name}: ${vulnerability.severity}`);
  }
  process.exit(1);
}

const allowedModerates = vulnerabilities.filter((vulnerability) => vulnerability.severity === "moderate" && isAllowedModerate(vulnerability));
console.log(`Security audit passed (${allowedModerates.length} known moderate advisory entries allowed).`);
