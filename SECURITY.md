# Security Policy

## Supported version

Security fixes are applied to the version currently deployed at `https://xjtu-links.com/` and to the latest revision of this repository.

## Reporting a vulnerability

Please report security issues privately by email to `fjinze@stu.xjtu.edu.cn`. Do not publish credentials, exploit details, personal information, or an unpatched vulnerability in a public issue.

Include the affected URL or file, reproduction steps, expected impact, and any suggested mitigation. A report may be closed as out of scope when it concerns the availability or security of a third-party website listed by this directory rather than this project itself.

## Secrets and deployment data

This repository must not contain API tokens, passwords, cookies, private keys, `.env` files, `.dev.vars` files, Wrangler cache data, or the maintainer's production deployment configuration. Cloudflare secrets are configured only through encrypted Worker secrets.

The public `_worker.js` exposes only a read-only `/api/visits` endpoint. It does not accept visitor-supplied SQL, write analytics data, proxy authentication, or store campus credentials.

The source of `cloudflare/visit-sync/worker.js` is public, but its production Worker URL remains disabled and its API Token is supplied only through the encrypted `CLOUDFLARE_ANALYTICS_TOKEN` Secret. A deployment should restrict that Token to `Account Analytics: Read`, `Zone Analytics: Read`, and the single zone being counted.
