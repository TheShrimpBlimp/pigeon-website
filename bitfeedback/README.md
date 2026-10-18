# Bit feedback

Source for `https://theshrimpblimp.com/bitfeedback`. Uses the site's shared Little
Character font, palette, header and footer. Each question is a separate form step.

- Questions 0–5 accept text; question 6 offers ten rating buttons.
- An initial 7–9 ends the questions with thanks and a Submit button.
- Any initial rating below 7 starts the fizzle joke: every subsequent non-10
  selection disappears. Ten opens the date follow-up.
- Dates start on the next Friday in the visitor's local calendar. Busy advances
  one calendar day, across months and years. Dates do not cycle back.
- A asks for an activity and delivers the rejection; C delivers its own ending.
- Submit opens Fartcha. A shuffled nine-photo grid includes Marwan and eight
  portraits from the requested comedian pool. Only selecting Marwan passes.
- A successful submission downloads a signed CSV. The final screen asks the
  visitor to DM it themselves and offers a fresh survey.

Only an aggregate completed-submission total is stored for the “Bits Fedback” counter. No answers, IP addresses, visitor identifiers or cookies are stored. Answers live
in tab memory until the visitor submits. The server receives them to sign the
CSV and returns it with `no-store`; this code never saves or logs them. Provider
infrastructure logs are configured separately. This is a comedy captcha, not
bot protection or identity verification.

## CSV integrity

`domain/bitfeedback.js` creates the exact UTF-8 CSV bytes and signs them with an
ECDSA P-256/SHA-256 private key kept in a Worker secret. The last record is a
`p256:`-prefixed base64 signature over every preceding byte, including CRLF line
endings. Quoting handles commas, newlines and quotes; spreadsheet formula-like
answers get an apostrophe prefix. The initial rating, all rating attempts and
all date responses are included.

Verify a received file **before opening/saving it in a spreadsheet**:

```sh
python3 scripts/verify-bit-feedback.py /path/to/bit-feedback.csv
```

The verifier uses the pinned `signing-public-key.txt` and local OpenSSL. Altering
a signed field or line endings fails verification. The signature proves the
file is unchanged since this site signed it; it does not prove who answered,
that answers were truthful, or prevent someone requesting another signed CSV.

A local key has been generated in ignored `domain/.dev.vars`. Never commit or
print it. Keep the matching public key. To create a key on a fresh installation
with no existing public/private key:

```sh
node scripts/create-feedback-signing-key.mjs
```

Publishing requires deploying both Pages assets and the domain Worker, and
setting `FEEDBACK_SIGNING_KEY` to that existing private key via Wrangler's stdin
secret input. Do not regenerate the public key during deployment. Keep the
private key in a password manager if long-term verification is desired; keep old
public keys when rotating. Without the secret, submission reports unavailable
and keeps the visitor's answers for retry instead of downloading an unsigned file.

## Focused verification

```sh
node tests/bitfeedback-test.mjs
PIGEON_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/bitfeedback-browser.mjs
```

The browser check creates a temporary loopback server, uses the ignored local
key, and saves screenshots and disposable CSVs under ignored `build/`. No full
firmware or website test suite is required for these checks.

Photo provenance, authors and reuse licenses are in `credits.html`.

Initialize the aggregate counter with `wrangler d1 execute pigeon-installs --remote --file domain/bitfeedback-schema.sql --config domain/wrangler.json`. It starts at zero; earlier submissions were not tracked and cannot be reconstructed. The total increments only after a valid CSV has been signed, not on page views or failed Fartcha attempts. Retries after a network interruption can count again; this counts completions, not unique people.
