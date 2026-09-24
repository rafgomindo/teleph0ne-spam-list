# Teleph0ne spam list

The shared list of spam, scam and telemarketing numbers used by the [Teleph0ne](https://teleph0ne-spam.netlify.app) phone app for Android.
Every phone downloads [`spam_list.csv`](spam_list.csv) and checks incoming calls against it **on the phone**: nobody learns who calls you.

## Format

```
number,severity,category
+33162*,2,telemarketing
+12025550123,3,robocall
```

- `number`: an international number, or a whole range written as its prefix plus `*`.
- `severity`: `2` the phone rings with a warning, `3` the call is blocked, `5` critical.
- `category`: `spam`, `scam`, `telemarketing` or `robocall`.

## Where the numbers come from

A bot (GitHub Actions) rebuilds the list every 3 hours from:

1. **Reports from Teleph0ne phones.** After a spam call, users tap *Block & report*. Reports are anonymous: no GitHub account, no phone number, no contacts. A number is listed after 3 different phones report it (warning), and blocked from 5.
2. **The US FTC** [Do Not Call complaint data](https://www.ftc.gov/policy-notices/open-government/data-sets/do-not-call-data): numbers with at least 5 complaints in 14 days.
3. **Official telemarketing ranges** in [`data/ranges.csv`](data/ranges.csv) (France, Spain, Chile, Peru, Brazil).
4. **Reviewed additions** in [`data/additions.csv`](data/additions.csv), from pull requests.

## Contributing

Open a pull request that edits a file in `data/`:

- **A new official range** (for example Italy's, once AGCOM assigns it): add a line to `data/ranges.csv` with the source.
- **A spam, scam or robocall number**: add a line to `data/additions.csv` with a source (link or explanation). Business, robocall and scam numbers only: never a private person's number.

A check runs on every pull request, and the list is rebuilt as soon as it is merged.

## Wrongly listed?

Open an issue with the number. Once confirmed, it is added to [`data/removals.csv`](data/removals.csv) and disappears from the list on the next build (within 3 hours).

## License

The list is made available under the [Open Database License (ODbL) 1.0](LICENSE): you can use it in your own apps, as long as you credit this project and share improvements to the list under the same license.
