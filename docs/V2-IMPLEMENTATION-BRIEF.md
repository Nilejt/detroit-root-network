# Detroit Root Network V2 implementation brief

## Release intent

V2 adds useful context around the existing public job—find food, confirm stock, and know where to go—without placing basic discovery behind payment or profile creation. Nile and Quinn are platform owners. Farmers and verified community partners publish through separate, database-enforced permissions.

## Approved release scope

- Mobile burger navigation; compact discovery controls; Fresh Food/Open Detroit context remains above search.
- Nutrition-objective sorting and supporting-produce context for heart-smart, blood-sugar-aware, maternal/family, produce-forward, and plant-forward cancer-prevention nutrition.
- General-education disclaimer and versioned source links. Language uses “supports,” never diagnosis, treatment, prevention guarantees, or individualized advice.
- Public self-service stand signal and optional coming-soon harvest/date controls.
- Basic Root Route for three or more matching farms, with external multi-stop directions.
- Aggregated alert architecture and a mock SMS preview; no live text is sent in this release.
- Read-only Community Board with events from verified farms and community health partners.
- Anonymous browser-level saved interest with no resident-written public content.
- Fifteen demonstration farms: five editable T1 records and ten clearly labeled read-only T2 fixtures.

## Acceptance boundaries

- A nutrition selection reorders cards, changes the map set, names matching produce, and adds a contextual card badge.
- Coming-soon items use pale gray and a dashed border and do not appear as available inventory.
- Only T1 farms can be edited through application roles. T2 fixtures remain protected by database triggers.
- Partner event inserts require a verified partner membership or a platform operator.
- Quinn and Nile both resolve to `owner`; legacy `director_q` remains recognized during migration.
- Interest is called “highest interest,” not popularity or ranking. It exposes no identity or free text.

## Deferred until after the pitch

Municipal embeds, event CSV syndication, saved resident profiles and routes, individualized recipes, live SMS delivery, rewards redemption, parcel workflows, and civic aggregate dashboards.

## Validation checklist

1. Apply migrations through `012_v2_discovery_community.sql` in order and preserve a verified backup.
2. Run `npm run lint`, `npm test`, and `npm run build`.
3. Confirm both owner accounts, one farmer membership, one partner membership, and T2 mutation rejection in a preview environment.
4. Test nutrition sorting, matching map markers, mobile navigation, coming-soon visibility, Community Board interest, event publishing, and feedback export.
5. Review OpenStreetMap tile policy and select a production tile provider before broader public traffic.

## Nutrition references

- USDA FoodData Central: https://fdc.nal.usda.gov/
- American Diabetes Association: https://diabetes.org/food-nutrition
- American Heart Association: https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/shaking-the-salt-habit-to-lower-high-blood-pressure
- American Cancer Society: https://www.cancer.org/cancer/risk-prevention/diet-physical-activity/acs-guidelines-nutrition-physical-activity-cancer-prevention.html
- March of Dimes: https://www.marchofdimes.org/find-support/topics/pregnancy/eating-healthy-during-pregnancy

