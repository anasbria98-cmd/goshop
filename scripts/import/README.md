# Client product import

These scripts run locally with server credentials; never import them into browser code.
Use Node 24 and Python 3. Install the repository dependencies first.

1. Extract and validate the complete workbook, inspect existing data and record the plan:

```sh
node --env-file=.env.local scripts/import/import-products.mjs --excel '/path/to/workbook.xlsx' --report /tmp/excel-plan.json
```

2. Review the plan, then run the same command with `--apply` and a separate report path.

3. Collect all paginated public source products:

```sh
node scripts/import/scrape-123elec.mjs /tmp/source-products.json
```

4. Review the collected data. Source prices are EUR, so choose an explicit pricing policy:

```sh
node --env-file=.env.local scripts/import/import-products.mjs --source /tmp/source-products.json --source-pricing draft --report /tmp/source-plan.json
# Or, only with the client's approved conversion rate:
node --env-file=.env.local scripts/import/import-products.mjs --source /tmp/source-products.json --source-pricing convert --eur-mad-rate RATE --report /tmp/source-plan.json
```

Add `--apply` after reviewing. Drafts have an unset selling price represented by the schema's default zero and are excluded from the public catalogue. EUR prices and source links remain in the report. Never publish a draft before assigning its MAD selling price.

Imports match references first, reject ambiguous matches, preserve existing stock/status/slugs, add ancestor category relationships for category search, and import verified JPEG/PNG/WebP images into `product-images`. They never delete records. Deterministic storage paths prevent duplicate images on reruns. Existing inventory quantities are never reset. A failed row is recorded and can be retried; this is a resumable process, not a cross-storage/database transaction.

Reports contain source references, row numbers/URLs, source currency/price, product IDs/slugs, mappings, missing images and failures. Archive the reports for traceability. Workbook descriptions and characteristics are preserved; source website descriptions contain factual product specifications rather than retailer marketing or reviews.
