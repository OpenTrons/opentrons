# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

<a name="3.10.1"></a>
## [3.10.1](https://github.com/Opentrons/opentrons/compare/v3.10.0...v3.10.1) (2019-07-19)


### Features

* **api:** Make blow out flow rate settable ([#3735](https://github.com/Opentrons/opentrons/issues/3735)) ([e12b4fd](https://github.com/Opentrons/opentrons/commit/e12b4fd)), closes [#3733](https://github.com/Opentrons/opentrons/issues/3733)
* **app:** add GEN2 images to change pipette ([#3734](https://github.com/Opentrons/opentrons/issues/3734)) ([1016c16](https://github.com/Opentrons/opentrons/commit/1016c16)), closes [#3630](https://github.com/Opentrons/opentrons/issues/3630)
* **shared-data:** add displayCategory to pipetteNameSpecs and schema ([#3731](https://github.com/Opentrons/opentrons/issues/3731)) ([3b39dea](https://github.com/Opentrons/opentrons/commit/3b39dea))





<a name="3.10.0"></a>
# [3.10.0](https://github.com/Opentrons/opentrons/compare/v3.9.0...v3.10.0) (2019-07-15)


### Bug Fixes

* **api:** Fix gen2 model offsets ([#3614](https://github.com/Opentrons/opentrons/issues/3614)) ([dd1680a](https://github.com/Opentrons/opentrons/commit/dd1680a))
* **labware:** Fix generator well y calculation, update docs/schema ([#3697](https://github.com/Opentrons/opentrons/issues/3697)) ([31a2963](https://github.com/Opentrons/opentrons/commit/31a2963)), closes [#3602](https://github.com/Opentrons/opentrons/issues/3602)
* **shared_data:** Change deep well name, modify tipracks ([#3513](https://github.com/Opentrons/opentrons/issues/3513)) ([9c883d5](https://github.com/Opentrons/opentrons/commit/9c883d5))
* **shared_data:** Fix module path in shared data ([#3556](https://github.com/Opentrons/opentrons/issues/3556)) ([4742458](https://github.com/Opentrons/opentrons/commit/4742458))
* **shared-data:** patch some v2 labware from drawings ([#3623](https://github.com/Opentrons/opentrons/issues/3623)) ([84ecef1](https://github.com/Opentrons/opentrons/commit/84ecef1)), closes [#3618](https://github.com/Opentrons/opentrons/issues/3618)
* **shared-data:** patch v2 opentrons 15 and 50 mL tube racks ([#3712](https://github.com/Opentrons/opentrons/issues/3712)) ([66f1200](https://github.com/Opentrons/opentrons/commit/66f1200))


### Features

* **api:** Add a quirk for return tip height ([#3687](https://github.com/Opentrons/opentrons/issues/3687)) ([3a89b69](https://github.com/Opentrons/opentrons/commit/3a89b69))
* **api:** Add Gen2 multichannel pipette api support ([#3691](https://github.com/Opentrons/opentrons/issues/3691)) ([d1ae1ed](https://github.com/Opentrons/opentrons/commit/d1ae1ed))
* **api:** Add P50Sv1.5 ([#3689](https://github.com/Opentrons/opentrons/issues/3689)) ([6b42e6c](https://github.com/Opentrons/opentrons/commit/6b42e6c)), closes [#3680](https://github.com/Opentrons/opentrons/issues/3680)
* **api:** reference calibration data via hash of labware def ([#3498](https://github.com/Opentrons/opentrons/issues/3498)) ([0475586](https://github.com/Opentrons/opentrons/commit/0475586)), closes [#3493](https://github.com/Opentrons/opentrons/issues/3493)
* **api:** save labware under namespace/load_name/version ([#3487](https://github.com/Opentrons/opentrons/issues/3487)) ([400d6e6](https://github.com/Opentrons/opentrons/commit/400d6e6)), closes [#3474](https://github.com/Opentrons/opentrons/issues/3474)
* **app:** Get protocolDisplayData based on protocol schema ([#3531](https://github.com/Opentrons/opentrons/issues/3531)) ([ec69d84](https://github.com/Opentrons/opentrons/commit/ec69d84)), closes [#3494](https://github.com/Opentrons/opentrons/issues/3494)
* **labware:** update labware mapping ([#3636](https://github.com/Opentrons/opentrons/issues/3636)) ([a1e6005](https://github.com/Opentrons/opentrons/commit/a1e6005)), closes [#3605](https://github.com/Opentrons/opentrons/issues/3605)
* **labware:** zero out cornerOffsetFromSlot from all current v2 labware defs ([#3642](https://github.com/Opentrons/opentrons/issues/3642)) ([9b91298](https://github.com/Opentrons/opentrons/commit/9b91298))
* **labware-library:** show only the single latest version of a def ([#3552](https://github.com/Opentrons/opentrons/issues/3552)) ([f901a30](https://github.com/Opentrons/opentrons/commit/f901a30)), closes [#3551](https://github.com/Opentrons/opentrons/issues/3551)
* **protocol-designer:** migrate PD files to 3.0.0 ([#3606](https://github.com/Opentrons/opentrons/issues/3606)) ([10363ca](https://github.com/Opentrons/opentrons/commit/10363ca)), closes [#3337](https://github.com/Opentrons/opentrons/issues/3337)
* **protocol-designer:** save v3 protocols ([#3588](https://github.com/Opentrons/opentrons/issues/3588)) ([40f3a9e](https://github.com/Opentrons/opentrons/commit/40f3a9e)), closes [#3336](https://github.com/Opentrons/opentrons/issues/3336) [#3414](https://github.com/Opentrons/opentrons/issues/3414)
* **protocol-designer:** use labware def URIs ([#3526](https://github.com/Opentrons/opentrons/issues/3526)) ([6077eb8](https://github.com/Opentrons/opentrons/commit/6077eb8)), closes [#3455](https://github.com/Opentrons/opentrons/issues/3455)
* **protocol-designer:** use RobotWorkSpace for deck map ([#3479](https://github.com/Opentrons/opentrons/issues/3479)) ([9aa4eb6](https://github.com/Opentrons/opentrons/commit/9aa4eb6)), closes [#3327](https://github.com/Opentrons/opentrons/issues/3327)
* **shared-data:** add 1-well troughs and 96-well deep well plate ([#3570](https://github.com/Opentrons/opentrons/issues/3570)) ([f495ea1](https://github.com/Opentrons/opentrons/commit/f495ea1))
* **shared-data:** Add Corning 96 flat labware def ([#3625](https://github.com/Opentrons/opentrons/issues/3625)) ([af9e561](https://github.com/Opentrons/opentrons/commit/af9e561)), closes [#3619](https://github.com/Opentrons/opentrons/issues/3619)
* **shared-data:** display specific v2 labware as "retired" ([#3627](https://github.com/Opentrons/opentrons/issues/3627)) ([3fb5812](https://github.com/Opentrons/opentrons/commit/3fb5812))
* **shared-data:** make flow def for json protocol v3 ([#3571](https://github.com/Opentrons/opentrons/issues/3571)) ([9144193](https://github.com/Opentrons/opentrons/commit/9144193))
* **shared-data:** remove otId from all v2 labware and dependencies ([#3549](https://github.com/Opentrons/opentrons/issues/3549)) ([1766cb1](https://github.com/Opentrons/opentrons/commit/1766cb1)), closes [#3471](https://github.com/Opentrons/opentrons/issues/3471)





<a name="3.9.0"></a>
# [3.9.0](https://github.com/Opentrons/opentrons/compare/v3.8.3...v3.9.0) (2019-05-29)


### Features

* **api:** add pipette plus constructors ([#3407](https://github.com/Opentrons/opentrons/issues/3407)) ([f4feee9](https://github.com/Opentrons/opentrons/commit/f4feee9))
* **api:** Add pipette v2.0 config ([#3394](https://github.com/Opentrons/opentrons/issues/3394)) ([f7739b9](https://github.com/Opentrons/opentrons/commit/f7739b9))
* **api:** Enable Double Drop Quirk ([#3485](https://github.com/Opentrons/opentrons/issues/3485)) ([e864150](https://github.com/Opentrons/opentrons/commit/e864150))
* **api:** Make pipette quirks configurable ([#3463](https://github.com/Opentrons/opentrons/issues/3463)) ([3513794](https://github.com/Opentrons/opentrons/commit/3513794))
* **protocol-designer:** make "labware views" use new v2 labware components ([#3448](https://github.com/Opentrons/opentrons/issues/3448)) ([ec6598b](https://github.com/Opentrons/opentrons/commit/ec6598b))
* **repo:** change v2 labware len/width fields ([#3410](https://github.com/Opentrons/opentrons/issues/3410)) ([0ef0bd5](https://github.com/Opentrons/opentrons/commit/0ef0bd5))
* **shared-data:** add layers to deck schema and definitions ([#3385](https://github.com/Opentrons/opentrons/issues/3385)) ([d84cc35](https://github.com/Opentrons/opentrons/commit/d84cc35)), closes [#3325](https://github.com/Opentrons/opentrons/issues/3325)
* **shared-data:** add version, schemaVersion, and namespace keys to v2 labware ([#3469](https://github.com/Opentrons/opentrons/issues/3469)) ([da03025](https://github.com/Opentrons/opentrons/commit/da03025)), closes [#3454](https://github.com/Opentrons/opentrons/issues/3454)
* **shared-data:** deck component from physical data ([#3415](https://github.com/Opentrons/opentrons/issues/3415)) ([ddf9e78](https://github.com/Opentrons/opentrons/commit/ddf9e78)), closes [#3326](https://github.com/Opentrons/opentrons/issues/3326)


<a name="3.8.3"></a>
## [3.8.3](https://github.com/Opentrons/opentrons/compare/v3.8.2...v3.8.3) (2019-04-30)


### Features

* **api:** Add new 10ul tiprack ([#3393](https://github.com/Opentrons/opentrons/issues/3393)) ([a7c15cc](https://github.com/Opentrons/opentrons/commit/a7c15cc))



<a name="3.8.2"></a>
## [3.8.2](https://github.com/Opentrons/opentrons/compare/v3.8.1...v3.8.2) (2019-04-23)


### Bug Fixes

* **labware-library:** Take cornerOffsetFromSlot into account with render ([#3297](https://github.com/Opentrons/opentrons/issues/3297)) ([04a1ab8](https://github.com/Opentrons/opentrons/commit/04a1ab8))
* **shared-data:** fix v2 labware definition ([#3289](https://github.com/Opentrons/opentrons/issues/3289)) ([e652fb7](https://github.com/Opentrons/opentrons/commit/e652fb7)), closes [#3271](https://github.com/Opentrons/opentrons/issues/3271)


### Features

* **api:** Add Geometry Logic For Thermocycler Configurations ([#3266](https://github.com/Opentrons/opentrons/issues/3266)) ([4d8e463](https://github.com/Opentrons/opentrons/commit/4d8e463))
* **api:** add P10M 1.5 config data ([#3365](https://github.com/Opentrons/opentrons/issues/3365)) ([1332f63](https://github.com/Opentrons/opentrons/commit/1332f63))
* **api:** define & execute v3 json protocols ([#3312](https://github.com/Opentrons/opentrons/issues/3312)) ([988407d](https://github.com/Opentrons/opentrons/commit/988407d)), closes [#3110](https://github.com/Opentrons/opentrons/issues/3110)
* **api:** Set P10M1.5 pick up increment to 3mm ([#3374](https://github.com/Opentrons/opentrons/issues/3374)) ([f5b63d0](https://github.com/Opentrons/opentrons/commit/f5b63d0))
* **api:** validate JSON protocols before executing ([#3318](https://github.com/Opentrons/opentrons/issues/3318)) ([9c15f7d](https://github.com/Opentrons/opentrons/commit/9c15f7d)), closes [#3250](https://github.com/Opentrons/opentrons/issues/3250)
* **shared-data:** update P300M 1.5 pick up current to 0.9 A ([#3355](https://github.com/Opentrons/opentrons/issues/3355)) ([a2d9024](https://github.com/Opentrons/opentrons/commit/a2d9024))





<a name="3.8.1"></a>
## [3.8.1](https://github.com/Opentrons/opentrons/compare/v3.8.0...v3.8.1) (2019-03-29)


### Bug Fixes

* **api,shared-data:** Lowercase labware names and camelCase categories ([#3234](https://github.com/Opentrons/opentrons/issues/3234)) ([55e332e](https://github.com/Opentrons/opentrons/commit/55e332e)), closes [#3231](https://github.com/Opentrons/opentrons/issues/3231)
* **shared-data:** Ensure all volumes are µL; remove displayLengthUnits ([#3262](https://github.com/Opentrons/opentrons/issues/3262)) ([031f2b9](https://github.com/Opentrons/opentrons/commit/031f2b9)), closes [#3240](https://github.com/Opentrons/opentrons/issues/3240)
* **shared-data:** fix case of 'brand' text ([#3258](https://github.com/Opentrons/opentrons/issues/3258)) ([3dbe35a](https://github.com/Opentrons/opentrons/commit/3dbe35a))


### Features

* **api:** Add more pick up tip config elements to pipette config ([#3237](https://github.com/Opentrons/opentrons/issues/3237)) ([f69da42](https://github.com/Opentrons/opentrons/commit/f69da42))
* **api:** Add support for (p300m,p50m,p10s,p1000s)v1.5 ([#3265](https://github.com/Opentrons/opentrons/issues/3265)) ([9dfc127](https://github.com/Opentrons/opentrons/commit/9dfc127))
* **api:** Add support for p300s v1.5 ([#3276](https://github.com/Opentrons/opentrons/issues/3276)) ([e4ca4ff](https://github.com/Opentrons/opentrons/commit/e4ca4ff))
* **api:** move-to-slot JSON protocol command ([#3242](https://github.com/Opentrons/opentrons/issues/3242)) ([cef5123](https://github.com/Opentrons/opentrons/commit/cef5123))





<a name="3.8.0"></a>
# [3.8.0](https://github.com/Opentrons/opentrons/compare/v3.7.0...v3.8.0) (2019-03-19)


### Bug Fixes

* **api:** Fix mistakenly-changed pick up current for p10s1.4 ([#3155](https://github.com/Opentrons/opentrons/issues/3155)) ([7474752](https://github.com/Opentrons/opentrons/commit/7474752))
* **shared-data:** fix y axis svg value for fixed trash ([#3151](https://github.com/Opentrons/opentrons/issues/3151)) ([248f3ec](https://github.com/Opentrons/opentrons/commit/248f3ec))


### Features

* **api:** add pipette config endpoint ([#3128](https://github.com/Opentrons/opentrons/issues/3128)) ([b6b958b](https://github.com/Opentrons/opentrons/commit/b6b958b))





<a name="3.7.0"></a>
# [3.7.0](https://github.com/Opentrons/opentrons/compare/v3.6.5...v3.7.0) (2019-02-19)


### Bug Fixes

* **protocol-designer:** fix bug where 'default-values' shape did not conform to JSON schema ([#3032](https://github.com/Opentrons/opentrons/issues/3032)) ([6c86496](https://github.com/Opentrons/opentrons/commit/6c86496))
* **shared-data:** add tests to ensure filename matches name/loadName ([#2849](https://github.com/Opentrons/opentrons/issues/2849)) ([e821079](https://github.com/Opentrons/opentrons/commit/e821079))
* **shared-data:** fix irregular labware generator ([#2855](https://github.com/Opentrons/opentrons/issues/2855)) ([f405c8e](https://github.com/Opentrons/opentrons/commit/f405c8e))


### Features

* **api:** Add ability to use papi2 in protocol ([#2803](https://github.com/Opentrons/opentrons/issues/2803)) ([6bbb83c](https://github.com/Opentrons/opentrons/commit/6bbb83c))
* **api:** Add calibrate labware and tip probe with new protocol API ([#2846](https://github.com/Opentrons/opentrons/issues/2846)) ([3264cff](https://github.com/Opentrons/opentrons/commit/3264cff)), closes [#2719](https://github.com/Opentrons/opentrons/issues/2719)
* **api:** Add json protocol execution to new protocol API ([#2854](https://github.com/Opentrons/opentrons/issues/2854)) ([48bbcb1](https://github.com/Opentrons/opentrons/commit/48bbcb1)), closes [#2248](https://github.com/Opentrons/opentrons/issues/2248)
* **api:** Add skeleton of Thermocycler API class ([#3015](https://github.com/Opentrons/opentrons/issues/3015)) ([b42f318](https://github.com/Opentrons/opentrons/commit/b42f318)), closes [#2992](https://github.com/Opentrons/opentrons/issues/2992)
* **api:** api2: Move multichannel center for certain labwares ([#2900](https://github.com/Opentrons/opentrons/issues/2900)) ([dfb60a5](https://github.com/Opentrons/opentrons/commit/dfb60a5)), closes [#2892](https://github.com/Opentrons/opentrons/issues/2892)
* **api:** decrease plunger acceleration and add drop tip speed to config ([#2904](https://github.com/Opentrons/opentrons/issues/2904)) ([dc64b0d](https://github.com/Opentrons/opentrons/commit/dc64b0d))
* **api:** pipette config plunger position ([#2999](https://github.com/Opentrons/opentrons/issues/2999)) ([cbd559a](https://github.com/Opentrons/opentrons/commit/cbd559a))


### Performance Improvements

* **api:** New aspiration functions for all pipettes ([#3014](https://github.com/Opentrons/opentrons/issues/3014)) ([ae850ce](https://github.com/Opentrons/opentrons/commit/ae850ce)), closes [#3012](https://github.com/Opentrons/opentrons/issues/3012)





<a name="3.6.5"></a>
## [3.6.5](https://github.com/Opentrons/opentrons/compare/v3.6.4...v3.6.5) (2018-12-18)

**Note:** Version bump only for package @opentrons/shared-data





<a name="3.6.4"></a>
## [3.6.4](https://github.com/Opentrons/opentrons/compare/v3.6.3...v3.6.4) (2018-12-17)


### Performance Improvements

* **api:** Update P1000S aspirate function ([#2830](https://github.com/Opentrons/opentrons/issues/2830)) ([ca65283](https://github.com/Opentrons/opentrons/commit/ca65283))





<a name="3.6.3"></a>
## [3.6.3](https://github.com/Opentrons/opentrons/compare/v3.6.2...v3.6.3) (2018-12-13)


### Bug Fixes

* **api:** raise p300s droptip pose by 1mm to increase QC yield ([#2808](https://github.com/Opentrons/opentrons/issues/2808)) ([40759b2](https://github.com/Opentrons/opentrons/commit/40759b2))





<a name="3.6.2"></a>
## [3.6.2](https://github.com/Opentrons/opentrons/compare/v3.6.0...v3.6.2) (2018-12-11)


### Features

* **api:** p10 behavior feature flag ([#2794](https://github.com/Opentrons/opentrons/issues/2794)) ([c468b06](https://github.com/Opentrons/opentrons/commit/c468b06)), closes [#2792](https://github.com/Opentrons/opentrons/issues/2792)
* **shared-data:** Add more new labware definitions to shared-data ([#2703](https://github.com/Opentrons/opentrons/issues/2703)) ([9737196](https://github.com/Opentrons/opentrons/commit/9737196))





<a name="3.6.1"></a>
## [3.6.1](https://github.com/Opentrons/opentrons/compare/v3.6.0...v3.6.1) (2018-12-05)

**Note:** Version bump only for package @opentrons/shared-data





<a name="3.6.0"></a>
# [3.6.0](https://github.com/Opentrons/opentrons/compare/v3.6.0-beta.1...v3.6.0) (2018-11-29)


### Bug Fixes

* **shared-data:** fix total-liquid-volume of opentrons-tuberack-50ml ([#2744](https://github.com/Opentrons/opentrons/issues/2744)) ([aef8cc8](https://github.com/Opentrons/opentrons/commit/aef8cc8)), closes [#2743](https://github.com/Opentrons/opentrons/issues/2743)





<a name="3.6.0-beta.1"></a>
# [3.6.0-beta.1](https://github.com/Opentrons/opentrons/compare/v3.6.0-beta.0...v3.6.0-beta.1) (2018-11-27)


### Bug Fixes

* **api:** re-position p1000 droptip/blowout positions ([#2681](https://github.com/Opentrons/opentrons/issues/2681)) ([f0cf01b](https://github.com/Opentrons/opentrons/commit/f0cf01b))


### Features

* **api:** Add 1.5ml tuberack to old labware definition section ([#2679](https://github.com/Opentrons/opentrons/issues/2679)) ([2739038](https://github.com/Opentrons/opentrons/commit/2739038))
* **api:** Adds pipette models v1.4 to robot config ([#2689](https://github.com/Opentrons/opentrons/issues/2689)) ([fd9c38a](https://github.com/Opentrons/opentrons/commit/fd9c38a))





<a name="3.6.0-beta.0"></a>
# [3.6.0-beta.0](https://github.com/Opentrons/opentrons/compare/v3.5.1...v3.6.0-beta.0) (2018-11-13)


### Features

* **api:** support offset in json protocol touch-tip command ([#2566](https://github.com/Opentrons/opentrons/issues/2566)) ([d54ee84](https://github.com/Opentrons/opentrons/commit/d54ee84))
* **shared-data:** Add generator function for irregular labware ([#2610](https://github.com/Opentrons/opentrons/issues/2610)) ([ad568c1](https://github.com/Opentrons/opentrons/commit/ad568c1)), closes [#2275](https://github.com/Opentrons/opentrons/issues/2275)
* **shared-data:** support unversioned pipettes in JSON protocols ([#2605](https://github.com/Opentrons/opentrons/issues/2605)) ([9e84ff6](https://github.com/Opentrons/opentrons/commit/9e84ff6))





<a name="3.5.1"></a>
# [3.5.1](https://github.com/Opentrons/opentrons/compare/v3.5.0...v3.5.1) (2018-10-26)


**Note:** Version bump only for package @opentrons/shared-data




<a name="3.5.0"></a>
# [3.5.0](https://github.com/Opentrons/opentrons/compare/v3.5.0-beta.1...v3.5.0) (2018-10-25)


### Bug Fixes

* **shared-data:** Fix corner offset from slot logic; add in container offset to well coordinates ([#2519](https://github.com/Opentrons/opentrons/issues/2519)) ([c79684b](https://github.com/Opentrons/opentrons/commit/c79684b))


### Features

* **api:** Add error checking on generated labware def ([#2476](https://github.com/Opentrons/opentrons/issues/2476)) ([242ffe4](https://github.com/Opentrons/opentrons/commit/242ffe4))





<a name="3.5.0-beta.1"></a>
# [3.5.0-beta.1](https://github.com/Opentrons/opentrons/compare/v3.5.0-beta.0...v3.5.0-beta.1) (2018-10-16)


### Features

* **api:** Add labware load to protocol API ([#2472](https://github.com/Opentrons/opentrons/issues/2472)) ([bae6ef6](https://github.com/Opentrons/opentrons/commit/bae6ef6)), closes [#2240](https://github.com/Opentrons/opentrons/issues/2240)
* **api:** Add newly formatted labware defs and update labware schema ([#2457](https://github.com/Opentrons/opentrons/issues/2457)) ([690c0f2](https://github.com/Opentrons/opentrons/commit/690c0f2))
* **api:** Store pipette function params as data ([#2466](https://github.com/Opentrons/opentrons/issues/2466)) ([4e557dd](https://github.com/Opentrons/opentrons/commit/4e557dd))





<a name="3.5.0-beta.0"></a>
# [3.5.0-beta.0](https://github.com/Opentrons/opentrons/compare/v3.4.0...v3.5.0-beta.0) (2018-10-11)


### Features

* **shared-data:** Add generator function to create regular labware defs ([#2380](https://github.com/Opentrons/opentrons/issues/2380)) ([bc81574](https://github.com/Opentrons/opentrons/commit/bc81574))





<a name="3.4.0"></a>
# [3.4.0](https://github.com/Opentrons/opentrons/compare/v3.4.0-beta.0...v3.4.0) (2018-09-21)


### Bug Fixes

* **api:** Update the aluminum block definitions to match drawings ([#2342](https://github.com/Opentrons/opentrons/issues/2342)) ([4c1e4c2](https://github.com/Opentrons/opentrons/commit/4c1e4c2)), closes [#2292](https://github.com/Opentrons/opentrons/issues/2292)
* **protocol-designer:** fix bug with well access for rect wells ([#2296](https://github.com/Opentrons/opentrons/issues/2296)) ([309a8bf](https://github.com/Opentrons/opentrons/commit/309a8bf)), closes [#2081](https://github.com/Opentrons/opentrons/issues/2081)


### Features

* **protocol-designer:** modify well selection instructional text ([#2263](https://github.com/Opentrons/opentrons/issues/2263)) ([9ec91a4](https://github.com/Opentrons/opentrons/commit/9ec91a4)), closes [#2204](https://github.com/Opentrons/opentrons/issues/2204)





<a name="3.4.0-beta.0"></a>
# [3.4.0-beta.0](https://github.com/Opentrons/opentrons/compare/v3.3.1-beta.0...v3.4.0-beta.0) (2018-09-14)


### Features

* **api:** Add new container defs to shared data ([#2225](https://github.com/Opentrons/opentrons/issues/2225)) ([20e2751](https://github.com/Opentrons/opentrons/commit/20e2751))
* **api:** Added min and max volume keywords to pipette constructors ([#2084](https://github.com/Opentrons/opentrons/issues/2084)) ([f68da5a](https://github.com/Opentrons/opentrons/commit/f68da5a)), closes [#2075](https://github.com/Opentrons/opentrons/issues/2075)





<a name="3.3.1-beta.0"></a>
## [3.3.1-beta.0](https://github.com/Opentrons/opentrons/compare/v3.3.0...v3.3.1-beta.0) (2018-09-10)


### Bug Fixes

* **shared-data:** fix tube-rack-15_50ml labware def ([#2063](https://github.com/Opentrons/opentrons/issues/2063)) ([b32df5e](https://github.com/Opentrons/opentrons/commit/b32df5e))


### Features

* **api:** support flow rate (uL/sec) in JSON protocols ([#2123](https://github.com/Opentrons/opentrons/issues/2123)) ([b0f944e](https://github.com/Opentrons/opentrons/commit/b0f944e))
* **protocol-designer:** support mm from bottom offset in JSON protocols ([#2180](https://github.com/Opentrons/opentrons/issues/2180)) ([db22ae8](https://github.com/Opentrons/opentrons/commit/db22ae8)), closes [#2157](https://github.com/Opentrons/opentrons/issues/2157)





<a name="3.3.0"></a>
# [3.3.0](https://github.com/Opentrons/opentrons/compare/v3.3.0-beta.1...v3.3.0) (2018-08-22)


### Features

* **api:** Consolidate pipette configuration ([#2055](https://github.com/Opentrons/opentrons/issues/2055)) ([ee39ea3](https://github.com/Opentrons/opentrons/commit/ee39ea3))





<a name="3.3.0-beta.1"></a>
# [3.3.0-beta.1](https://github.com/Opentrons/opentrons/compare/v3.3.0-beta.0...v3.3.0-beta.1) (2018-08-02)

**Note:** Version bump only for package @opentrons/shared-data





<a name="3.3.0-beta.0"></a>
# [3.3.0-beta.0](https://github.com/Opentrons/opentrons/compare/v3.2.0-beta.3...v3.3.0-beta.0) (2018-07-12)


### Features

* **components:** use labware defs from shared-data for Deck component ([26493f4](https://github.com/Opentrons/opentrons/commit/26493f4))
* **protocol-designer:** add form level validation errors and warnings ([#1823](https://github.com/Opentrons/opentrons/issues/1823)) ([9cdd66f](https://github.com/Opentrons/opentrons/commit/9cdd66f)), closes [#1090](https://github.com/Opentrons/opentrons/issues/1090) [#1595](https://github.com/Opentrons/opentrons/issues/1595) [#1592](https://github.com/Opentrons/opentrons/issues/1592) [#1594](https://github.com/Opentrons/opentrons/issues/1594)
* **shared-data:** annotate labware with format and other metadata ([9d4082d](https://github.com/Opentrons/opentrons/commit/9d4082d))





<a name="3.2.0"></a>
# [3.2.0](https://github.com/Opentrons/opentrons/compare/v3.2.0-beta.3...v3.2.0) (2018-07-10)

**Note:** Version bump only for package @opentrons/shared-data





<a name="3.2.0-beta.3"></a>
# [3.2.0-beta.3](https://github.com/Opentrons/opentrons/compare/v3.2.0-beta.2...v3.2.0-beta.3) (2018-06-25)

**Note:** Version bump only for package @opentrons/shared-data





<a name="3.2.0-beta.2"></a>
# [3.2.0-beta.2](https://github.com/Opentrons/opentrons/compare/v3.2.0-beta.1...v3.2.0-beta.2) (2018-06-22)

**Note:** Version bump only for package @opentrons/shared-data





<a name="3.2.0-beta.1"></a>
# [3.2.0-beta.1](https://github.com/Opentrons/opentrons/compare/v3.2.0-beta.0...v3.2.0-beta.1) (2018-06-19)

**Note:** Version bump only for package @opentrons/shared-data





<a name="3.2.0-beta.0"></a>
# [3.2.0-beta.0](https://github.com/Opentrons/opentrons/compare/v3.1.2...v3.2.0-beta.0) (2018-06-13)

**Note:** Version bump only for package @opentrons/shared-data
