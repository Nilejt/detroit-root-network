# ADR 003: Anonymous interest and alert privacy

Status: Accepted for V2 demo

## Decision

Save event interest once per browser with a random local identifier and no public words. Do not use IP addresses as identity; a future service may use privacy-preserving IP rate signals only for abuse protection. Alert updates are aggregated and provider-neutral. V2 previews SMS without transmitting it.

## Why

The public can demonstrate intent without creating a profile or exposing sensitive health or location history. Aggregation also reduces notification fatigue for frequent farmer stock changes.

## Consequences

Browser clearing resets local interest, so counts are directional rather than unique-person analytics. Live messaging requires explicit consent, secure destination storage, unsubscribe controls, provider selection, and a retention policy.

