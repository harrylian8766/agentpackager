import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface CheckResult {
  name: string;
  status: "ok" | "warn" | "error" | "info";
  message: string;
  fix?: string;
}

/**
 * Run comprehensive environment diagnostics
 */
export async function runDoctor(manifestPath?: string): Promise<void> {
  const results: CheckResult[] = [];

  console.log("\n  🔍 AgentPackager Doctor\n");

  // ── Node.js ──────────────────────────────────────────────────────────────
  try {
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1).split(".")[0]);
    if (major >= 20) {
      results.push({ name: "Node.js", status: "ok", message: `${nodeVersion} (>= 20)` });
    } else {
      results.push({ name: "Node.js", status: "error", message: `${nodeVersion} (need >= 20)`, fix: "Upgrade Node.js" });
    }
  } catch {
    results.push({ name: "Node.js", status: "error", message: "Cannot detect version" });
  }

  // ── TypeScript ───────────────────────────────────────────────────────────
  try {
    execSync("npx tsc --version", { stdio: "pipe" });
    results.push({ name: "TypeScript", status: "ok", message: "Available" });
  } catch {
    results.push({ name: "TypeScript", status: "warn", message: "Not found", fix: "npm install -D typescript" });
  }

  // ── Docker ───────────────────────────────────────────────────────────────
  try {
    const dockerVersion = execSync("docker --version", { stdio: "pipe", encoding: "utf-8" }).trim();
    results.push({ name: "Docker", status: "ok", message: dockerVersion });
  } catch {
    results.push({ name: "Docker", status: "warn", message: "Not found", fix: "Install Docker for container builds" });
  }

  // ── Manifest file ────────────────────────────────────────────────────────
  if (manifestPath) {
    const fullPath = resolve(manifestPath);
    if (existsSync(fullPath)) {
      results.push({ name: "Manifest", status: "ok", message: fullPath });

      // Try to parse
      try {
        const content = readFileSync(fullPath, "utf-8");
        // Check YAML validity
        if (content.includes("name:") && content.includes("version:")) {
          results.push({ name: "Manifest YAML", status: "ok", message: "Basic structure valid" });
        } else {
          results.push({ name: "Manifest YAML", status: "warn", message: "Missing required fields (name/version)" });
        }

        // Check capabilities
        const capMatches = content.match(/capabilities:/g);
        if (capMatches && content.includes("- id:")) {
          const capCount = (content.match(/- id:/g) || []).length;
          results.push({ name: "Capabilities", status: "ok", message: `${capCount} defined` });
        } else {
          results.push({ name: "Capabilities", status: "warn", message: "None defined", fix: "Add capabilities to manifest" });
        }

        // Check protocols
        const protocols = ["rest", "mcp", "websocket", "webhook"];
        const enabledProtocols = protocols.filter(p => {
          const re = new RegExp(`${p}:\\s*\\n\\s*enabled:\\s*true`);
          return re.test(content);
        });
        if (enabledProtocols.length > 0) {
          results.push({ name: "Protocols", status: "ok", message: `${enabledProtocols.join(", ")} enabled` });
        } else {
          results.push({ name: "Protocols", status: "warn", message: "None enabled", fix: "Enable at least one protocol" });
        }
      } catch (err: any) {
        results.push({ name: "Manifest Parse", status: "error", message: err.message });
      }
    } else {
      results.push({ name: "Manifest", status: "error", message: `Not found: ${fullPath}` });
    }
  } else {
    results.push({ name: "Manifest", status: "info", message: "No manifest specified (--manifest)" });
  }

  // ── Dependencies ─────────────────────────────────────────────────────────
  const pkgPath = join(process.cwd(), "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.dependencies?.yaml && pkg.dependencies?.express) {
        results.push({ name: "Dependencies", status: "ok", message: "Core deps installed" });
      } else {
        results.push({ name: "Dependencies", status: "warn", message: "Core deps missing", fix: "npm install" });
      }
    } catch {
      results.push({ name: "Dependencies", status: "warn", message: "Cannot parse package.json" });
    }
  } else {
    results.push({ name: "Dependencies", status: "warn", message: "No package.json in cwd" });
  }

  // ── Build output ─────────────────────────────────────────────────────────
  const distPath = join(process.cwd(), "dist");
  if (existsSync(distPath)) {
    const hasCli = existsSync(join(distPath, "src", "cli.js")) || existsSync(join(distPath, "cli.js"));
    if (hasCli) {
      results.push({ name: "Build", status: "ok", message: "Compiled" });
    } else {
      results.push({ name: "Build", status: "warn", message: "dist/ exists but missing cli.js", fix: "npm run build" });
    }
  } else {
    results.push({ name: "Build", status: "warn", message: "No dist/ directory", fix: "npm run build" });
  }

  // ── Git ──────────────────────────────────────────────────────────────────
  try {
    execSync("git --version", { stdio: "pipe" });
    results.push({ name: "Git", status: "ok", message: "Available" });
  } catch {
    results.push({ name: "Git", status: "warn", message: "Not found", fix: "Install Git" });
  }

  // ── Print results ────────────────────────────────────────────────────────
  console.log("  Check Results:\n");

  for (const r of results) {
    const icon = r.status === "ok" ? "✅" : r.status === "warn" ? "⚠️" : r.status === "error" ? "❌" : "ℹ️";
    console.log(`  ${icon} ${r.name.padEnd(15)} ${r.message}`);
    if (r.fix) {
      console.log(`     → Fix: ${r.fix}`);
    }
  }

  const errors = results.filter(r => r.status === "error").length;
  const warns = results.filter(r => r.status === "warn").length;
  const ok = results.filter(r => r.status === "ok").length;

  console.log(`\n  ────────────────────────────────────────`);
  console.log(`  Total: ${results.length} checks | ✅ ${ok} ok | ⚠️ ${warns} warns | ❌ ${errors} errors\n`);

  if (errors === 0 && warns === 0) {
    console.log("  🎉 All checks passed! Ready to build.\n");
    process.exit(0);
  } else if (errors > 0) {
    console.log("  ❌ Fix errors before building.\n");
    process.exit(1);
  } else {
    console.log("  ⚠️  Warnings present but build may work.\n");
    process.exit(0);
  }
}
