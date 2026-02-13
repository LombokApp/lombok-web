# Database Seeding

## Custom Local Seed Files

Make a copy of `./default.ts` in this directory and name it `local-<anything>.ts` to have it ignored by git. Customise it to your looking and then specify it in the root .env file (as below) to have it used in the dev build instead of the default seed.

```
...
DEV_SEED_FILE=local-myseed.ts
...
```
