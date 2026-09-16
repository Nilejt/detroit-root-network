# Temporary Owner Grow access

Nile is the primary product designer and tester. During beta, the Owner may have access to Grow records across T1 farms for testing and support. For real farmer data, the operating commitment is to inspect or change records only when that farmer asks for help. Use designated test farms and synthetic records for independent product testing.

## Enable after deploying the notice

1. Deploy this update so farmers see the beta access notice in Grow. Tell participating farmers about this access before enabling it; merely publishing a notice does not establish an individual support request.
2. Back up the database and run migration `009_grow_owner_beta_access.sql` after 008. It starts disabled.
3. In Supabase SQL Editor, enable the temporary exception:

```sql
update public.grow_beta_settings
set owner_support_enabled = true
where id = true;
```

The Owner can then use Grow on any T1 farm without adding permanent memberships. Director Q and ordinary farmers still need farm membership. T2 remains inaccessible to Grow. This changes only the Grow access helper; it does not bypass RLS or grant service-role sessions.

## Support practice and limits

Record the farmer's request, farm, date, requested task and resolution in the agreed support process before inspecting real data. Limit changes to that request. The database switch grants technical access while enabled; it does **not** enforce or collect per-request farmer consent. The UI notice describes an operating commitment, not an implemented consent mechanism.

Migration 008 preserves previous values and the actor on corrections, but does not audit reads or attribute all initial inserts. Do not describe it as a complete support access audit. A production support design should use explicit time-limited requests and access auditing before offering equivalent cross-farm support.

## Required before production

```sql
update public.grow_beta_settings
set owner_support_enabled = false
where id = true;
```

Verify direct requests by an Owner without membership are denied after disabling. Membership grants remain effective and should be reviewed separately. Remove the Owner exception in a subsequent migration and update the notice to reflect the production support policy. The switch has no automatic production detection or expiry.

## Verification after installation

- Owner without membership: denied when disabled; allowed for T1 when enabled.
- Director Q without membership: denied in either setting.
- Member of a T1 farm: continues to access their own records.
- Anonymous user and unrelated farmer: denied.
- T2 farm: denied even for Owner with the switch enabled.
- After disabling, refresh any open workspace to clear previously displayed data; new requests must fail.

This migration has not been applied to the remote database by the code change.
