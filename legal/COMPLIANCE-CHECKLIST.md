# tnkr: what is done, and what you still need before sharing it

This is a practical checklist, not legal advice. Rules differ by country and change over time. Before sending tnkr to people outside your circle, have a lawyer (an advocate in India) read `PRIVACY.txt` and `TERMS.txt` once. That is a small, one-time cost and the best protection against being sued.

## Already built into the app

| Area | What tnkr does |
| --- | --- |
| Data minimisation | No account, analytics, telemetry, crash reporting, ads or cloud. Nothing reaches you or any server you run. |
| Transparency | The Privacy Notice lists every place tnkr touches the network (link previews, YouTube title/thumbnail, file downloads) and the background helper (mouse hook for the notch and widget). |
| Consent | First-run onboarding explains data handling and requires an explicit tick for the Terms of Use and Privacy Notice (and an age/guardian statement). The accepted version and date are stored on the device only. |
| Re-consent | Change `LEGAL_VERSION` in `src/legal/info.mjs` whenever the documents change in a material way, and every user is asked again. |
| Installer | The Windows installer shows the Terms, Privacy Notice and open-source notices on its licence page. |
| User rights | Settings has "Export my data" (readable copy of everything) and "Erase all data". This covers access, portability and erasure requests under DPDP (India), GDPR/UK GDPR and CCPA, because the user already holds all the data. |
| Disclaimers | Finance and bills are not financial, tax or legal advice. Water, medicine and posture reminders are not medical advice. Notifications can fail. |
| Open-source notices | Credits for React, Electron/Chromium, pdf.js, highlight.js, GSAP, Phosphor Icons and Geist. Full licence texts ship in `legal/THIRD-PARTY-LICENSES.txt`. |
| Children | Not directed at children; the terms ask for age of majority or a guardian. |

## You still need to do these

1. **Fill in who you are.** Set `CONTACT_EMAIL` (and confirm `GOVERNING_LAW`, currently India) in `src/legal/info.mjs`, then run `npm run legal`. People must be able to reach you with a privacy or support question.
2. **Publish the Privacy Notice and Terms at a public web address** (for example a free GitHub Pages site). The Microsoft Store and Google Play both require a privacy policy URL.
3. **Sign the app.** Unsigned installers show "Windows protected your PC / unknown publisher" and antivirus may flag the mouse-hook helper (`DesktopWatch.exe`). Get a code-signing certificate (or Microsoft Artifact Signing), sign `tnkr.exe`, `DesktopWatch.exe` and the installer, and submit `DesktopWatch.exe` to Microsoft Defender as a false positive if needed.
4. **Check the name.** Search "tnkr" at IP India (trademark search), and USPTO/EUIPO if you will share abroad. Consider filing in classes 9 and 42. Check the logo is your own work.
5. **Choose a legal form when it matters.** A free app can be shared as an individual, but a company or LLP protects your personal assets if something goes wrong. If you ever charge money you will also need GST registration (above the threshold), a refund policy and a grievance contact (Consumer Protection (E-Commerce) Rules 2020).
6. **Review GSAP's licence.** GSAP is free for commercial use under its Standard licence, with a restriction on building products that compete with Webflow's visual animation tools. tnkr does not, but read it once: https://gsap.com/standard-license
7. **Ship licence files.** Electron's `LICENSE` and `LICENSES.chromium.html` must stay in the installed app (the packager includes them; do not delete them). `legal/THIRD-PARTY-LICENSES.txt` is installed beside the app.
8. **Android release.** When you publish the APK or put it on Google Play: complete the Data safety form ("no data collected, no data shared"), content rating, privacy policy URL, and keep your signing key safe (losing it means you cannot update the app).

## If you ever add features that change the picture

These would trigger real legal duties, so update the documents and `LEGAL_VERSION` first:

- Accounts, sync or any server of yours: you become a data fiduciary (DPDP) / controller (GDPR). You then need a clear notice and consent, a grievance officer (DPDP), breach reporting, data-processing agreements, and security safeguards.
- Analytics or crash reports: need opt-in consent and disclosure, even if "anonymous".
- AI or cloud APIs: user content would leave the device; needs explicit consent per feature and provider disclosure.
- Reading SMS, contacts, location or the clipboard in the background: sensitive permissions that app stores restrict (this is why the OTP feature was dropped).
- Sharing or hosting user content: brings intermediary duties under India's IT Rules 2021 and similar laws elsewhere.
- Users under 18: DPDP requires verifiable parental consent before processing a child's data.

## Law by region, in one line each

- **India (DPDP Act 2023 and Rules):** applies when you process digital personal data. tnkr keeps it on the user's device and never receives it, so notice/consent/grievance duties are not triggered today.
- **EU/UK (GDPR):** same idea; no controller role without processing. No cookies, so no ePrivacy banner. The EU Accessibility Act applies to some consumer products sold in the EU, so keep keyboard and screen-reader support in mind if you sell there.
- **USA (CCPA/state laws, COPPA):** you do not sell or share personal data and do not target children under 13.
- **Encryption export rules:** tnkr only uses the operating system and Chromium's standard encryption (HTTPS), which is a mass-market exemption.
- **Copyright:** tnkr only keeps copies for the user's own use on their own machine. Do not add public sharing without a takedown process.

## Good habits

- Keep a changelog. Bump `LEGAL_VERSION` with every legal change.
- Keep dependencies and Electron updated (security fixes). Publish a security contact in your policy page.
- Never add telemetry "just to see how it is used" without updating the notice and asking first.
