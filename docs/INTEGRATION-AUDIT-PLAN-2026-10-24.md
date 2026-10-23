# Parallel integration audit · 24 October 2026

Owner request: improve a separate area while custom plot/site work proceeds, then audit the combined result and ship verified changes.

Territory: `preferences.js`, isolated preference/cache tests, deployment staging and its tests. Existing uncommitted changes in app/context/site/desks/i18n and release stamping belong to the ongoing plot work; preserve those edits. No layout rewrite or content deletion.

Confirmed first probe: the rate validator accepts impossible dates and malformed per-currency dates. Harden the data boundary, preserve the prior book atomically on failed/malformed refresh, exercise successful refresh and startup corruption recovery. Keep SI/USD model calculations unchanged.

Independently review deployment staging for files accidentally exposed from ignored checkout content. Reproduce in a disposable fixture, then stage only reviewed tracked public files with executable guards. Do not run a production deploy from the dirty shared tree.

After the other work settles: inspect its final diff and actual behavior; full tests/mutation probes/reproducible release pins; EN/TH/ZH real-browser checks at 390/1024/1440 for changed surfaces; independent review; commit, deploy, push and compare public bytes. Clean only known disposable trees after confirming no unique work. No blanket claim of zero bugs or certified engineering.
