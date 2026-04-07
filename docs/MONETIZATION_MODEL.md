# Distribution and monetization model

**Chosen primary model: A — MIT-licensed open source with monetization via official builds and services.**

This repository is published under the **MIT License** (see [LICENSE](../LICENSE)). That means:

- Anyone may use, modify, and redistribute the source, including forks without payment.
- Sustainable revenue is expected from **official signed installers** (e.g. GitHub Releases, Microsoft Store, Mac App Store), **support**, **hosted or cloud features**, or **add-ons**—not from hiding the code.

## If you need stronger payment enforcement later

The maintainers may introduce (without changing past MIT grants on existing commits):

- **Open-core**: keep this repo as the open shell; move license verification or paid-only features to a **closed module** or **backend**.
- **Binary-first distribution**: ship trusted builds from CI; README already distinguishes “build from source” vs “official release.”

See [FUTURE_ENTITLEMENTS.md](FUTURE_ENTITLEMENTS.md) for a technical sketch of accounts, licenses, and grandfathering if you add a paid tier.

## Trademarks

Product names and logos may be trademarked separately from the MIT license. Third parties may not imply endorsement or distribute confusingly similar branding for unofficial builds.
