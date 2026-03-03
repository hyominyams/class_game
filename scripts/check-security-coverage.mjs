import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const checks = [
  {
    name: "middleware role gate",
    file: "lib/supabase/middleware.ts",
    patterns: ["getAllowedRolesForPath", "getDashboardPathForRole"],
  },
  {
    name: "teacher/admin actions guard",
    file: "app/actions/teacher-v2.ts",
    patterns: ["requireActor([\"teacher\", \"admin\"])"],
  },
  {
    name: "store action student guard",
    file: "app/actions/store.ts",
    patterns: ["requireActor([\"student\"])"],
  },
  {
    name: "tournament create guard",
    file: "app/actions/tournament.ts",
    patterns: ["requireActor([\"teacher\", \"admin\"])", "record_tournament_attempt_atomic"],
  },
  {
    name: "RLS hardening migration",
    file: "supabase/migrations/20260228153000_harden_rbac_rls_policies.sql",
    patterns: ["CREATE POLICY profiles_select_scope", "CREATE POLICY question_sets_select_scope"],
  },
  {
    name: "atomic purchase migration",
    file: "supabase/migrations/20260228152000_add_atomic_purchase_and_tournament_attempt_rpc.sql",
    patterns: ["CREATE OR REPLACE FUNCTION public.purchase_item_atomic", "CREATE OR REPLACE FUNCTION public.record_tournament_attempt_atomic"],
  },
];

const failures = [];

for (const check of checks) {
  const absolutePath = join(root, check.file);
  if (!existsSync(absolutePath)) {
    failures.push(`${check.name}: missing file ${check.file}`);
    continue;
  }

  const content = readFileSync(absolutePath, "utf8");
  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      failures.push(`${check.name}: missing pattern "${pattern}" in ${check.file}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Security coverage check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Security coverage check passed (${checks.length} checks).`);
