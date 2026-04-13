# @vibeboiler/cli

Interactive setup wizard for the vibeboiler template. Automates Firebase,
Neon, GitHub, Expo/EAS, and Apple App ID bootstrap for new projects.

## Usage

```bash
# Full wizard
vibeboiler init

# Individual stages (all idempotent, share state at .vibeboiler/state.json)
vibeboiler firebase
vibeboiler neon
vibeboiler expo
vibeboiler apple
vibeboiler github
vibeboiler files     # write .env / .firebaserc / app.config.ts / eas.json
vibeboiler secrets   # push GitHub Actions secrets
vibeboiler doctor    # read-only diagnostics
```

## Global flags

- `-y, --yes` — skip per-step confirmations.
- `--state <path>` — override the default `.vibeboiler/state.json`.
- `--dry-run` — don't write state to disk.
- `--verbose` — debug logging.
- `--skip <list>` / `--only <list>` — comma-separated targets (`web,mobile,apple`).

## Tokens

Tokens are prompted interactively (hidden input) and kept in memory for the
lifetime of the process. They are never written to state. You can also
supply them via environment variables for CI:

| Env var | Purpose |
|---|---|
| `VB_GCP_TOKEN` | Google OAuth access token (cloud-platform + firebase scopes) |
| `VB_NEON_KEY` | Neon API key |
| `VB_GH_TOKEN` | GitHub PAT (Administration/Actions/Secrets/Contents RW) |
| `VB_EXPO_TOKEN` | Expo access token |
| `VB_ASC_ISSUER_ID` / `VB_ASC_KEY_ID` / `VB_ASC_P8_PATH` | App Store Connect API key |
| `VB_APPLE_APP_SPECIFIC_PASSWORD` | Apple ID app-specific password |

## v1 non-goals

- Google Play Console app creation + first AAB upload.
- First local `eas build --local` / TestFlight submission.
- App Store Connect **App** record creation (only Bundle ID registration).
- Billing-account linking (must be done once in the Firebase console).
