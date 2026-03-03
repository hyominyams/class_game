import { spawnSync } from "node:child_process";

const command = "npx --yes supabase@2.76.7 db dump --schema public --file public_schema.sql";
const result = spawnSync(command, {
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) {
  console.error("\nFailed to regenerate public_schema.sql.");
  console.error(
    "Run `npx supabase link --project-ref <project_ref>` first, then rerun `npm run db:dump:public`."
  );
  process.exit(result.status ?? 1);
}

console.log("public_schema.sql regenerated successfully.");
