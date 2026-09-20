# ADR 001: V2 role and publishing boundaries

Status: Accepted for V2 demo

## Decision

Nile and Quinn use the trusted `owner` role. `admin` is an operator role without ownership semantics. Farmers publish only for assigned T1 farms. Community partners publish only after a platform owner records a verified membership. Detroiters read public posts and may save interest locally, but cannot post public text.

## Why

The interface cannot be the security boundary. Supabase row-level policies and existing T2 mutation triggers must reject unauthorized requests even when someone bypasses the UI.

## Consequences

Partner onboarding is a deliberate verification step. Existing `director_q` records remain readable during migration, but new provisioning uses `owner` or `admin`.

