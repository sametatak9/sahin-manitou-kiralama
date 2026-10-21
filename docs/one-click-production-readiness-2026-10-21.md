# Botu Başlat — production readiness (21 Oct 2026)

## Sources and scope

Read-only check of the production panel and Supabase project `utngxnqlcayfjkknaysx`. No bot-start action, task creation, payment or social action was performed.

- Production panel: https://embay-panel.vercel.app/?ops=bots
- PR #53: https://github.com/sametatak9/sahin-manitou-kiralama/pull/53
- Vercel deployment: https://vercel.com/sametatak9s-projects/embay-panel/DyPMScaa7vLMMLqodihmq4zZGfbq
- Main commit: `c11b66a434df75f58e2ae8ddbc42c27814052911`; state `READY`; the `embay-panel.vercel.app` alias is assigned to this deployment.
- Supabase `ops` Edge Function was updated to v112 for PR #53; existing function settings were preserved.

## What is live

The live Botlar UI contains the new **Botu başlat** action. The server-side flow requires all of the following: selected-company scope matches the bot, bot/company are active, an enabled task matches an assigned approved Academy-verified skill, tools are available through safe registered handlers, and the agency AI spend guard is enabled with a limit. If no eligible profile exists, backend code returns `BOT_PROFILE_NOT_READY`; it does not run an arbitrary prompt or choose an unverified skill.

## Read-only inventory result

A bounded production inventory query examined 21 non-archived bots and only the skill/task fields needed to determine eligibility. **Eligible bot + verified skill + active task profile matches: 0.** The commonly assigned verified skill is the generic prompt-only `Aksiyon listesi üret` (`prompt_verified`), which is not a researched lead, SEO audit, follower-growth result or content workflow. Three of the queried bots had no verified approved skill; other relevant tool-backed skills such as `İçerik Planlayıcı` were still `unverified`, and task rows were not paired with any eligible verified skill.

Therefore the button is correctly fail-closed but is not yet capable of starting useful production work for the current bot portfolio. This implementation also runs one approved skill per start; it does **not** orchestrate every skill together. Do not describe all-skills orchestration, verified lead generation, follower acquisition or company-specific payments as complete.

## Ordered next work

1. Keep Academy approval authoritative. Re-test high-priority content, SEO and sourced lead skills in safe, side-effect-free Academy cases; distinguish infrastructure blocks from skill failures and retain evidence.
2. Only after a skill passes, define an eligible bot-role/company task profile. Lead/follower/research outputs must include verifiable sources and explicit zero-result states; content must save as draft for human approval without publishing.
3. Add coordinated multi-skill execution after individual skills and task profiles pass, with run-level budget/time limits and audit logs.
4. After reliable bot execution is proven, implement company membership/authorization, founder controls, company-scoped wallet/ledger, top-ups and payment integration in the order already set in the Lite Plan.

This is a point-in-time readiness snapshot, not a claim that all external connectors are unavailable. Connector health and user authorization still need to be checked per capability before future automation is enabled.
