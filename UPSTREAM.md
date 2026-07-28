# Upstream attribution

Sealed Casts uses OpenCast as its open-source application base.

- Upstream project: [stephancill/opencast](https://github.com/stephancill/opencast)
- Imported commit: [`e8343c07`](https://github.com/stephancill/opencast/commit/e8343c07)
- Upstream authors: Stephan Cilliers and the OpenCast contributors
- License: MIT

The original MIT license and copyright notice remain in [LICENSE](LICENSE).
OpenCast was itself originally based on
[ccrsxx/twitter-clone](https://github.com/ccrsxx/twitter-clone), as documented
by the upstream project.

## Work added in this repository

This repository adds the Sealed Casts privacy layer, including:

- confidential audience gating designed around iExec Nox
- encrypted cast payloads
- private reader wallet binding and qualification checks
- a Sealed Cast Registry contract and Sepolia deployment flow
- application screens and API routes for creating and reading sealed casts

The independent Git history makes these additions easier to inspect while this
file preserves a direct, specific record of the open-source foundation.
