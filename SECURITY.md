# Security Policy

## Supported Surface

Security reports should focus on the currently maintained repository and the published
`@knowledge-alchemy/ddd-spec` package.

In scope:

- The public CLI package in [`packages/ddd-spec-cli/`](./packages/ddd-spec-cli/)
- Repository-owned build, release, and packaging workflows
- Viewer assets shipped inside the published package

Out of scope unless there is a repository-specific exploit path:

- Vulnerabilities in third-party dependencies without a demonstrated impact path here
- Local development environment setup issues that do not affect the published package or CI/release
  workflows
- Example content under [`examples/`](./examples/) treated as product deployments

## Reporting A Vulnerability

Use GitHub private vulnerability reporting for this repository when it is available. If that route
is not available yet, do not open a public issue with exploit details. Instead, open a minimal
issue requesting a private reporting channel, or contact the maintainers privately if a contact
method is available on GitHub.

Include:

- Affected version, commit, or workflow
- Impact and attack conditions
- Reproduction steps or proof of concept
- Suggested mitigations, if known

## Disclosure Expectations

- Give maintainers reasonable time to investigate, mitigate, and release a fix before public
  disclosure.
- Keep report details private until a fix or mitigation is ready.
- After a fix ships, maintainers may document the impact and resolution in the changelog, release
  notes, or repository history.
