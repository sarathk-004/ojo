# SignPath Foundation application: answers to paste

Apply at https://signpath.org/apply (check the form for the current questions; the answers below fit them).

| Field | Answer |
|---|---|
| Project name | ojo |
| Short description | A free, local-first desktop workspace for Windows: tasks, notes, planner, focus timer, finance and bills, job tracker, saved links and a PDF reader. Everything stays on the user's computer; there is no account and no cloud. |
| Repository | https://github.com/sarathk-004/ojo |
| Homepage / download page | https://ojo-workspace.vercel.app |
| Licence | MIT (OSI-approved). No dual licensing. |
| Releases | https://github.com/sarathk-004/ojo/releases |
| Build | Fully automated with GitHub Actions: `.github/workflows/release.yml` builds the NSIS installer from the checked-in source (`npm ci`, `npm test`, `npm run installer`) on `windows-latest`. |
| What gets signed | The installer, `ojo-Setup-<version>-x64.exe`, built by that workflow. |
| Maintainer | sarathk-004 (GitHub). Contact: ojo.workspace.app@gmail.com |
| Privacy | ojo does not transfer information to other networked systems unless the user asks it to (for example, opening or reading a link the user saved). Privacy policy: https://ojo-workspace.vercel.app/privacy |
| Why signing matters | The installer currently triggers Windows SmartScreen's "unknown publisher" warning, which discourages people from installing a free, privacy-respecting tool. |

## Before you apply
- [x] Public repository with an OSI-approved licence (`LICENSE`, MIT)
- [x] Code signing policy and approver named in the README
- [x] Privacy statement (website and `legal/PRIVACY.txt`)
- [x] Released versions with a download page
- [x] Automated build in GitHub Actions
- [ ] Optional but helpful: a few weeks of public history and a first signed-ready release tag

## After approval
1. In SignPath, create the project `ojo`, a signing policy (for example `release-signing`) and an artifact configuration that signs the installer `.exe`.
2. Create a CI user in SignPath and put its token in the repository secret `SIGNPATH_API_TOKEN`.
3. Set the repository variables `SIGNPATH_ORGANIZATION_ID`, `SIGNPATH_PROJECT_SLUG`, `SIGNPATH_SIGNING_POLICY_SLUG` and `SIGNPATH_ARTIFACT_CONFIG_SLUG`.
4. Run the "Release installer" workflow from the Actions tab (or push a `v*` tag). Approve the signing request in SignPath.
5. Add the credit line to the website's download sheet: "Free code signing provided by SignPath.io, certificate by SignPath Foundation."
