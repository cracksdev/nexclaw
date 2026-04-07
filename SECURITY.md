# Security policy

## Supported versions

Security updates are applied to the **default branch** (e.g. `main`). Use the latest release or commit when possible.

## Reporting a vulnerability

**Please do not** open a public GitHub issue for undisclosed security vulnerabilities.

1. Use GitHub **Private vulnerability reporting** for this repository (Settings → Security → Code security), if enabled, **or**
2. Email or contact the maintainers through a private channel listed in the repository or organization profile.

Include:

- Description of the issue and impact  
- Steps to reproduce (if safe to share)  
- Affected versions or commit hashes (if known)  

We will try to acknowledge receipt and coordinate a fix timeline.

## Scope

The app runs a local CLI subprocess and can access the file system for the chosen working directory. Users should only open **trusted** folders and understand risks of **auto-approve / skip-permissions** modes.
