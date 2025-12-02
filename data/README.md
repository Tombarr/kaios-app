# KaiOS App Catalog

Generate a SQLite `.db` file pulling KaiOS app data from the KaiStore and JioStore (India).

As of December 2025, there are ~1,800 KaiOS apps available.

## Notes

Database generation is slow because manifests are requested sequentially to reliably avoid hitting rate limits.

## Contributions

This is based on Affe Null's [`store-client`](https://gitlab.com/affenull2345/store-client) and a review of the JioStore client.
