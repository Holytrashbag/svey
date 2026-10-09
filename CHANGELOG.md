# Changelog

## [1.1.0](https://github.com/Holytrashbag/svey/compare/v1.0.0...v1.1.0) (2026-10-09)


### Features

* **game-setup:** pick decks from any pod member ([#49](https://github.com/Holytrashbag/svey/issues/49)) ([297857e](https://github.com/Holytrashbag/svey/commit/297857edbd669648bf71fb1662d897775b0b56c9))
* **games:** show survey and retire notes on the game recap ([#61](https://github.com/Holytrashbag/svey/issues/61)) ([84ef17b](https://github.com/Holytrashbag/svey/commit/84ef17b8a49067afff1685f661bf804f1ce71a2e))
* **tracker:** commander damage also changes the life total ([#54](https://github.com/Holytrashbag/svey/issues/54)) ([3f701f6](https://github.com/Holytrashbag/svey/commit/3f701f65e059345d53b4440733a93728af8bea3a))
* **tracker:** larger, easier-to-read commander damage sheet ([#59](https://github.com/Holytrashbag/svey/issues/59)) ([2d53c57](https://github.com/Holytrashbag/svey/commit/2d53c57e8ba67bf58ae8b621d65a731cdc4e5a0a))


### Bug Fixes

* **decks:** decklist win rate is always 0% ([#53](https://github.com/Holytrashbag/svey/issues/53)) ([a517a5b](https://github.com/Holytrashbag/svey/commit/a517a5b5f9730631a854d060542807c991513cab))
* **deps:** Bump @fastify/static from 9.1.3 to 10.1.5 ([#25](https://github.com/Holytrashbag/svey/issues/25)) ([43b5a39](https://github.com/Holytrashbag/svey/commit/43b5a390e8f376569f3978adc85755ebc8c5f238))
* **deps:** Bump fastify-plugin from 5.1.0 to 6.0.0 ([#17](https://github.com/Holytrashbag/svey/issues/17)) ([65655fe](https://github.com/Holytrashbag/svey/commit/65655feb4ab4cd5bb1bad487e4eb3c81a67aa33f))
* **deps:** Bump fastify-type-provider-zod from 6.1.0 to 7.0.0 ([#28](https://github.com/Holytrashbag/svey/issues/28)) ([cc99d2d](https://github.com/Holytrashbag/svey/commit/cc99d2da367026fa312dda19c61dab0f3dfff9d7))
* **deps:** Bump nodemailer from 8.0.11 to 10.0.12 ([#26](https://github.com/Holytrashbag/svey/issues/26)) ([26ee5e0](https://github.com/Holytrashbag/svey/commit/26ee5e0510887b0e67931ee2ffd45bc87d526d29))
* **deps:** Bump pinia from 3.0.4 to 4.0.3 ([#16](https://github.com/Holytrashbag/svey/issues/16)) ([85d0e2a](https://github.com/Holytrashbag/svey/commit/85d0e2ac292a0a60001ece531e8808e33ca07948))
* **deps:** Bump the minor-and-patch group with 35 updates ([#14](https://github.com/Holytrashbag/svey/issues/14)) ([4b98dd9](https://github.com/Holytrashbag/svey/commit/4b98dd9f4fc1560de6632f05db2101d55251af87))
* **game-setup:** drop empty seats when a game starts ([#57](https://github.com/Holytrashbag/svey/issues/57)) ([0685af7](https://github.com/Holytrashbag/svey/commit/0685af78e9470e3fbcf311166ab163b2b36f1b98))
* **home:** open the most recently played pod by default ([#62](https://github.com/Holytrashbag/svey/issues/62)) ([da88e4b](https://github.com/Holytrashbag/svey/commit/da88e4ba25c603a4df3b02b92e162cbdd64dfb07))
* **home:** show personal win rate across all pods ([#56](https://github.com/Holytrashbag/svey/issues/56)) ([016876e](https://github.com/Holytrashbag/svey/commit/016876e8ebad242467762e28cf8e9c6ba1382ebc))
* **pods:** base member win rate on games actually played ([#46](https://github.com/Holytrashbag/svey/issues/46)) ([3daf02e](https://github.com/Holytrashbag/svey/commit/3daf02e973f8fc4db89b838c58cc2bbcd3f2b25f))
* **tracker:** readable poison/commander chips showing max single-commander damage ([#58](https://github.com/Holytrashbag/svey/issues/58)) ([048e700](https://github.com/Holytrashbag/svey/commit/048e700892d3b4896030ec6a816ebc0c0bd9d795))
* **tracker:** show the game timer only once ([#55](https://github.com/Holytrashbag/svey/issues/55)) ([0c854ea](https://github.com/Holytrashbag/svey/commit/0c854ea223d78b90f1b2c464b9f3730d7984cd29))

## 1.0.0 (2026-10-05)

Initial public release.

- Live game tracker for one shared phone: life, poison and per-commander damage with automatic eliminations
- Post-game survey (fun, agency, notes) feeding deck and playgroup stats
- Archidekt deck import and re-sync with estimated power brackets and Scryfall card art
- Playgroups with invite codes, roles, standings and game history
- Discord, Google and email/password sign-in; GDPR-oriented account deletion
- Installable PWA in English and German
