# Dealbreaker app: notes for Claude sessions

Expo SDK 58 app (expo-router). The API base URL is hardcoded to production in `constants/api.tsx`
(`https://dealbreaker-api.onrender.com`, the `JaceG/Dealbreaker-Backend` repo on Render). Render's free plan sleeps after
about 15 idle minutes, so the first request can take 20 to 45 seconds.

## Showing Jace a change on his iPhone (EAS Update)

His phone runs a release build that pulls over-the-air updates from the `preview` channel, runtime version `1.0.0`
(the `version` in app.json, because `runtimeVersion.policy` is `appVersion`).

- JavaScript, styling and image changes can ship as an update:
  `npx eas-cli update --channel preview --environment preview --message "<what changed>"`
- Jace sees it after force-closing and reopening the app twice (the first launch downloads, the second applies).
- A cloud session needs an `EXPO_TOKEN` environment variable to publish. Never ask for it in chat.
- `.env` is gitignored. The values the app reads through `@env` (`EXPO_PUBLIC_OAUTH_IOS_CLIENT_ID`) are stored as EAS
  environment variables, and `--environment preview` supplies them.

**Never publish an update that needs native code it doesn't have.** A new native package, a config plugin or native
setting in app.json, or an Expo SDK bump all need a new native build. Bump `version` in app.json first, so the update
can't reach builds that lack the native code (they would crash), then make a new build: `eas build --profile preview`.
Ask Jace before starting a build.

## Rules from Jace

- Ask before committing, and never merge without asking.
- The backend's `.env` points at the production database. Run tests that write data only against a local MongoDB.
