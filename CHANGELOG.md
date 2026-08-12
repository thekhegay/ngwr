# Changelog

## [11.1.0](https://github.com/thekhegay/ngwr/compare/v11.0.0...v11.1.0) (2026-08-12)

### Bug Fixes

* **stepper:** draw the vertical connector under the indicator ([ca85ddf](https://github.com/thekhegay/ngwr/commit/ca85ddf0ad796de45234a1d12f00e0dd0b3b643b))
* **theme:** give the dark primary a white label and re-derive its ink ([7607a9d](https://github.com/thekhegay/ngwr/commit/7607a9d29f1b41db212524eb0ad89db21706d11b))
* **theme:** route intent-as-text onto -ink across the library ([843ef6e](https://github.com/thekhegay/ngwr/commit/843ef6ebde7aeb1eaf006e7cc3b95bbbe5d53bf9))

## [11.0.0](https://github.com/thekhegay/ngwr/compare/v10.2.1...v11.0.0) (2026-08-12)

### ⚠ BREAKING CHANGES

* **theme:** deepen five intents so white wins their label

### Features

* **calendar:** step the day the way the grid points under rtl ([c5f417f](https://github.com/thekhegay/ngwr/commit/c5f417f6215229cc78294fdb060f748b62b31963))
* **compare:** mirror the wipe under rtl ([32ad94a](https://github.com/thekhegay/ngwr/commit/32ad94a2008e865dcb4adae82ac69efa33740cfe))
* **config:** app-wide component defaults through a config provider ([995f1f5](https://github.com/thekhegay/ngwr/commit/995f1f52fefa8d85bfc91ad05bebddd6c222fcdf))
* **context-menu:** open a submenu on the arrow it cascades toward ([2dba3a7](https://github.com/thekhegay/ngwr/commit/2dba3a7d88ac7d9996fff5306b89c3910e5131c5))
* **input-otp:** walk the boxes along the visual strip under rtl ([8380e7e](https://github.com/thekhegay/ngwr/commit/8380e7ee8f20cbcf3bba0c934bc1462127688ce8))
* **lint:** fail on a physical css property with no stated reason ([6f493c9](https://github.com/thekhegay/ngwr/commit/6f493c9b0ec60e40c128cda0571113bbc0a566be))
* **lint:** fail when a box escapes the viewport only under rtl ([79677d4](https://github.com/thekhegay/ngwr/commit/79677d47f6fb7117bda42c1737b75fc870e84b1a))
* **markdown:** let a highlighter be injected and invalidated ([45e5a7b](https://github.com/thekhegay/ngwr/commit/45e5a7bc137acba95de0d50b77a3bf303abd73f7))
* **markdown:** render markdown as dom with a streaming-aware parser ([8b11ac6](https://github.com/thekhegay/ngwr/commit/8b11ac675c2fcb85bfc3ed6e8b82e032592940ba))
* **mcp:** ship an ngwr-mcp server that makes the catalog askable ([405f5cd](https://github.com/thekhegay/ngwr/commit/405f5cd7c2422f44413ba0e6a8245e0adc1f80a7))
* **popover:** mark the trigger host with wr-popover-trigger ([9c78075](https://github.com/thekhegay/ngwr/commit/9c780755d8184c66efb85fc839493b6142cd5f37))
* **rating:** mirror the arrows under rtl, and pin the knob that must not ([1f0e09b](https://github.com/thekhegay/ngwr/commit/1f0e09bd1146b42903aa3105d2f81fea46d63959))
* **showcase:** add a direction toggle and keep code blocks ltr ([7fe29b0](https://github.com/thekhegay/ngwr/commit/7fe29b08df54542381333662d4d93dda3f8bbfe1))
* **slider:** mirror keyboard and pointer input under rtl ([595fd88](https://github.com/thekhegay/ngwr/commit/595fd8833b9900a6e0f2a94fad4b2ffb1870bc16))
* **splitter:** mirror the drag and the arrows under rtl ([569afca](https://github.com/thekhegay/ngwr/commit/569afcadfd50202d752aed5201e19721a8137d2e))
* **table:** mirror column resize and reorder under rtl ([a14ba40](https://github.com/thekhegay/ngwr/commit/a14ba40a33d76710958fae19ac9e8a49a9b2e3e1))
* **tabs:** mirror the arrow walk and the carousel travel under rtl ([94f1f9f](https://github.com/thekhegay/ngwr/commit/94f1f9f01fb1cbd90cada968a8737f69ced8308e))
* **testing:** cdk harness for the markdown renderer ([5dd9fd5](https://github.com/thekhegay/ngwr/commit/5dd9fd50192b1aaa1f40e0fbecd9e2ae631b82e5))
* **testing:** cdk harnesses for button, input, checkbox and switch ([f0462d3](https://github.com/thekhegay/ngwr/commit/f0462d3db6f68859d12ea9d812d6ece6dba54498))
* **testing:** cdk harnesses for date-picker, dropdown, popover, drawer and table ([9a427cd](https://github.com/thekhegay/ngwr/commit/9a427cdf3b5fd8fdb4c8a172534ba9f02ac27e4f))
* **testing:** cdk harnesses for select, dialog and toast ([4a73259](https://github.com/thekhegay/ngwr/commit/4a732593f344dcd02ea463d2b19150006a7be406))
* **testing:** cdk harnesses for the navigation and disclosure set ([94e2b11](https://github.com/thekhegay/ngwr/commit/94e2b111a31223b8c859ea4569cb97e216ac57ce))
* **testing:** cdk harnesses for the plain form controls ([b3fc7c1](https://github.com/thekhegay/ngwr/commit/b3fc7c1f1f2bd9021c2d799d65ae299a62da8960))
* **testing:** cdk harnesses for the remaining overlays, tree and form-field ([729f689](https://github.com/thekhegay/ngwr/commit/729f689b30a719a8a74456019d6ae6974450aafd))
* **theme:** resolve control size and shape through the app config ([f85f522](https://github.com/thekhegay/ngwr/commit/f85f5227c1478235e5850620ad6e0e27b719fe02))
* **theme:** sweep the library to logical properties for rtl ([be7b45c](https://github.com/thekhegay/ngwr/commit/be7b45c259544a37f634eb83a9f9d0136517ac33))
* **toast:** tell the copy and close actions apart with modifiers ([37ee1e3](https://github.com/thekhegay/ngwr/commit/37ee1e32adfda1c4ddf998cac6133df442016910))
* **tree:** swap the expand arrows under rtl ([a801d35](https://github.com/thekhegay/ngwr/commit/a801d355baa608b53dae107f4614a012e66a98c9))

### Bug Fixes

* **action-sheet:** route the fallback dialog name through the catalog ([2b464f5](https://github.com/thekhegay/ngwr/commit/2b464f5be06c5bae7797b37d190fbfeec03dfd53))
* **affix:** emit the transition rather than every observer entry ([542fef1](https://github.com/thekhegay/ngwr/commit/542fef1f07800e4261441c5d6686fab579d1b952))
* **affix:** rebuild the observer when the offset changes ([3354425](https://github.com/thekhegay/ngwr/commit/3354425511f6ce5d43dca1eb931352db213b2973))
* **anchor:** translate the landmark name and spy after the first render ([16e281c](https://github.com/thekhegay/ngwr/commit/16e281c7599ac1716bf14465a201f93ec11f1be8))
* **avatar:** fall back to the initials when the image fails ([55e64a8](https://github.com/thekhegay/ngwr/commit/55e64a8c5e77f65f998a7fff51610df498c6cdb7))
* **back-top:** keep the hidden button out of the tab order ([19cfbe2](https://github.com/thekhegay/ngwr/commit/19cfbe2a68dd7e616cd1b96b735aeb90ab0bf44f))
* **back-top:** render the built-in arrow only as fallback content ([78939a2](https://github.com/thekhegay/ngwr/commit/78939a258f8347db8cb65592e77d074e04fbfe32))
* **bar-chart:** name each bar and survive a non-finite datum ([3d3e1d3](https://github.com/thekhegay/ngwr/commit/3d3e1d31fb76f3ee0d847292b661f328c2192a25))
* **burger:** route the toggle label through the catalog ([93209b7](https://github.com/thekhegay/ngwr/commit/93209b78bd14f7d7ea4d6fe9dc9d8cdad237fc95))
* **calendar-heatmap:** name the grid and localize its labels ([28913d0](https://github.com/thekhegay/ngwr/commit/28913d0bd18a82a2541fe2b2d835c0542e4fc822))
* **carousel:** hold autoplay for the keyboard and clamp the active slide ([0060eed](https://github.com/thekhegay/ngwr/commit/0060eedf719f01f535f863211b955cd38374d553))
* **click-spark:** keep the spark canvas out of the accessible tree ([b3266fa](https://github.com/thekhegay/ngwr/commit/b3266fa4683e686cfafb9f74163f44fdc83cb427))
* **color-picker:** honour the format input and harden the drag ([208ccf7](https://github.com/thekhegay/ngwr/commit/208ccf71e32c4453634a016206e3ae6fe3e21570))
* **color-picker:** say the trigger opens a dialog, and when it is open ([3154341](https://github.com/thekhegay/ngwr/commit/3154341f761f66cea1c3d4ea0acf0f08b4329715))
* **command-palette:** navigate the options in the order they render ([9a2cd1d](https://github.com/thekhegay/ngwr/commit/9a2cd1d403699a2807b1b11f11858f8fc2e04d38))
* **command-palette:** scroll the active option into view ([e957eb6](https://github.com/thekhegay/ngwr/commit/e957eb635a3b2df7bf886c36ae68d7f68ef60319))
* **compare:** clamp the divider and guard the pointer ([42f8979](https://github.com/thekhegay/ngwr/commit/42f89795987c8f47b8a1d2aa2365f2c1bd39a355))
* **context-menu:** publish aria-controls and refresh aria-expanded ([814d6ca](https://github.com/thekhegay/ngwr/commit/814d6ca409e01a54a8b18e87d7b005883d01bc8d))
* **cookie:** send secure with samesite none ([083f586](https://github.com/thekhegay/ngwr/commit/083f586761dc8825abc1017d6f05d8bd4c976b4c))
* **counter:** honour reduced motion and coerce the value ([fc77e17](https://github.com/thekhegay/ngwr/commit/fc77e17e4f204f915fbb366dd979187470192e0a))
* **date-adapter-luxon:** compare displayed days and respect quoted patterns ([e50ab0e](https://github.com/thekhegay/ngwr/commit/e50ab0e5a15d71444f5db2df98d6c6e4c39232bb))
* **date-adapter:** reject impossible dates and read month names ([5deb364](https://github.com/thekhegay/ngwr/commit/5deb364a83e31be35e2887d84b743b983f09eb74))
* **date-picker:** filter typed dates and wait for a typed time ([ae57e5f](https://github.com/thekhegay/ngwr/commit/ae57e5f4bf1f3dab33e95f8c803d6e3c7f14333b))
* **date-picker:** keep the open panel in step with the field ([2317e27](https://github.com/thekhegay/ngwr/commit/2317e27333d3959da1b7702c16472f0a51e6af42))
* **decrypt-text:** count characters the way the animation walks them ([61a5076](https://github.com/thekhegay/ngwr/commit/61a5076bcad22b4911a32c1ee211f3701ef935f0))
* **directives:** report a refused copy and give focus back ([bfb9e0b](https://github.com/thekhegay/ngwr/commit/bfb9e0b41bd082f9f7f82bbbdacd40a03ebd1356))
* **directives:** sharpen the cases that passed for the wrong reason ([95ecb35](https://github.com/thekhegay/ngwr/commit/95ecb35ee4ba65926bc6d203866e9c78a17c2e59))
* **donut-chart:** keep one bad datum from rescaling the ring ([3f9c799](https://github.com/thekhegay/ngwr/commit/3f9c799fce86d354cafdb389c803dd9631fc09de))
* **dropdown:** keep the trigger id and block a disabled item ([9e250c0](https://github.com/thekhegay/ngwr/commit/9e250c066482e5effc80b38b8e6acecb3e217889))
* **empty:** make the icon input mean the icon it names ([5584a6b](https://github.com/thekhegay/ngwr/commit/5584a6b8a499df7e63f6ffcb22084eed1d96aca5))
* **event-calendar:** keep the cursor and the drag origin on the real cell ([3d225cb](https://github.com/thekhegay/ngwr/commit/3d225cbc127130dddd21cea55b1c354e3456184c))
* **event-calendar:** name each column after the day it holds ([6962f1b](https://github.com/thekhegay/ngwr/commit/6962f1bfd462b5ec9f9dee29ffea2ba53dc08ec1))
* **form:** point the label at the id the control kept ([9de83b1](https://github.com/thekhegay/ngwr/commit/9de83b15c13fefd8ccb12d10973dcd75b71b8cff))
* **fuzzy-text:** give the painted text something a reader can reach ([778b933](https://github.com/thekhegay/ngwr/commit/778b9337958116c9b14775857a1223c10d95ce4f))
* **gauge:** announce a reading inside its own range ([670f5a6](https://github.com/thekhegay/ngwr/commit/670f5a689a87a82bf921fd25106632bf45495703))
* **image-cropper:** forget the old crop when the source changes ([024be23](https://github.com/thekhegay/ngwr/commit/024be23dc8470423f8e73a0d10319306c07f2cd3))
* **knob:** focus the dial and ignore a secondary pointer ([c83c8a4](https://github.com/thekhegay/ngwr/commit/c83c8a4a72a86d1a697eea0608d6ba7463ac4f57))
* **knob:** snap to the step grid and announce its read-only state ([1cd50ad](https://github.com/thekhegay/ngwr/commit/1cd50ad00941910eef50a3b74d01a0c383c0a63c))
* **layout:** report every sider collapse, not only a toggle ([367d909](https://github.com/thekhegay/ngwr/commit/367d9093cf4c4686a8464f244628286c5abf5de8))
* **lightbox:** close on the image click and stop a failed load shimmering ([9fbe8cc](https://github.com/thekhegay/ngwr/commit/9fbe8cc65e4973db08947002f29b6f025a3d02f3))
* **line-chart:** name the plot and survive a non-finite datum ([ffe4728](https://github.com/thekhegay/ngwr/commit/ffe4728439fc733376df904618a678475d2c4a0f))
* **marquee:** name the region and its links through the catalog ([4a3c516](https://github.com/thekhegay/ngwr/commit/4a3c516453fa872083d43af29ea1a67602f5133c))
* **mcp:** close eleven defects the post-rewrite audit found ([8270539](https://github.com/thekhegay/ngwr/commit/8270539bf02b494c549ae0dda8a41c1f1093f3bb))
* **mcp:** report the package's own version, not the caller's ([f0cace5](https://github.com/thekhegay/ngwr/commit/f0cace5fdfa24002badb3e354e7ca3e1719c2803))
* **mention:** stop escape's keyup reopening the panel it dismissed ([d285fa9](https://github.com/thekhegay/ngwr/commit/d285fa9138903dfed29da3a518f3c6b716038362))
* **meta:** give each pushed layer its own identity ([e64fec0](https://github.com/thekhegay/ngwr/commit/e64fec0d87540f95219f65d2578a8b9b9179007b))
* **meta:** stop the binding effect re-running on its own write ([ccbec3b](https://github.com/thekhegay/ngwr/commit/ccbec3b7e187f3066bff3542f15483815e381c16))
* **meter-group:** keep the announced value inside its range ([e178aa7](https://github.com/thekhegay/ngwr/commit/e178aa73122d7ff3ed29cb4d4a6ec4fff96ffaa9))
* **overlay:** mirror connected-position offsets under rtl ([672c650](https://github.com/thekhegay/ngwr/commit/672c650d90d04bba6005e4cc5bc21c91cf29a882))
* **pagination:** pull the page back when the total shrinks ([3ec0f56](https://github.com/thekhegay/ngwr/commit/3ec0f563f286e31a8170859984e102ec4457a752))
* **popconfirm:** announce the dialog and localize its buttons ([3d80d43](https://github.com/thekhegay/ngwr/commit/3d80d4328015292811ae19b7d30c14bad1c4fe3a))
* **popconfirm:** name the panel and mark the trigger and its actions ([a1d756a](https://github.com/thekhegay/ngwr/commit/a1d756a8705e93beae8294cc59145372d7a70246))
* **pull-to-refresh:** abandon a cancelled pull instead of refreshing ([eafe090](https://github.com/thekhegay/ngwr/commit/eafe090d5f95e72f0d8363adb3cd1f3792f18ef8))
* **qr:** announce the code as a named image ([bfd755c](https://github.com/thekhegay/ngwr/commit/bfd755c5982fb530e058b306fd505d9bf95c3361))
* **select:** honour the minimum query length and dim the sheet ([cb69e27](https://github.com/thekhegay/ngwr/commit/cb69e275a352b34a9ed43b8f4f0a2229757d0b15))
* **select:** keep the clear button at the trigger's tail when chips wrap ([61798a0](https://github.com/thekhegay/ngwr/commit/61798a05e43bb6dd21be00ecada946c663c502dd))
* **select:** walk the options in the order they are shown ([ce58f65](https://github.com/thekhegay/ngwr/commit/ce58f65a80bfc1bd07b275bfc88cd222bc2c581a))
* **showcase:** let a keyboard scroll the code blocks and demo boxes ([cf40503](https://github.com/thekhegay/ngwr/commit/cf405039ac052870617df44e262a1d63a6b2ae39))
* **showcase:** make collapsed sidebar groups inert ([d89613f](https://github.com/thekhegay/ngwr/commit/d89613f6b3b499e3158cea06dd2c7fe00836b175))
* **sidebar:** expand the group that owns the route ([99be974](https://github.com/thekhegay/ngwr/commit/99be974818a34728308663c700158a1fd81be325))
* **sidebar:** put the active row badge on the calibrated pairing ([90ecd55](https://github.com/thekhegay/ngwr/commit/90ecd55af67ea658ce5546e426adc149fba32a1e))
* **sparkline:** centre a flat series and drop non-finite data ([57adaa4](https://github.com/thekhegay/ngwr/commit/57adaa4040370e336a2a4c3bd6e1008651b0b7c6))
* **speed-dial:** let escape close the dial and disable its actions ([5a0dc07](https://github.com/thekhegay/ngwr/commit/5a0dc07272d71ddc7c111304ce0cb1a1a71bef3e))
* **spinner:** use the catalog label the theme already shipped ([bdee20a](https://github.com/thekhegay/ngwr/commit/bdee20acdaf33f4f30701a31fb0180f7b96a584a))
* **split-text:** keep the split text readable to a screen reader ([c2b8211](https://github.com/thekhegay/ngwr/commit/c2b821191278389416a57839984dde62c5c5bc30))
* **splitter:** name the divider and clamp an outside write ([67a1e73](https://github.com/thekhegay/ngwr/commit/67a1e73e45adc2afb17731de11ccc91a7f83c219))
* **statistic:** guard the countdown against an unparsable target ([332de75](https://github.com/thekhegay/ngwr/commit/332de75f350372219a189e20263c1dffcf6ec749))
* **statistic:** show the placeholder for an empty value ([387b234](https://github.com/thekhegay/ngwr/commit/387b234434f9f090cdaa5e70a9c4301a9fe412c6))
* **table:** keep the page and the select-all inside the data ([87802dc](https://github.com/thekhegay/ngwr/commit/87802dce738f0b62312ebc7141d3c9d3db0682c0))
* **table:** measure the virtual rows the view actually rendered ([d7bf2e4](https://github.com/thekhegay/ngwr/commit/d7bf2e42e5f0e6b0a782302f512bcd2af7779c29))
* **table:** notice a filter selection the signals cannot see ([0a6ffec](https://github.com/thekhegay/ngwr/commit/0a6ffecc405c4feecbf046718adf589f40f4a688))
* **tabs:** stop a disabled tab navigating and holding the tab stop ([8c09749](https://github.com/thekhegay/ngwr/commit/8c097490cc0a35e942097209c0ed94c27ac194d8))
* **textarea:** release the inline height when autosize is off ([a00ff10](https://github.com/thekhegay/ngwr/commit/a00ff10167a309d2ad955e4284308614877da044))
* **theme:** deepen five intents so white wins their label ([cfc9cb2](https://github.com/thekhegay/ngwr/commit/cfc9cb2bf235a49ba7526b89e050b05d38aa914e))
* **theme:** export the sass entry for event-calendar, tour and transfer ([da6c7c8](https://github.com/thekhegay/ngwr/commit/da6c7c824f912057b110f974db4c06af0801ece3))
* **tour:** keep the cut-out under the card and clean up each step ([a288a4e](https://github.com/thekhegay/ngwr/commit/a288a4ecc3ff9ac9a743b45a62e136f059ec3560))
* **transfer:** commit only the rows a pane is showing ([0583a1a](https://github.com/thekhegay/ngwr/commit/0583a1a2b5cdf5ce5edcbb8895aede423b36627f))
* **tree:** keep the cursor, the focus and the row positions honest ([924ec02](https://github.com/thekhegay/ngwr/commit/924ec029f7da1ed9b30143666a9974026933cdff))
* **typewriter:** reverse text by character, not by code unit ([673d9d6](https://github.com/thekhegay/ngwr/commit/673d9d62afb10d3a0e1a8266f2de990fa9ed40a5))
* **virtual-scroll:** resolve the buffer pair so one input cannot throw ([fa92d7a](https://github.com/thekhegay/ngwr/commit/fa92d7a1978f97f9d26041e4326e10d06b1330ed))

## [10.2.1](https://github.com/thekhegay/ngwr/compare/v10.2.0...v10.2.1) (2026-08-10)

### Features

* **date-picker:** move focus into the popup it opens ([2ce8f31](https://github.com/thekhegay/ngwr/commit/2ce8f316c22d833f096386dad05d3bc2a2107a2d))

### Bug Fixes

* **a11y:** name overlay dialogs and reach close all by keyboard ([9849401](https://github.com/thekhegay/ngwr/commit/98494014475da06bf1df5b3f67813b29425095bb))
* **breadcrumbs:** let a plain href render a real link ([c04b828](https://github.com/thekhegay/ngwr/commit/c04b828156524a9393e83ae9301e5144ba5a00d7))
* **button:** give the element form real button semantics ([9e83ef7](https://github.com/thekhegay/ngwr/commit/9e83ef7c7929b67db1f5b0e8c2f6df7c45f6efe6))
* **calendar:** move real focus with the roving tabindex ([53386c8](https://github.com/thekhegay/ngwr/commit/53386c81d6c5311b2ce81d5c5e7d4f38c64de93f))
* **date-picker:** harden the range picker's focus, aria and editing ([53348e9](https://github.com/thekhegay/ngwr/commit/53348e923ea395514d4ad4f73d58b36a10e364e4))
* **date-picker:** show the bound time in datetime mode ([f5ed23c](https://github.com/thekhegay/ngwr/commit/f5ed23ce66060d3563cea29dbc94f902310bb984))
* **dialog:** give the dismiss button a real name without i18n ([1f47f4a](https://github.com/thekhegay/ngwr/commit/1f47f4afcf478303a73348c02716109f9fd01e08))
* **dialog:** let tall content scroll instead of clipping the footer ([a0fa2da](https://github.com/thekhegay/ngwr/commit/a0fa2da9c88b759c59d1bea12982e16e4b60cdcd))
* **window:** raise the clicked window above the others ([8eb5599](https://github.com/thekhegay/ngwr/commit/8eb5599793b353a2cae770b1152cd93ea84e1c51))
* **window:** replay the close result and save the chosen geometry ([8c38d18](https://github.com/thekhegay/ngwr/commit/8c38d18660a805bd98cf84dc1b6a45080de95089))

## [10.2.0](https://github.com/thekhegay/ngwr/compare/v10.1.0...v10.2.0) (2026-08-09)

### Features

* **a11y:** gate contrast and target size in a real browser ([e98dd3b](https://github.com/thekhegay/ngwr/commit/e98dd3bada3267901e8de0a86a0023f58c419f46))

### Bug Fixes

* **alert:** use the ink ramp so the title clears aa as text ([25ede35](https://github.com/thekhegay/ngwr/commit/25ede35c270ad23f8005db1050fc2d94a41902d3))
* **theme:** move intent text onto the ink and contrast tokens ([5664654](https://github.com/thekhegay/ngwr/commit/5664654f9af0aed44a6adb30b574bef7aa64f0f4))
* **theme:** pick pure black for the contrast ramp ([3ded269](https://github.com/thekhegay/ngwr/commit/3ded26930dbd477e3a63775d456ed9f5247b72e6))
* **theme:** recalibrate the ink ramp against the soft tints ([0235f75](https://github.com/thekhegay/ngwr/commit/0235f75c2b2cf9981876f8667c1ba9c565ca7315))

## [10.1.0](https://github.com/thekhegay/ngwr/compare/v10.0.0...v10.1.0) (2026-08-08)

### Features

* **a11y:** gate ci on axe-core over the prerendered showcase ([8e001b5](https://github.com/thekhegay/ngwr/commit/8e001b5d53c54ed69c0223f83de790de78733621))
* **docs:** generate api tables from the library jsdoc ([99696ea](https://github.com/thekhegay/ngwr/commit/99696eae7f5f28a23c5d30f178b9c025c23a62a0))
* **docs:** serve every docs page as markdown at .md ([ddb5967](https://github.com/thekhegay/ngwr/commit/ddb5967984ca5dd40b21639215e9ba0ee0e3b7cf))
* **event-calendar:** add month, week and day event views ([50e7bb6](https://github.com/thekhegay/ngwr/commit/50e7bb6e8788b3ebbabf88a3ae734cae5d5e4bcc))
* **form:** resolve validation messages from a central catalog ([aff858e](https://github.com/thekhegay/ngwr/commit/aff858e5d308760be214679677d3251f0ca54ae3))
* **table:** render a row hierarchy as a treegrid ([ecb8bc4](https://github.com/thekhegay/ngwr/commit/ecb8bc42473fc367e270144ab351475f66dea9f8))
* **tour:** add a guided product tour ([e25bc03](https://github.com/thekhegay/ngwr/commit/e25bc037563e3bb18cbe0005b0c7fef6c5d400d9))
* **transfer:** add a dual listbox picker ([cb3fbfb](https://github.com/thekhegay/ngwr/commit/cb3fbfb188b1d7cae10a7394f94a1fce6d879e10))
* **validators:** add a group-level equality validator ([493c57d](https://github.com/thekhegay/ngwr/commit/493c57d902f5377f8dea8a6adbd1a9325be3e288))

### Bug Fixes

* **a11y:** give every unnamed control an accessible name ([ee0805e](https://github.com/thekhegay/ngwr/commit/ee0805e46b201ea8fa75d5f0c63bbdd1ad4af16d))
* **a11y:** name every control and route built-in strings through i18n ([bca2916](https://github.com/thekhegay/ngwr/commit/bca2916abcc09f81f38890b46427724dbb37d96a))
* **a11y:** route the remaining built-in labels through the catalog ([f4ca63f](https://github.com/thekhegay/ngwr/commit/f4ca63f9482457e4be8c91a8626c1bc783b83500))
* **ci:** drop inherited write scopes and gate archive builds on prerender ([acf20a7](https://github.com/thekhegay/ngwr/commit/acf20a7b24dd27e9d229ab5355b2f5b03dd0d45c))
* **ci:** make the archived-docs banner reserve space instead of covering content ([b4039f1](https://github.com/thekhegay/ngwr/commit/b4039f1fca45c18b7c71494d81cfe49694729310))
* **ci:** never archive a release candidate as a major's frozen docs ([dbb8483](https://github.com/thekhegay/ngwr/commit/dbb8483f659a7ff107299289f02222e82d7ca1bf))
* **docs:** make llms-full.txt describe the real catalog ([49eca2e](https://github.com/thekhegay/ngwr/commit/49eca2e213cb6358aa93953f885bd395e311b5a4))
* **docs:** read input aliases and skip internal components ([2088595](https://github.com/thekhegay/ngwr/commit/208859564eb769abf52647cd10a353c904fdb5b5))
* **docs:** stop the api drift check reporting false positives ([b6759e2](https://github.com/thekhegay/ngwr/commit/b6759e2ccc3ee7cc5fa48b244c87740cb51f225e))
* **form:** render the error message the validator actually reports ([04ba81a](https://github.com/thekhegay/ngwr/commit/04ba81a6928e2758cb453eaddd3174e5bbe2cd8e))
* **i18n:** default the loader so components work without a provider ([0ba3694](https://github.com/thekhegay/ngwr/commit/0ba36945eac4efeabee97e35b7c36f96d260b296))
* **lib:** dispose overlays and observers on destroy, trap focus in lightbox ([08c3ab3](https://github.com/thekhegay/ngwr/commit/08c3ab3b631567f38153909c31322a1f366d58fe))
* **lib:** export public types and stop offering types to ngwr:use ([9ccf8e9](https://github.com/thekhegay/ngwr/commit/9ccf8e9810ffcf7eb026ea19f53be7ea14442060))
* **lib:** stop stranding overlays and stacking teardowns per effect run ([c8a2f0b](https://github.com/thekhegay/ngwr/commit/c8a2f0b6ddf4b9c8e111c6a68085e8b509d53381))
* **media:** mirror the full scss breakpoint scale in the typescript map ([115b291](https://github.com/thekhegay/ngwr/commit/115b2915aeaef10dcb1cd58e8a5eb0e2dd4d861c))
* **schematics:** generate code against the real component api ([4382ea8](https://github.com/thekhegay/ngwr/commit/4382ea857959e6cc7b4182cd70c902c7ec7a848f))
* **showcase:** label the demo controls axe flagged ([9f7480f](https://github.com/thekhegay/ngwr/commit/9f7480f4948d6046927c2d7d25cb4601ce2a6e5e))
* **showcase:** list the archived v8 and v9 docs in the version switcher ([26d0afb](https://github.com/thekhegay/ngwr/commit/26d0afb65024e711dab9fab0f0db415a067006f5))
* **showcase:** switch code blocks to the high-contrast shiki themes ([575e5f2](https://github.com/thekhegay/ngwr/commit/575e5f26e086604a14ab5dcfbe88c9a342ac120b))
* **showcase:** use the muted role and ink ramp for low-contrast text ([b319af4](https://github.com/thekhegay/ngwr/commit/b319af45b9b843025853fcecefe1402759952258))
* **styles:** make every entry point carry the theme tokens it references ([c4f4c94](https://github.com/thekhegay/ngwr/commit/c4f4c94cb1dbaef23a764a6ceacbae6b1ee8c88a))
* **styles:** scope the cdk drag classes to the component that themes them ([502f021](https://github.com/thekhegay/ngwr/commit/502f02194e43d069e8be4bc4c62b0961548495da))
* **table:** clamp the virtual window so a shrinking list cannot blank the body ([5aea62d](https://github.com/thekhegay/ngwr/commit/5aea62d51c52d0bb2f1bd044a240ca1183608a96))
* **tabs:** seed active from the tab's real key ([197f8e6](https://github.com/thekhegay/ngwr/commit/197f8e64f543dc6ad22efe420125ac1e83e8eaeb))
* **theme:** add an ink ramp so intents clear aa as text ([b75d951](https://github.com/thekhegay/ngwr/commit/b75d951c819594bbb49212283d0b9d03b588279d))
* **theme:** keep the dark ink ramp inside the srgb gamut ([c931744](https://github.com/thekhegay/ngwr/commit/c931744d4ea4b5ad112b727c5b4fe3adabc643e4))

### Reverts

* **ci:** deploy the site on stable releases only ([26145ba](https://github.com/thekhegay/ngwr/commit/26145bad692478988d17d844a906a594dc7b20ab))

## [10.0.0](https://github.com/thekhegay/ngwr/compare/v9.1.0...v10.0.0) (2026-08-06)

### ⚠ BREAKING CHANGES

* **theme:** `--wr-color-*-contrast` now picks the foreground with the
  better WCAG contrast ratio instead of guessing from a YIQ brightness
  threshold, so five of the nine intents flip from white to dark text:
  secondary (3.99:1 → 4.52:1), success (3.33 → 5.43), danger (3.68 → 4.90),
  info (3.68 → 4.91) and medium (3.10 → 5.82). All five failed WCAG AA
  before; all nine now pass in both themes. The dark theme also re-derives
  `-contrast` for the intents it re-tunes, which lifts its lightened primary
  from 3.36:1 to 5.37:1. Override `$contrast-dark` / `$contrast-light`, or
  the base colours, to keep the old look. `$contrast-threshold` is no longer
  read but stays declared so existing `@use ... with (...)` calls compile.
* **table:** `--wr-table-head-transform` defaulted to `uppercase`, so
  the library rewrote every column title's casing. Rendering the author's
  text as written is the consumer's call, not ours. The default is now
  `none`, and the tracking moves with it (`0.04em` exists to open up
  capitals and looks wrong on sentence case). Both stay tokens, so the old
  treatment is one rule: set `--wr-table-head-transform: uppercase` and
  `--wr-table-head-letter-spacing: 0.04em` on `.wr-table`. Responsive card
  mode now routes through the same tokens instead of hard-coding the
  treatment, which is also a fix: opting out previously had no effect there.
* **popover:** tooltips were a light chip on a dark canvas and vice
  versa — a common convention, but next to every other ngwr surface it
  reads as a foreign element. They now use `--wr-color-surface` /
  `--wr-color-on-surface` with the standard outline, so a tooltip is dark
  in the dark theme and light in the light one. Three new tokens carry it,
  so restoring the inverted look is one rule rather than an override of
  every tooltip declaration: set `--wr-tooltip-bg`,
  `--wr-tooltip-color` and `--wr-tooltip-border` on `.wr-tooltip`.

### Features

* **dialog:** render a built-in close button, matched on drawer ([904fdde](https://github.com/thekhegay/ngwr/commit/904fdde37599043db6457a676e447ad1644b63eb))
* **i18n:** let base catalogs fill in under the loader ([f79c7d0](https://github.com/thekhegay/ngwr/commit/f79c7d0edfb37d9a9517fdb0110dc156d21faafc))
* **i18n:** ship the catalogs as json for the http loader path ([1b4db2e](https://github.com/thekhegay/ngwr/commit/1b4db2e1b921ddf9c5b0781b4f9f2196c5f37d00))
* **mention:** announce the suggestion list to screen readers ([2692836](https://github.com/thekhegay/ngwr/commit/2692836e36a10c0da16a427ebda7238d21c81bb1))
* **popover:** give the popover an arrow and cover every position ([9d68c88](https://github.com/thekhegay/ngwr/commit/9d68c881015dba75a42e6abd8cd81ceaa8ec69f1))

### Bug Fixes

* **badge:** bring the lg size back onto the scale ([387fe2c](https://github.com/thekhegay/ngwr/commit/387fe2cc077483df1507276d5946ec5086e955a1))
* **badge:** centre the text in the badge box ([fd69f2d](https://github.com/thekhegay/ngwr/commit/fd69f2d2fa6f79ad24f11296fe37a945de855d95))
* **button:** centre the glyph on icon-only buttons ([34128a1](https://github.com/thekhegay/ngwr/commit/34128a10c1575f96f0c0d073507a77f2d68746ac))
* **button:** give the outlined light variant a readable label ([5474db3](https://github.com/thekhegay/ngwr/commit/5474db340ae0b034f8dc7fbcb3163095fea40217))
* **button:** make icon-only buttons square ([5d6063e](https://github.com/thekhegay/ngwr/commit/5d6063ea70cd8c68d7fed7b137f04200ed05cec8))
* **button:** match the icon's optical spacing to the declared spacing ([c60b8d1](https://github.com/thekhegay/ngwr/commit/c60b8d141825fe5473b44bf4ae819ce6ad00872d))
* **date-picker:** use the real time format key so date-fns stops throwing ([6312074](https://github.com/thekhegay/ngwr/commit/6312074822250f5e9448d0007d56d26441db77e4))
* **dialog:** anchor the close button to the panel, not the viewport ([f76a11a](https://github.com/thekhegay/ngwr/commit/f76a11acc7b1a221f221e710ebe463c07922504c))
* **drawer:** let the grab handle be dragged with a mouse ([989e261](https://github.com/thekhegay/ngwr/commit/989e261a5942cdc901c7689a6f2aed2483eccdec))
* **i18n:** export the base-catalog provider ([c4ac9a6](https://github.com/thekhegay/ngwr/commit/c4ac9a6842b5a66ec66988af07f7661faceb1edd))
* **icon:** chain the icon registry so nested levels add up ([1c45cf7](https://github.com/thekhegay/ngwr/commit/1c45cf7b6095007e96104ae97f0f83e4734e084c))
* **icon:** report an unknown icon instead of throwing from the effect ([a7ff86f](https://github.com/thekhegay/ngwr/commit/a7ff86f363eff7cf3beaa15cd94b7fee274080fb))
* **icon:** scale the default icon size with the surrounding text ([2182f4a](https://github.com/thekhegay/ngwr/commit/2182f4ae2e7b6e1bc06535f18fdab0ea4b06a162))
* **icon:** stop flex parents from squeezing the icon below its size ([1eefea9](https://github.com/thekhegay/ngwr/commit/1eefea9b61232422d3697dffb36f9a99dda30a34))
* **input-number:** stop the stepper column from being squeezed ([ca551b9](https://github.com/thekhegay/ngwr/commit/ca551b9316e36bcbd4fd569d755e8d9b67a9b5af))
* **input:** centre affix icons instead of pinning them to the top ([9dec93a](https://github.com/thekhegay/ngwr/commit/9dec93ad6fd4d3bcbcf00bce0c37cbcb3cb06350))
* **input:** keep group affixes from shrinking and wrapping ([b44c871](https://github.com/thekhegay/ngwr/commit/b44c871e68105dce8a81f87e03cc179d867832f6))
* **keyboard:** scale the keycap bevel with the key size ([91bdf7c](https://github.com/thekhegay/ngwr/commit/91bdf7c092daa92853509cfce0b50199a7c9c488))
* **mention:** stop the commit handler crashing on its own input event ([233c941](https://github.com/thekhegay/ngwr/commit/233c9411d34920cfe4403c34c9be4dc26b786454))
* **overlay:** close overlays on clicks that land outside the body ([66496d9](https://github.com/thekhegay/ngwr/commit/66496d9a89bf8bfcdb6c88aaf945b63e7a59e1fc))
* **pagination:** pad the pager and size the page-size select to its label ([5783520](https://github.com/thekhegay/ngwr/commit/5783520a83908b2a24066fab77fdacda8a75079d))
* **pagination:** route the page-size and aria strings through i18n ([2f5b5be](https://github.com/thekhegay/ngwr/commit/2f5b5be097f0341b584259446ac700e00a0a4030))
* **popover:** expose dialog semantics on the popover panel ([c8145bb](https://github.com/thekhegay/ngwr/commit/c8145bbb12044e9591a6f8af1be38896fc9498be))
* **popover:** let the tooltip follow the theme instead of inverting ([7fc9765](https://github.com/thekhegay/ngwr/commit/7fc97651356e66a6401d12060deabca479439be2))
* **schematics:** make the shipped schematics loadable again ([e83bcd1](https://github.com/thekhegay/ngwr/commit/e83bcd1060e0fc7c63b298ce7d05cb72d68f2f01))
* **select:** space out option content and mark groups as groups ([5cd46ca](https://github.com/thekhegay/ngwr/commit/5cd46cab5bdde9c6ca66db46f2c94dd53a1c3e8f))
* **splitter:** let panes absorb the divider instead of overflowing ([5cfde39](https://github.com/thekhegay/ngwr/commit/5cfde392d2c525625ee15d093fb4a2f40d989665))
* **table:** stop forcing uppercase on header cells ([00c6efa](https://github.com/thekhegay/ngwr/commit/00c6efad445ba9ee3a21f85653117e28fb73c677))
* **tag:** line up the label with its adornment icon ([503f066](https://github.com/thekhegay/ngwr/commit/503f066e380c0bb100c80d7a8d5b35c7bf323ed6))
* **theme:** activate the theme and density services from their providers ([9fb1c00](https://github.com/thekhegay/ngwr/commit/9fb1c00849a6bd13efa1641cb44f8a6e52d21ed4))
* **theme:** declare the light color scheme and give the table a surface ([9869a8c](https://github.com/thekhegay/ngwr/commit/9869a8c07b6bb68dec85eefee5ac63b6df09e35a))
* **theme:** derive the dark theme's missing surface and ink shades ([04447b0](https://github.com/thekhegay/ngwr/commit/04447b03546203f8fc898810f162ffb0deec272f))
* **theme:** give muted text its own token so it clears wcag aa ([89a2a7e](https://github.com/thekhegay/ngwr/commit/89a2a7e0d0db7d1bcdaf14c2b096091720ce8f91))
* **theme:** make wr elements border-box without the opt-in reset ([66b3956](https://github.com/thekhegay/ngwr/commit/66b39565a08b34b722d143793e8e9864bcce58b5))
* **theme:** pick contrast text by wcag ratio, not a brightness guess ([22d0bc3](https://github.com/thekhegay/ngwr/commit/22d0bc3d5573f147fe763736fed925be51eb639f))
* **waves:** paint a static grid until the canvas boots ([2fc3c1f](https://github.com/thekhegay/ngwr/commit/2fc3c1f1d4a557c5ec9206afd68c738e40c370a5))

## [9.1.0](https://github.com/thekhegay/ngwr/compare/v9.0.1...v9.1.0) (2026-08-04)

### Features

* migration gaps ([#469](https://github.com/thekhegay/ngwr/issues/469)) ([d7cdb98](https://github.com/thekhegay/ngwr/commit/d7cdb98d1ebcbd3718ba719af05f692e21d85814))

### Bug Fixes

* seo canonical and social meta ([#468](https://github.com/thekhegay/ngwr/issues/468)) ([5892c32](https://github.com/thekhegay/ngwr/commit/5892c323cb69a88227a0aaff039c6c2e047a891a))

## [9.0.1](https://github.com/thekhegay/ngwr/compare/v9.0.0...v9.0.1) (2026-07-31)

### Bug Fixes

* v9 migration group scope ([#466](https://github.com/thekhegay/ngwr/issues/466)) ([242b2de](https://github.com/thekhegay/ngwr/commit/242b2de42fe7f273bc4f177c88d2b86497253e27))

## [9.0.0](https://github.com/thekhegay/ngwr/compare/v8.0.0...v9.0.0) (2026-07-31)

### ⚠ BREAKING CHANGES

* **theme:** add info to wr_colors so the type matches the palette (#432)
* register lucide icon names verbatim, not kebab-cased (#445)
* **checkbox:** the <wr-checkbox> group-membership input is renamed
  `value` → `checkboxValue`, because the signal-forms
  `FormCheckboxControl` contract reserves `value` (its form value is the
  boolean `checked` model). Run `ng update ngwr@9` — the migration-v9
  schematic rewrites `value=`, `[value]=` and `[(value)]=` on
  <wr-checkbox> elements automatically. The static form `<wr-checkbox
  value="x">` fails SILENTLY otherwise (it becomes a plain DOM attribute),
  so run the migration.

### Features

* add column drag-reorder to wr-table ([#449](https://github.com/thekhegay/ngwr/issues/449)) ([e917d27](https://github.com/thekhegay/ngwr/commit/e917d27d033710a3909604434dec5885d8d8b75a))
* add column pinning to wr-table ([#447](https://github.com/thekhegay/ngwr/issues/447)) ([7c7a5e8](https://github.com/thekhegay/ngwr/commit/7c7a5e85b88919e99f03a9434925cfd8aa9934a6))
* add column resizing to wr-table ([#448](https://github.com/thekhegay/ngwr/issues/448)) ([9fc44d9](https://github.com/thekhegay/ngwr/commit/9fc44d9fe1b9468facc3de496963e5634f8163db))
* add csv export to wr-table ([#453](https://github.com/thekhegay/ngwr/issues/453)) ([bb010fe](https://github.com/thekhegay/ngwr/commit/bb010fea149193f434f10274f399b7654f230761))
* add expandable rows to wr-table ([#451](https://github.com/thekhegay/ngwr/issues/451)) ([47036a5](https://github.com/thekhegay/ngwr/commit/47036a50c5b664d6107d7b483c3520c45007b93c))
* add per-demo phone-frame preview toggle ([#446](https://github.com/thekhegay/ngwr/issues/446)) ([57f9f7f](https://github.com/thekhegay/ngwr/commit/57f9f7fdb55df76cebcbde25e2dd8260504d0187))
* add row grouping to wr-table ([#454](https://github.com/thekhegay/ngwr/issues/454)) ([4df823e](https://github.com/thekhegay/ngwr/commit/4df823ec382c2ce855240f140ff797130884e6e4))
* add row selection to wr-table ([#450](https://github.com/thekhegay/ngwr/issues/450)) ([0e83ff4](https://github.com/thekhegay/ngwr/commit/0e83ff481d65731d72283465e78b71ea07c10977))
* add summary row to wr-table ([#452](https://github.com/thekhegay/ngwr/issues/452)) ([d4dc75e](https://github.com/thekhegay/ngwr/commit/d4dc75e9e60c19583b9af6e63c091ed1bd8c2e55))
* add virtual scroll to wr-select search mode ([#457](https://github.com/thekhegay/ngwr/issues/457)) ([75a4e09](https://github.com/thekhegay/ngwr/commit/75a4e093c90f8e9e2dfef949968ea6b6a8b3b975))
* add virtual scroll to wr-tree ([#456](https://github.com/thekhegay/ngwr/issues/456)) ([3c86f83](https://github.com/thekhegay/ngwr/commit/3c86f83aaafee839e1cfab5807b3145a165f4171))
* add virtualized body to wr-table ([#455](https://github.com/thekhegay/ngwr/issues/455)) ([ea4d0fb](https://github.com/thekhegay/ngwr/commit/ea4d0fb6ec8189ff295f2a98b4e4abaf48f8615d))
* add wr-action-sheet component ([#444](https://github.com/thekhegay/ngwr/issues/444)) ([fb26efa](https://github.com/thekhegay/ngwr/commit/fb26efaed2a6920e278d0faf8dd06022994d6711))
* add wr-haptics service wrapping the vibration api ([#442](https://github.com/thekhegay/ngwr/issues/442)) ([5858f6b](https://github.com/thekhegay/ngwr/commit/5858f6b8e358bcc57f05060ffc43126b44562eaa))
* add wr-pull-to-refresh component ([#443](https://github.com/thekhegay/ngwr/issues/443)) ([2b32807](https://github.com/thekhegay/ngwr/commit/2b328070c1c58c11e88c8e4a3acf6ee5f7320e43))
* add wr-statistic-group container-query dashboard grid ([#441](https://github.com/thekhegay/ngwr/issues/441)) ([4c037e1](https://github.com/thekhegay/ngwr/commit/4c037e18d0b4822c2ebe5dfdb3acb8d843fbbdde))
* **checkbox:** migrate off cva to signal forms ([#459](https://github.com/thekhegay/ngwr/issues/459)) ([b3f7e8a](https://github.com/thekhegay/ngwr/commit/b3f7e8a0c06f1e6986775578edb55e6cfbfc0b32))
* **date-picker:** migrate internal time panel off cva to signal forms ([#458](https://github.com/thekhegay/ngwr/issues/458)) ([aa60cb0](https://github.com/thekhegay/ngwr/commit/aa60cb0e5f41208a3f2d8b358608af2e8ec46aae))
* finish the touch-interaction pass ([#439](https://github.com/thekhegay/ngwr/issues/439)) ([8171fa7](https://github.com/thekhegay/ngwr/commit/8171fa765a8b153dce12fd94a2064ac5e40deff1))
* migrate the value controls to signal forms, add checkbox indeterminate ([#438](https://github.com/thekhegay/ngwr/issues/438)) ([fe5a3dc](https://github.com/thekhegay/ngwr/commit/fe5a3dc53cb15d67834eeb0154cbb4cf628a94b7))
* respect safe-area insets, dynamic viewport height, and the on-screen keyboard ([#440](https://github.com/thekhegay/ngwr/issues/440)) ([98af3e7](https://github.com/thekhegay/ngwr/commit/98af3e70b85687cda74129d70cd6b22f5fcf0277))
* **showcase:** prerender docs to static html ([#428](https://github.com/thekhegay/ngwr/issues/428)) ([6b42adc](https://github.com/thekhegay/ngwr/commit/6b42adc166967f28855577244519d4d2a94b4a0b))
* switch signal forms ([#437](https://github.com/thekhegay/ngwr/issues/437)) ([5dffab3](https://github.com/thekhegay/ngwr/commit/5dffab34682e69cba8337af54eee9c1b5e5f023b))
* **textarea:** implement formvaluecontrol for signal forms ([#430](https://github.com/thekhegay/ngwr/issues/430)) ([3e5541c](https://github.com/thekhegay/ngwr/commit/3e5541c8920fc75224ded081fbb720659d91d6a2))
* **theme:** add colour role aliases and move components onto them ([#429](https://github.com/thekhegay/ngwr/issues/429)) ([c7b161f](https://github.com/thekhegay/ngwr/commit/c7b161f59e3a2ad0975a0b9ec60c081c1fd44aef))

### Bug Fixes

* **docs:** correct broken snippets, swatch ring and keyboard cross-links ([#431](https://github.com/thekhegay/ngwr/issues/431)) ([9b47a2e](https://github.com/thekhegay/ngwr/commit/9b47a2ebe194f81a13171981870dbd778a22d83d))
* register lucide icon names verbatim, not kebab-cased ([#445](https://github.com/thekhegay/ngwr/issues/445)) ([55af65f](https://github.com/thekhegay/ngwr/commit/55af65f71700ada09ec157014ba9a1f081b40b3f))
* **schematics:** stop the v9 codemod renaming wr-checkbox-group value ([#464](https://github.com/thekhegay/ngwr/issues/464)) ([889b96b](https://github.com/thekhegay/ngwr/commit/889b96b73ba3ed3d672467d09b7036ebf51886b5))
* **showcase:** regenerate the sitemap from prerender output and refre… ([#435](https://github.com/thekhegay/ngwr/issues/435)) ([2cd6910](https://github.com/thekhegay/ngwr/commit/2cd691023cda3170b2761ab60964378aaafb7cd6))
* **theme:** add info to wr_colors so the type matches the palette ([#432](https://github.com/thekhegay/ngwr/issues/432)) ([6232080](https://github.com/thekhegay/ngwr/commit/62320804dee084769f9846335ec7b630461071b1))
* **tree:** treat a unitless viewportheight string as px ([#462](https://github.com/thekhegay/ngwr/issues/462)) ([84a5db6](https://github.com/thekhegay/ngwr/commit/84a5db6c8cb9f0bb213abc0eeee4542e12672e6e))

## [8.0.0](https://github.com/thekhegay/ngwr/compare/v7.3.0...v8.0.0) (2026-06-30)

### ⚠ BREAKING CHANGES

* qa fixes and settings dropdown; remove reveal and scramble-text (#415)
* **pagination:** reduce sizes to sm/md/lg (#406)
* token-driven theming, alert redesign, density sm/md/lg (#413)

### Features

* control-sizing contract + catalog-wide size/radius/font tokens ([#400](https://github.com/thekhegay/ngwr/issues/400)) ([1409405](https://github.com/thekhegay/ngwr/commit/1409405ff46f25cb91e0bc37823d0c6d6b806da5))
* design tokens docs section, gray ramp and role aliases ([#416](https://github.com/thekhegay/ngwr/issues/416)) ([e61b4d2](https://github.com/thekhegay/ngwr/commit/e61b4d21a0ba34073f91134b7c72198969a14a1f))
* qa fixes and settings dropdown; remove reveal and scramble-text ([#415](https://github.com/thekhegay/ngwr/issues/415)) ([af9f168](https://github.com/thekhegay/ngwr/commit/af9f168f672b2958ca10a3b5bb1494a9d26a7036))
* **radio:** add per-option disabled input ([#405](https://github.com/thekhegay/ngwr/issues/405)) ([cc39d00](https://github.com/thekhegay/ngwr/commit/cc39d00727a5736244f06b59fb628cd893aca626))
* **schematics:** v8 migration codemod and migration guide ([#417](https://github.com/thekhegay/ngwr/issues/417)) ([a2c7718](https://github.com/thekhegay/ngwr/commit/a2c7718bbe6e2147e3314185757dcd2a1b2653aa))
* **showcase:** version switcher in the header ([#418](https://github.com/thekhegay/ngwr/issues/418)) ([08c8938](https://github.com/thekhegay/ngwr/commit/08c8938e157dd2023c552c95721c2ab48908a282))
* token-driven theming, alert redesign, density sm/md/lg ([#413](https://github.com/thekhegay/ngwr/issues/413)) ([4661779](https://github.com/thekhegay/ngwr/commit/46617792be5bb54473de705cb6d51862f2cf430a))

### Bug Fixes

* **counter:** prevent odometer tween from restarting every frame ([#407](https://github.com/thekhegay/ngwr/issues/407)) ([7b6a704](https://github.com/thekhegay/ngwr/commit/7b6a704370668b0cd54558928917d8b1ce623fee))
* **pagination:** reduce sizes to sm/md/lg ([#406](https://github.com/thekhegay/ngwr/issues/406)) ([0a66b18](https://github.com/thekhegay/ngwr/commit/0a66b18cb0c9e64941294f56f50502e0708d0a9e))
* **showcase:** use wr-slider in progress interactive demo ([#404](https://github.com/thekhegay/ngwr/issues/404)) ([36bbcd4](https://github.com/thekhegay/ngwr/commit/36bbcd4d735b7fff0cb97c40cb23f61cad83b8d4))
* **validators:** flag whitespace-only values, reject urls missing // ([#402](https://github.com/thekhegay/ngwr/issues/402)) ([8db61b8](https://github.com/thekhegay/ngwr/commit/8db61b8d419d6dba73dd4a2ae9f2047bcbbd3f04))

## [7.3.0](https://github.com/thekhegay/ngwr/compare/v7.2.0...v7.3.0) (2026-06-25)

### Features

* **carousel:** swipe navigation with finger-follow ([#393](https://github.com/thekhegay/ngwr/issues/393)) ([8894774](https://github.com/thekhegay/ngwr/commit/88947746b365e60c7242f00c26123760b419711b))
* **context-menu:** open on touch long-press ([#396](https://github.com/thekhegay/ngwr/issues/396)) ([e729dcb](https://github.com/thekhegay/ngwr/commit/e729dcb01a5f84076d2c006efbe87173256a5f59))
* **density:** add touch preset for finger-friendly hit areas ([#385](https://github.com/thekhegay/ngwr/issues/385)) ([1ea094e](https://github.com/thekhegay/ngwr/commit/1ea094e78830ec778d70322aba0587e41c255cd0))
* **drag-drop:** touch start-delay so lists stay scrollable ([#397](https://github.com/thekhegay/ngwr/issues/397)) ([af913a6](https://github.com/thekhegay/ngwr/commit/af913a66046322a7309f0734fb30f4fd7ac85150))
* **drawer:** swipe-to-dismiss via the grab handle ([#391](https://github.com/thekhegay/ngwr/issues/391)) ([7b05f0d](https://github.com/thekhegay/ngwr/commit/7b05f0dce7cbd6e27079709bbb82b1ad6c2b3eee))
* responsive toolbar stacking and pagination compact pager ([#388](https://github.com/thekhegay/ngwr/issues/388)) ([4de2c13](https://github.com/thekhegay/ngwr/commit/4de2c13663f1de9589779132824ae7fed49ea375))
* swipe-to-dismiss on lightbox and toast ([#392](https://github.com/thekhegay/ngwr/issues/392)) ([8ab0119](https://github.com/thekhegay/ngwr/commit/8ab01194ab6f790b1a039050e0795c1bf39049e5))
* **table:** responsive stacked-card layout on narrow containers ([#389](https://github.com/thekhegay/ngwr/issues/389)) ([c7265da](https://github.com/thekhegay/ngwr/commit/c7265da6133c2792cf7853549865ccb69a0878cf))
* **tabs:** scroll-aware edge fades on the overflowing tab strip ([#386](https://github.com/thekhegay/ngwr/issues/386)) ([2f53ae6](https://github.com/thekhegay/ngwr/commit/2f53ae6f999b452d1b6cf323791c2ac3a58cfaaa))
* touch-sized handles for slider, splitter, color-picker ([#395](https://github.com/thekhegay/ngwr/issues/395)) ([cc1bc2f](https://github.com/thekhegay/ngwr/commit/cc1bc2f1ad05901017855743a2cc8321124409db))

### Bug Fixes

* **rotating-text:** run the enter animation after the new word renders ([#390](https://github.com/thekhegay/ngwr/issues/390)) ([7ced9a0](https://github.com/thekhegay/ngwr/commit/7ced9a08d6bb32b606d2eaf9753cd4547ddad429))

## [7.2.0](https://github.com/thekhegay/ngwr/compare/v7.1.0...v7.2.0) (2026-06-22)

### Features

* comfortable touch targets for dense content controls ([#376](https://github.com/thekhegay/ngwr/issues/376)) ([1439c55](https://github.com/thekhegay/ngwr/commit/1439c55aa32fb2650cd1293903ccc0a89084f486))
* **command-palette:** full-screen presentation on small viewports ([#373](https://github.com/thekhegay/ngwr/issues/373)) ([a4dade3](https://github.com/thekhegay/ngwr/commit/a4dade3dc266d1b3141e13537ddb93d64e8ecde5))
* **dropdown:** responsive bottom-sheet menu on small viewports ([#371](https://github.com/thekhegay/ngwr/issues/371)) ([8c65504](https://github.com/thekhegay/ngwr/commit/8c65504d8c0feb09522b7026e06fd0736d7ca1a5))
* honor safe-area insets on fixed surfaces (toast, command-palette, back-top) ([#377](https://github.com/thekhegay/ngwr/issues/377)) ([409556d](https://github.com/thekhegay/ngwr/commit/409556d0564f72ba186da16cd6f2adede122c726))
* opt-in container-query responsive reflow (descriptions, stepper, page-header) ([#378](https://github.com/thekhegay/ngwr/issues/378)) ([a14b1d0](https://github.com/thekhegay/ngwr/commit/a14b1d0da4e2d7392bbc0e96f6ee55b61e6a554f))
* **overlay:** responsive bottom-sheet overlays, applied to dialog ([#369](https://github.com/thekhegay/ngwr/issues/369)) ([58469a4](https://github.com/thekhegay/ngwr/commit/58469a4f9db5cd6a459475c07fbe0c764788b646))
* **popover:** responsive bottom-sheet panel in popover mode ([#372](https://github.com/thekhegay/ngwr/issues/372)) ([05e965b](https://github.com/thekhegay/ngwr/commit/05e965b0874da61466e73b3c29fba5a7a4123a7d))
* **select:** responsive bottom-sheet panel on small viewports ([#370](https://github.com/thekhegay/ngwr/issues/370)) ([e2089da](https://github.com/thekhegay/ngwr/commit/e2089daa24e8b7067636c3319979c6c1f273ecf4))
* **showcase:** mobile-responsive shell ([#368](https://github.com/thekhegay/ngwr/issues/368)) ([6aa3baf](https://github.com/thekhegay/ngwr/commit/6aa3bafb1d97973fbebd3d7b229f45b6144d9043))
* **theme:** touch-target mixin and apply to overlay close buttons ([#375](https://github.com/thekhegay/ngwr/issues/375)) ([8db4345](https://github.com/thekhegay/ngwr/commit/8db4345085a67368cd00026a29efbb48e70976e9))

### Bug Fixes

* **release:** insert new changelog section under the heading ([#366](https://github.com/thekhegay/ngwr/issues/366)) ([9fca643](https://github.com/thekhegay/ngwr/commit/9fca6436cb25ea1f832d284a92c078feb28f2601))

## [7.1.0](https://github.com/thekhegay/ngwr/compare/v7.0.0...v7.1.0) (2026-06-19)

### Features

* **burger:** animated menu-toggle component ([#357](https://github.com/thekhegay/ngwr/issues/357)) ([43941ea](https://github.com/thekhegay/ngwr/commit/43941ea47ee1035d28b15fba972e07e50fa6a7f3))
* **meta:** reactive bind() for locale-aware title ([#359](https://github.com/thekhegay/ngwr/issues/359)) ([763c326](https://github.com/thekhegay/ngwr/commit/763c326055f773aa80b15ac786be101f8abb7d8e))
* **popover:** add left/right start and end position variants ([#358](https://github.com/thekhegay/ngwr/issues/358)) ([6b93f7e](https://github.com/thekhegay/ngwr/commit/6b93f7ed63ce2928b10be7f5049c2c0f4c20174e))

## [7.0.0](https://github.com/thekhegay/ngwr/compare/v6.1.1...v7.0.0) (2026-06-12)

### ⚠ BREAKING CHANGES

* **Requires Angular 22.** All `@angular/*` peers now need `>= 22.0.0`.
* **Ten entry-points were folded into bigger components.** `ng update ngwr` rewrites templates, imports, and SCSS subpaths automatically:
  * `<wr-autocomplete>` → `<wr-select mode="search">`
  * `<wr-chips-input>` → `<wr-select mode="tag">`
  * `<wr-time-picker>` → `<wr-date-picker mode="time">`
  * `<wr-date-time-picker>` → `<wr-date-picker mode="datetime">`
  * `[wrTooltip]` / `<wr-tooltip>` → `[wrPopover]` / `<wr-popover mode="tooltip">`
  * `<wr-tree-select>` → `<wr-tree openOn="overlay">`
  * `<wr-bottom-sheet>` → `<wr-drawer position="bottom">`
  * `<wr-count-up-text>` → `<wr-count-up>` (entry: `ngwr/counter`)
  * `<wr-animated-text>` → `<wr-typewriter>` / `<wr-decrypt-text>` / `<wr-split-text>` per mode
  * `ngwr/count-up` → `ngwr/counter`, `ngwr/tag` → `ngwr/badge`, `ngwr/image` → `ngwr/lightbox`, `ngwr/form-field` → `ngwr/form` (entries merged; selectors unchanged)
* **Also migrated automatically:** `wr-select`'s `[multi]` alias → `mode="multi"`, and the removed `WrValidators.email` → Angular's own `Validators.email`.
* **Manual:** `<wr-aurora>`'s `colorA` / `colorB` / `colorC` inputs were replaced by a single `colorStops` array — update bindings by hand.
* **Class names dropped their `Component` / `Directive` / `Pipe` / `Service` suffixes** (`WrButtonComponent` → `WrButton`, file names lose the matching infix). Selectors are unchanged — update imports with a find-and-replace. Where a collision existed, the consumer-facing class keeps the bare name (`WrToast` service + `WrToastItem`, `WrMeta` + `WrMetaBinding`, `WrHotkey` + `WrHotkeyBinding`, `WrIcon` component + `WrIconDef` type).
* **`ngwr/icon` no longer ships built-in icons.** Register exactly the icons you use through a set adapter, e.g. `provideWrIcons(lucideIcons({ check: Check }))` with `lucideIcons` from `ngwr/icon/adapters/lucide`.
* **Visual defaults changed.** Dark mode was overhauled (new `--wr-shadow-*` / `--wr-z-*` token scales, dark-strengthened shadows); `--wr-border-radius-sm` bumped `0.25rem` → `0.375rem`; typography adopted the Flowbite scale with `tone` now opt-in; pagination defaults to `size="sm"`; toast defaults to the Sonner-style stack.

### Features

* **a11y:** add baseline :focus-visible ring across library controls ([63ef0c4](https://github.com/thekhegay/ngwr/commit/63ef0c4b7de88709b54097d1e9d60c835f07c466))
* **a11y:** dialog/drawer focus trap, dropdown/select keyboard nav, tabs arrow keys, combobox wiring ([bc29f31](https://github.com/thekhegay/ngwr/commit/bc29f31911e34966d6b16c032eab5094d68d3ba4))
* **a11y:** tooltip/popover ARIA, collapse inert, toast/alert role escalation, nav landmarks, sidebar/pagination/carousel polish ([e812b22](https://github.com/thekhegay/ngwr/commit/e812b22336ddcf84139aed15a4c22fe5c0418c7c))
* add [squircle] variant to button, button-group, checkbox, file-upload, input, segmented ([f6bb6d3](https://github.com/thekhegay/ngwr/commit/f6bb6d31fc93429a487b0147f6366e62d95fa03b))
* **affix:** [wrAffix] sticky directive with IntersectionObserver active-state ([1fb4048](https://github.com/thekhegay/ngwr/commit/1fb404866223b2a6f83f221a5e6cf4fbc84eb855))
* **alert:** add type-specific leading icon ([8fc65d9](https://github.com/thekhegay/ngwr/commit/8fc65d9975123c1bad14cdc9590c4151c55969b8))
* **animations:** flatten sidebar; add ReactbitsCredit chip on every port page ([3d58fbc](https://github.com/thekhegay/ngwr/commit/3d58fbc0ba86b0a941e15c905652ebf93fa2bb21))
* **aurora:** rewrite as webgl2 simplex shader with reactbits color stops/amplitude/blend/speed ([489536c](https://github.com/thekhegay/ngwr/commit/489536c53c49dd03591ca1ab0f6039c97c2a37db))
* **aurora:** theme-aware default stops — deep violet/emerald on light, neon palette on dark ([ecd7a7a](https://github.com/thekhegay/ngwr/commit/ecd7a7a2f49e28994b546a2991b36131d4d42198))
* **avatar:** [shape] input — square | rounded | circle | squircle ([f8e47cd](https://github.com/thekhegay/ngwr/commit/f8e47cd67ebcd33f587c5433e98ec220fbdc5a5d))
* **badge, button:** squircle shape variant ([5703299](https://github.com/thekhegay/ngwr/commit/57032990c2382b6be1309dcfca66b2c232c00dfd))
* **badge:** [shape] input replacing [rounded] ([1e0002c](https://github.com/thekhegay/ngwr/commit/1e0002cf76b393c7d3d42893a8f410bcc5b89dac))
* **badge:** outlined variant ([df95816](https://github.com/thekhegay/ngwr/commit/df958161c87227e2a4f48e480b8f9aa06373de78))
* **blur-text:** port reactbits BlurText as wr-blur-text (3-keyframe blur reveal) ([642229d](https://github.com/thekhegay/ngwr/commit/642229d1a61a3c1bae56b184444c14de12fb45f6))
* **border-glow:** rewrite as cursor-tracked component (reactbits-style); move from /directives to /components ([fd3046a](https://github.com/thekhegay/ngwr/commit/fd3046a87dfb5ff27f9519d50f3cc375ecd705c1))
* **breadcrumbs:** add auto mode driven by router data.breadcrumb / data.title ([1e7e250](https://github.com/thekhegay/ngwr/commit/1e7e250d231be00f5563e54bc07b14ea24d018f0))
* **breadcrumb:** wr-breadcrumb + wr-breadcrumb-item with a11y nav landmark ([05b03b1](https://github.com/thekhegay/ngwr/commit/05b03b10b7663b01bbb6dc6e27b633639f104096))
* **button-group:** cascade [shape] to child buttons ([4993396](https://github.com/thekhegay/ngwr/commit/499339691336e33c0face6f12b1ca30247df05be))
* **button-group:** enforce shape on children, demo all three shapes ([2de54c1](https://github.com/thekhegay/ngwr/commit/2de54c1a588445b4e273e30eceb8795de15baec9))
* **button,squircle:** unify corner styles + add squircle border ([0124f9a](https://github.com/thekhegay/ngwr/commit/0124f9a1eb905d5ec7d2b4c5e504f76222fbdc3b))
* **calendar:** month and year quick-pick views in header ([4e93c99](https://github.com/thekhegay/ngwr/commit/4e93c9999bc9095d3f8f028c81068967b8892203))
* **calendar:** month-view calendar with single + range selection ([0ad3ec3](https://github.com/thekhegay/ngwr/commit/0ad3ec39005ede6e6848c0606d7b47c390a9e4bc))
* **card:** wr-card with header/footer slots, hoverable, loading, compact variants ([7584c38](https://github.com/thekhegay/ngwr/commit/7584c382fb78322058b1c80378ecde6dc38266d0))
* **cascader:** wr-cascader multi-level picker with cva + clearable + changeonselect ([e8aafa2](https://github.com/thekhegay/ngwr/commit/e8aafa245645591e1678872cc51f1e95835c0717))
* **cdk:** add css-size ([762f420](https://github.com/thekhegay/ngwr/commit/762f420196d3c12d6c02f4b29bd6a1a737dcdfb6))
* **circular-text:** port reactbits CircularText as wr-circular-text (pure CSS, 4 hover modes) ([ef6a791](https://github.com/thekhegay/ngwr/commit/ef6a7913381ce84f1c2ae037b1515f4d87276eb8))
* **click-spark:** port reactbits ClickSpark as wr-click-spark ([9bcc96b](https://github.com/thekhegay/ngwr/commit/9bcc96b321ce6fb2c03c40335d3c459178143a79))
* **collapse:** add dedicated <wr-accordion> component ([61da2ec](https://github.com/thekhegay/ngwr/commit/61da2ec6cbc98e4adac9238f02179038da8ae589))
* **color-picker:** hex/rgb/hsl tabs, channel inputs, swatches row ([2d915e3](https://github.com/thekhegay/ngwr/commit/2d915e37b1443cf02319c709fbcef8f7893d70ea))
* **color-picker:** inline component with sv canvas, hue, alpha, hex input ([8dc0173](https://github.com/thekhegay/ngwr/commit/8dc017307c695ef7cde560df5d74621b51209447))
* **color-picker:** wrColorPickerTrigger directive for popover usage ([ff2b61b](https://github.com/thekhegay/ngwr/commit/ff2b61b4ac97f830c14c9f3ffdc8541b52777847))
* **command-palette:** add ⌘K-style WrCommandPaletteComponent ([9c106e9](https://github.com/thekhegay/ngwr/commit/9c106e9ee95b6a5c08ea5c8c2bc486a5afd44424))
* **compare:** add WrCompareComponent before/after slider ([decd133](https://github.com/thekhegay/ngwr/commit/decd133471e288615cf7a28dec80a9687b57cb65))
* **confetti:** add WrConfettiService for celebration bursts ([c40124a](https://github.com/thekhegay/ngwr/commit/c40124a6ecde140d2713c1fb39739fde5ef619bd))
* **confetti:** angle option + edge/corner demo presets ([78c162d](https://github.com/thekhegay/ngwr/commit/78c162deedc4adbbfd8b9270eaf743e2fe812b17))
* **context-menu:** add <wr-context-menu> + [wrContextMenu] directive ([ceba2d0](https://github.com/thekhegay/ngwr/commit/ceba2d01ac0fbdf85f365f2d2e0a165c365409f4))
* **context-menu:** anchor to document, scroll-sync menu with content ([6d36312](https://github.com/thekhegay/ngwr/commit/6d3631293009eab427a6e837dfa027438dd4662d))
* **context-menu:** close on window resize — layout reflow stales the coords ([d9214ab](https://github.com/thekhegay/ngwr/commit/d9214abc528b00a39aa8aa57ac595208d6a361a1))
* **context-menu:** longer transition + smooth-br rounding + smaller item icons ([8767da6](https://github.com/thekhegay/ngwr/commit/8767da6033e98698c880bfdb34c37b25c927bc08))
* **context-menu:** open/close transition — fade + scale from click origin ([f6bd3d5](https://github.com/thekhegay/ngwr/commit/f6bd3d50f2df8d7ff116adfdced8c43d252600ba))
* **context-menu:** submenu via [submenu] + divider component + showcase docs ([4d5dee8](https://github.com/thekhegay/ngwr/commit/4d5dee86157b431a14d007b95c09b4c070cbca74))
* **counter:** add <wr-counter> with odometer + tween modes ([2f90097](https://github.com/thekhegay/ngwr/commit/2f90097a6e3e0ed0eadfedd3e202c997599f2fc5))
* **date-adapter:** add date-fns and luxon adapters ([64ec2ba](https://github.com/thekhegay/ngwr/commit/64ec2ba0900ee7a1354ca9eb62c80e99b18b9561))
* **date-adapter:** wr-date-adapter abstraction + native implementation ([b3244ae](https://github.com/thekhegay/ngwr/commit/b3244ae2e42f44c3a4b259db50395f4dd7bbcd7a))
* **date-picker:** open overlay on input click, not just icon ([157de82](https://github.com/thekhegay/ngwr/commit/157de82d67c8877ef0c08aa42b979643c484c850))
* **date-picker:** single-date picker with input, calendar icon, popover ([8601a19](https://github.com/thekhegay/ngwr/commit/8601a19801c0cf2f6de92fae69d8c6d69279e0e8))
* **decrypt-text:** port reactbits DecryptedText as wr-decrypt-text (4 trigger modes, sequential / non-sequential) ([1da54a0](https://github.com/thekhegay/ngwr/commit/1da54a03e293afe8e903dd0d1853378078badfa2))
* **density:** ngwr/density with compact/default/comfortable scale + per-subtree directive ([5878e35](https://github.com/thekhegay/ngwr/commit/5878e35653ca7e927a2a924b79b52015f5e5e7ab))
* **directives:** add [wrBorderGlow] with rotating conic-gradient border ([8c028c8](https://github.com/thekhegay/ngwr/commit/8c028c8543c7b3087a560c788f609f4682aa9d6c))
* **directives:** add [wrReveal] for scroll-triggered enter animations ([f58fe6d](https://github.com/thekhegay/ngwr/commit/f58fe6d857f894bc3703a6d4b27528fe91a108c3))
* **directives:** add [wrTilt], [wrSpotlight], [wrShimmer] ([690e07b](https://github.com/thekhegay/ngwr/commit/690e07bf86b8d40ddbd57fcbaeeb2c3834da0b17))
* **directives:** add ngwr/directives package ([e922e83](https://github.com/thekhegay/ngwr/commit/e922e83fd7b25ad28061f08d3623d4a7fcaea5d4))
* **divider:** inline label + [align] input ([df47e19](https://github.com/thekhegay/ngwr/commit/df47e19fa5da0909534435075c9f0bdaf2f044cf))
* **doc-code:** ts/html/scss tab support + collapse when no source ([262fb20](https://github.com/thekhegay/ngwr/commit/262fb203717347989567096110d57cfc360913e2))
* **doc-playground:** light-theme chips + color-picker control kind ([c239ead](https://github.com/thekhegay/ngwr/commit/c239ead7f0d0df790ffbb281a88d85d1d7493d5d))
* **docs:** cross-link related pages via docseealso block ([a47f8e4](https://github.com/thekhegay/ngwr/commit/a47f8e4b6e8966c785de44c50d74d69de8778246))
* **drag-drop:** wr-sortable-list + wrDragHandle (CDK wrapper) ([448453a](https://github.com/thekhegay/ngwr/commit/448453a67b49b1bfc8d67ac829d3fb0bee2daf0b))
* **eslint:** adopt angular-eslint v22 rule coverage ([4ac1a35](https://github.com/thekhegay/ngwr/commit/4ac1a35f9842b9c6346b99c8050d4c4e78f1b11b))
* **falling-text:** port reactbits FallingText as wr-falling-text (in-house AABB physics, no matter-js dep) ([093db52](https://github.com/thekhegay/ngwr/commit/093db52cfe4235f7bddffc1232119290f7ff86f8))
* **file-upload:** add WrFileUploadComponent ([0cb5860](https://github.com/thekhegay/ngwr/commit/0cb5860263b9a72222d7ed24f0bc945af0f33df3))
* **footer:** [compact] variant for docs pages (bottom row only) ([890975a](https://github.com/thekhegay/ngwr/commit/890975a50b5c65a835af29c1fa17226ab27d8437))
* **fuzzy-text:** port reactbits FuzzyText as wr-fuzzy-text (canvas per-row offset) ([c7893fd](https://github.com/thekhegay/ngwr/commit/c7893fd06ea8dd0901f08da1f81365fa7c6de252))
* **glitch-text:** port reactbits GlitchText as wr-glitch-text (pure CSS pseudo-clones) ([c9b87e0](https://github.com/thekhegay/ngwr/commit/c9b87e07c3e3e16169e22839bbea24dac0c7095a))
* **gradient-text:** port reactbits GradientText as wr-gradient-text (pure CSS, optional border ring) ([3c093ca](https://github.com/thekhegay/ngwr/commit/3c093cab85e011858bd11be96b07715d3a49ba04))
* hard-merge count-up→counter, tag→badge, image→lightbox; table demo + pagination ([4924781](https://github.com/thekhegay/ngwr/commit/49247812416b38093d422d5c2e3bc90f5ac35432))
* **header:** active state for nav links (primary tint pill) ([98f2727](https://github.com/thekhegay/ngwr/commit/98f27276fcf3bcd0620db6d25ab7d1be2818b66e))
* **home:** accent-colored spotlight on why cards; quieter section asides ([245dbe8](https://github.com/thekhegay/ngwr/commit/245dbe8fec6d4056c96fa7fc61625f0df57f2666))
* **home:** bento tiles are live — drop routerlink, wire inputs + theme + toasts ([5359930](https://github.com/thekhegay/ngwr/commit/535993085abe7719945eecc1aab67a607406a1a8))
* **home:** masonry bento layout; denser tiles + 4 new (search, skeleton, profile, code) ([3168a75](https://github.com/thekhegay/ngwr/commit/3168a75c06fa869766676e63d1cfea6c48ca97c3))
* **home:** rotating hero word, gradient accent, blur/split headings, motion gallery section ([c2b5364](https://github.com/thekhegay/ngwr/commit/c2b5364b80a3935d8e6afc412bbde0b536129528))
* **home:** trim hero (title + cta only), drop bg, add proper footer ([44b8712](https://github.com/thekhegay/ngwr/commit/44b87120e33de59ec0a297d752e6330e875c372f))
* **home:** wr-tag labels, shiki signup snippet, contained footer, original copy ([d87a90d](https://github.com/thekhegay/ngwr/commit/d87a90dd019479778ed06452f9c063963d99e369))
* **home:** zardui-style components bento; drop tilted bento-hero from hero ([0bacf77](https://github.com/thekhegay/ngwr/commit/0bacf772ff12a9537b6467cd99e85e5b66ec8cbe))
* **hotkey:** add WrHotkeyService + [wrHotkey] directive ([c359dbb](https://github.com/thekhegay/ngwr/commit/c359dbbf4a265c550d917575ba061ab4ba330c4f))
* **i18n:** add usei18nformatter, dedupe stale catalog sections, retrofit aria labels ([2c58570](https://github.com/thekhegay/ngwr/commit/2c585703de348f2c37b95340c96196a2abd9fa8f))
* **i18n:** ngwr/i18n with swappable loader, scopes, wrt pipe + directive ([7995b15](https://github.com/thekhegay/ngwr/commit/7995b158073946164de312ad20af57b2ba8b88a1))
* **i18n:** usei18ntext helper, retrofit 6 components, locale switcher, dark retune ([6867e45](https://github.com/thekhegay/ngwr/commit/6867e458d147e2c97fb04c26adfb075c160c6003))
* **icon:** drop built-in icons, refactor lib internals to inline svgs ([7cf3983](https://github.com/thekhegay/ngwr/commit/7cf3983f8a4e8c1a6c93fed067a9b9c6794a4680))
* **icons:** +13 icons and fix generator output type and path ([8dac58c](https://github.com/thekhegay/ngwr/commit/8dac58c062bcec0019952974b0104c0dee3dd93f))
* **icons:** add ngwr/icons/lucide adapter (1958 icons, peer-dep on lucide) ([733c7c9](https://github.com/thekhegay/ngwr/commit/733c7c9a9d38a9a45b88f7602cc55aaa494ecd9f))
* **icons:** add svgicon helper + feather adapter for raw-svg and inner-svg sources ([08123da](https://github.com/thekhegay/ngwr/commit/08123da7e702ff58bd79418f74c15138da2a5b47))
* **image-cropper:** add WrImageCropperComponent with aspect ratio + handles ([d42e73c](https://github.com/thekhegay/ngwr/commit/d42e73c6f4386bfd5531fe0a10119452ef5e50fc))
* **input:** convert to wrInput directive + wr-input-group + wr-password-toggle ([0ca85f4](https://github.com/thekhegay/ngwr/commit/0ca85f400562f7ff9bf0bfe17d219cb2609b579d))
* **keyboard,empty:** add <wr-kbd> keycap and <wr-empty> placeholder ([950d941](https://github.com/thekhegay/ngwr/commit/950d941aee9931e9118d5bc6a5dfd724c7629dd5))
* **keyboard:** physical-keycap restyle + full layout demo ([eee260f](https://github.com/thekhegay/ngwr/commit/eee260f30e29a24c8892335a7fa37874638d70a7))
* **layout-extras:** add Knob, Anchor ([b5028c0](https://github.com/thekhegay/ngwr/commit/b5028c00150ae23ff5e95eed170d423157238708))
* **layout-extras:** add MeterGroup, SpeedDial, Carousel ([f356427](https://github.com/thekhegay/ngwr/commit/f3564270896c7c639c3e6fae60becfb1bdf0871e))
* **layout-extras:** add PageHeader, Toolbar, Statistic, Descriptions, Result ([87d6e89](https://github.com/thekhegay/ngwr/commit/87d6e89f3bb3048ed94e89c3ba36b46472d2359c))
* **layout-extras:** add Splitter, Timeline, BackTop ([8c6256d](https://github.com/thekhegay/ngwr/commit/8c6256d40a759f32a6b5d910a597645ac4ad97e0))
* **layout:** add layout / header / sider / content / footer primitives ([0da4300](https://github.com/thekhegay/ngwr/commit/0da4300759c906d01c7992050bcd37abebaaa9d8))
* **list:** wr-list + wr-list-item with leading/trailing slots ([97cbc8a](https://github.com/thekhegay/ngwr/commit/97cbc8a82dcaa5e32d5e0f1558a4307320a2a509))
* **logo-loop:** port reactbits LogoLoop as wr-logo-loop ([8b4cf60](https://github.com/thekhegay/ngwr/commit/8b4cf6079694a000c8e579159dd52bc69eeac108))
* **media:** add WrMediaService with signal-based viewport queries ([14d2ab1](https://github.com/thekhegay/ngwr/commit/14d2ab1af0b994c677f611bd8dfe23f787d76696))
* **mention:** add WrMentionDirective with caret-anchored picker ([9628398](https://github.com/thekhegay/ngwr/commit/9628398950bfa4e697efd98d24dfda8d90df91e8))
* **meta:** add WrMetaService with push/pop stack + [wrMeta] directive ([66f28c1](https://github.com/thekhegay/ngwr/commit/66f28c1ee7d30b8fd6291411b25a57018a1da5c6))
* **motion:** add WrAnimatedTextComponent + WrCountUpComponent ([76f42a7](https://github.com/thekhegay/ngwr/commit/76f42a7da6b6bb0269c634e58750c06f48afb9b4))
* **motion:** add WrMarqueeComponent + WrAuroraComponent ([3d829d5](https://github.com/thekhegay/ngwr/commit/3d829d5e84bec0c61d51c8800b3cebdb3c79ddeb))
* **number-input:** add WrNumberInputComponent ([83cb4e2](https://github.com/thekhegay/ngwr/commit/83cb4e2fdd5c7f13dbddd7d677e4eef3b672fe47))
* **overlays:** unify open animation across dropdown/context-menu/popover/popconfirm ([d42d52d](https://github.com/thekhegay/ngwr/commit/d42d52de7639a55c6134a857c37e4e001f7ae0bc))
* **pagination:** add [size] (sm/md/lg) and [shape] (rounded/square) ([61bf75d](https://github.com/thekhegay/ngwr/commit/61bf75d1f9b46fa1ebacf33647ee2c338ed0b053))
* **pagination:** add xs and xl size variants ([950b33a](https://github.com/thekhegay/ngwr/commit/950b33a4adf749ccba02775bd62a0ea01e7c0d4c))
* **pipes:** add wrNumber / wrBytes / wrTruncate / wrDate ([1297cf4](https://github.com/thekhegay/ngwr/commit/1297cf4d78c3120350a3928778a9a4c014ca4152))
* **pipes:** wr-plural via intl rules; utils types docs; meta title template placeholder ([2567c4a](https://github.com/thekhegay/ngwr/commit/2567c4aaaac9d6d06d94e6b464540a24839cbbf1))
* **platform:** add WrPlatformService for SSR-safe environment probes ([05dad83](https://github.com/thekhegay/ngwr/commit/05dad836ce238f2efb6bf512286444bf6556de8c))
* **rating:** add WrRatingComponent ([36c5dde](https://github.com/thekhegay/ngwr/commit/36c5dde7550fabba367305e109e76211bb3a9bef))
* release pipeline overhaul, ESM migration, and v7 tooling polish ([#335](https://github.com/thekhegay/ngwr/issues/335)) ([eddc516](https://github.com/thekhegay/ngwr/commit/eddc516cd0cb0ce8597994aae46b942e4b2320e1))
* respect prefers-reduced-motion across the animations kit ([5b53ce7](https://github.com/thekhegay/ngwr/commit/5b53ce71f51b85a5f03aab99d72282654b7a7304))
* **rotating-text:** expose duration + easing inputs (reactbits parity) ([d2b2033](https://github.com/thekhegay/ngwr/commit/d2b2033669e8208fb8533a763514050846b8c586))
* **rotating-text:** port reactbits RotatingText as wr-rotating-text (WAAPI char-by-char swap) ([23bbfc4](https://github.com/thekhegay/ngwr/commit/23bbfc4a336cdc9c30e5913b8ac11338683ebf99))
* **schematics:** add ng add ngwr (styles + peer install + provider hint) ([abffe48](https://github.com/thekhegay/ngwr/commit/abffe4890a64aea884b76dbc41c6cd270bdd21d7))
* **schematics:** add ng g ngwr:icon-set generator ([641b619](https://github.com/thekhegay/ngwr/commit/641b6198c6972e716816ef197b38ca82cd897d90))
* **schematics:** add ng g ngwr:use generator (auto-import wr components) ([60466d0](https://github.com/thekhegay/ngwr/commit/60466d06622976178094841b78d877041b8fca17))
* **schematics:** add ng update ngwr v6→v7 consolidation migration ([333ad27](https://github.com/thekhegay/ngwr/commit/333ad274790c23c2996759c4933f1b2f2c02a401))
* **schematics:** add provider, component-style, and page generators ([8566baa](https://github.com/thekhegay/ngwr/commit/8566baa55381a792eb00aa285ac3f3823fa8ab34))
* **schematics:** ng add prompts for styles, date adapter, density, theme ([30f80fa](https://github.com/thekhegay/ngwr/commit/30f80fa156bba9d22af34d01f296713cd579d3f1))
* **scramble-text:** port reactbits ScrambledText as wr-scramble-text (dep-free per-char swap loop) ([84ec708](https://github.com/thekhegay/ngwr/commit/84ec708b26a30aff624a33324bb7d3c6134f2e5d))
* **scroll:** add WrScrollService with smooth-scroll + offset support ([9574161](https://github.com/thekhegay/ngwr/commit/9574161153a2a433aa4e5c2ce9678dcb1e3b153b))
* **select:** add search mode (sync filter), replacing the removed wr-autocomplete ([a0716f7](https://github.com/thekhegay/ngwr/commit/a0716f7b7ab2dfaaf333fb131d7ccc698c588b07))
* **select:** add tag mode (free-text chips), replacing the removed wr-chips-input ([72de906](https://github.com/thekhegay/ngwr/commit/72de90615f81fe11523b53bcc55ba9d7a7e90f96))
* **select:** multi mode with chips, clearable, maxtagcount, backspace remove ([fc722dc](https://github.com/thekhegay/ngwr/commit/fc722dc884ba557d7d4b094751a4de96b7171453))
* **select:** round out search mode with loader, debounce, minchars, freetext ([a62479b](https://github.com/thekhegay/ngwr/commit/a62479b80df801755bed83b89e5572d4217d0d3b))
* **shiny-text:** port reactbits ShinyText as wr-shiny-text (pure CSS keyframes) ([3007254](https://github.com/thekhegay/ngwr/commit/30072545629627b1121543f3736124e36e4876e9))
* **showcase/header:** publish rendered height to --ngwr-header-height on html ([a3f84ce](https://github.com/thekhegay/ngwr/commit/a3f84ce6817ece5efc49ede7d38db4ba42ee4a1a))
* **showcase/utils:** one page per utility (15 pages) ([5981b6e](https://github.com/thekhegay/ngwr/commit/5981b6e6d18e9baa19c916b0de1a6735ed6a45f9))
* **showcase/utils:** split misc into noop / badge-log / rate / focus pages ([d78588b](https://github.com/thekhegay/ngwr/commit/d78588bfd61bbee36f37a2c2630c7d5a0821cff7))
* **showcase:** ⌘K search trigger in header + global command palette ([b504ff0](https://github.com/thekhegay/ngwr/commit/b504ff048d9847f6cb480c96b87b6edcfbc1f530))
* **showcase:** add /animations section; move motion + border-glow + reveal/shimmer/spotlight/tilt + scaffold pages for aurora/marquee/animated-text/confetti ([4993583](https://github.com/thekhegay/ngwr/commit/499358331b74e16d38556cb99feae9c77e35a06f))
* **showcase:** add /icons section with lucide + feather browsers and svg-only primers ([071a1db](https://github.com/thekhegay/ngwr/commit/071a1db93604cc22e28674e7caa00685e4ccd30a))
* **showcase:** add configuration + schematics pages, ng add quick-start, i18n label rename ([854acc8](https://github.com/thekhegay/ngwr/commit/854acc847292db892ef51e0773a435fabe958c5e))
* **showcase:** add Directives/Pipes/Services/Utils to header nav ([9a859cd](https://github.com/thekhegay/ngwr/commit/9a859cd3ae6b5e38cb3419a35d41f276398e6f96))
* **showcase:** bento hero — tilted infinite-scroll wall of live components ([4fbfff6](https://github.com/thekhegay/ngwr/commit/4fbfff6dde02252fac796ede0d0cc03008319626))
* **showcase:** doc-playground with live controls + replay button (split-text reference) ([dc4626e](https://github.com/thekhegay/ngwr/commit/dc4626e084f513005950d069bf1b3b5ff39327bf))
* **showcase:** docapi sub-row indent via css, not text glyph ([4d3c2a6](https://github.com/thekhegay/ngwr/commit/4d3c2a624ca4ec2db504d01ada23141e0d89a1a2))
* **showcase:** full typography + translate sections with sidebars ([d5928d7](https://github.com/thekhegay/ngwr/commit/d5928d74715af5f4f47610bb032e4800ec30fb5f))
* **showcase:** group animations sidebar into text/blocks/effects/backgrounds ([8b4f84e](https://github.com/thekhegay/ngwr/commit/8b4f84eb966380623f3556dd29eef00893ef71dc))
* **showcase:** inline brand svgs + render every icon-set catalog ([1676d95](https://github.com/thekhegay/ngwr/commit/1676d95a8b76d1f6b061a164670066ad9930a34b))
* **showcase:** interfaces section, why-interfaces note, math util docs ([dbc2336](https://github.com/thekhegay/ngwr/commit/dbc2336cf2cf81608002955d11c7fa0f885bdcbf))
* **showcase:** list playground emits picked row ([0531bca](https://github.com/thekhegay/ngwr/commit/0531bca6b643cc615c511ccfdfdbb408340ac5ab))
* **showcase:** page labels use wr-badge with danger experimental ([490bcdd](https://github.com/thekhegay/ngwr/commit/490bcdd7a3d5fa7cccbfa5e78ff99454b6701191))
* **showcase:** promote validators to top-level section with per-validator pages ([4c1b4a3](https://github.com/thekhegay/ngwr/commit/4c1b4a38ec805bb864419045f2bd83c0b90d93cc))
* **showcase:** redesign landing page with hero, components grid, code card ([3d3ac81](https://github.com/thekhegay/ngwr/commit/3d3ac81d4a4208d6a831a4b8629f20449536a2af))
* **showcase:** replace code copy label with icon button ([46a906e](https://github.com/thekhegay/ngwr/commit/46a906ea44cf2af349d29320839eeeea9b67bc4e))
* **showcase:** restore showcase collage, weave zyraui chrome into hero ([4e5f52c](https://github.com/thekhegay/ngwr/commit/4e5f52c44a3b2c795fdb60c2d05db1821a524641))
* **showcase:** scroll to top on navigation, restore on back/forward ([73bc52c](https://github.com/thekhegay/ngwr/commit/73bc52c8cd56d2a697357cbf65b210f8fb5538aa))
* **showcase:** see also links on validator pages ([538c1c6](https://github.com/thekhegay/ngwr/commit/538c1c6998e66b5768aab485872d3015f18d8e78))
* **showcase:** split /docs and /components routes; route-data driven sidebar ([9a936ae](https://github.com/thekhegay/ngwr/commit/9a936ae04d501f4c75546333aa8bf5bb1df4a244))
* **showcase:** split /pipes /services /utils /directives as sibling sections with flat sidebars ([162fc92](https://github.com/thekhegay/ngwr/commit/162fc926876934f507bd91bf179d0d9bf9228d66))
* **showcase:** split charts into per-chart pages with sidebar group ([1bc7ede](https://github.com/thekhegay/ngwr/commit/1bc7ede739372bb4651e94a4b03d374e39e3eed7))
* **showcase:** split directives into 9 per-directive pages ([8acd668](https://github.com/thekhegay/ngwr/commit/8acd66841df4686df60a8533a98a5efbb3ac2654))
* **showcase:** split pipe examples, playgrounds, date named keys ([29810bf](https://github.com/thekhegay/ngwr/commit/29810bf110724e3a0cebdfb6797b6e0c207c16d5))
* **showcase:** theme toggle button in header + retune dark border ([bde9871](https://github.com/thekhegay/ngwr/commit/bde98711225e856fbd3f70979ecd1a4188765585))
* **showcase:** top-level types section with common, theme, catalog ([dc4873b](https://github.com/thekhegay/ngwr/commit/dc4873bae7095675d483c4f2d4ae72545d0e324c))
* **showcase:** translate top-nav pill ([6d08619](https://github.com/thekhegay/ngwr/commit/6d08619e9abd3314d3872276eaf07a2e1d10e27c))
* **showcase:** typography section with paragraphs, lists, links pages ([bb470f1](https://github.com/thekhegay/ngwr/commit/bb470f16f9a856210a92146b2b33e5da4822e7d0))
* **showcase:** typography top-nav pill + full variant coverage ([2943fb5](https://github.com/thekhegay/ngwr/commit/2943fb54b01d98002e1c6db3a56f902e43e0345c))
* **showcase:** vendor radix icons + restore /icons/radix route ([db6fbb4](https://github.com/thekhegay/ngwr/commit/db6fbb4061db7d35029d4c6afc7c7357118934da))
* **showcase:** window manager.open, taskbar, snap, persist, workspace docs ([252da28](https://github.com/thekhegay/ngwr/commit/252da28bd3f4fe2ad6ea335d73eadb12c7703760))
* **sidebar:** add data-driven <wr-sidebar> with router auto-expand ([5144785](https://github.com/thekhegay/ngwr/commit/514478577db17233946995ef24879433902ec48a))
* **slider,input-otp:** add new form components with docs ([7aaddc1](https://github.com/thekhegay/ngwr/commit/7aaddc1f32d66aa398403e5a16006fd5196c5c9a))
* small fixes ([#336](https://github.com/thekhegay/ngwr/issues/336)) ([3cf4bf2](https://github.com/thekhegay/ngwr/commit/3cf4bf2e84da15d92e12d0f4494e32ebd4240bae))
* **splash-cursor:** contained mode, keep gl context across reboots, boxed demo with color ([a1b9ce4](https://github.com/thekhegay/ngwr/commit/a1b9ce4cac586d4e00aa6f9573cec089dccf76d3))
* **splash-cursor:** webgl fluid cursor overlay (reactbits port) ([6e65512](https://github.com/thekhegay/ngwr/commit/6e6551206b1cccc309c73cdd4d206f8ba17dedbb))
* **split-text:** port reactbits SplitText as wr-split-text (GSAP-free, WAAPI + IntersectionObserver) ([cd391fa](https://github.com/thekhegay/ngwr/commit/cd391fa5e08b6d2a53330d8b148726757c639eeb))
* **spotlight-card:** port reactbits SpotlightCard as wr-spotlight-card ([cfccd37](https://github.com/thekhegay/ngwr/commit/cfccd376ec4bb8afe6c3715eefef95a5a63fe5db))
* **spotlight-card:** radius input ([96f71b9](https://github.com/thekhegay/ngwr/commit/96f71b92deee1f79c65f4ee8625c273569cf05d8))
* **squircle:** add <wr-squircle> + [wrSquircle] (figma-style smooth corners) ([2523464](https://github.com/thekhegay/ngwr/commit/2523464d9f9fe7874838c8092ae0c65801604de9))
* **squircle:** add corners mask; button-group squircle clips only outer corners of first/last children ([b89df98](https://github.com/thekhegay/ngwr/commit/b89df985a9c6909f20bcffafff3b175de0536bcf))
* **star-border:** comet border rays (reactbits port) with hover mode + single/mirror rays ([a410e59](https://github.com/thekhegay/ngwr/commit/a410e597c0e0d1a62481c870b2c829c1d5d28214))
* **statistic:** wr-statistic-countdown sibling component with format tokens ([a6f405f](https://github.com/thekhegay/ngwr/commit/a6f405f3453dfb410243ef06bcbf1da041ce2719))
* **stepper:** add WrStepperComponent with horizontal / vertical / linear modes ([68b7751](https://github.com/thekhegay/ngwr/commit/68b77513eacd3c1a347b650a716e36cbe435f46c))
* **storage:** WrStorage service with swappable engine (token), prefix, TTL, watch() signal ([6cde2d1](https://github.com/thekhegay/ngwr/commit/6cde2d11474994101cc79a6823eefa3006272066))
* **styles:** add typography + animation utility classes ([ec8dd52](https://github.com/thekhegay/ngwr/commit/ec8dd5286be80cdd32e5678d6c68273ea8e8bd4d))
* **svc:** wrmark pipe + ngwr/clipboard + ngwr/cookie services ([a8983c4](https://github.com/thekhegay/ngwr/commit/a8983c4ffedc1d4c5e2fe9666dc6b44fd5a27779))
* **table:** client-side pagination + consolidate count-up/tag entries ([aea6bae](https://github.com/thekhegay/ngwr/commit/aea6baeae73f7778c05ce1869c36b345a3c749ed))
* **theme:** add typography + motion tokens ([c9c3bfa](https://github.com/thekhegay/ngwr/commit/c9c3bfa24283db013ef63516994b17f4be26ce29))
* **theme:** add WrThemeService with auto/light/dark + [data-theme] overrides ([94e28b7](https://github.com/thekhegay/ngwr/commit/94e28b7eeaad9aba47efde04ae10b510b2affc9f))
* **theme:** elevation and z-index tokens with dark-tuned shadows ([050b0ee](https://github.com/thekhegay/ngwr/commit/050b0ee9bf7a3dbe47cd8ebe75bb357a6547c9ac))
* **theme:** rounder sm radius for controls ([928fc06](https://github.com/thekhegay/ngwr/commit/928fc06059b6a2d911e94e9a6efe93c998daab3d))
* **theme:** smooth-br mixin — opt into native corner-shape: squircle ([7b62572](https://github.com/thekhegay/ngwr/commit/7b62572101644f4996d24840a592fc36ff98a426))
* **toast:** add provideWrToastConfig, progress bar, copy, close-all ([3c946c5](https://github.com/thekhegay/ngwr/commit/3c946c5d5c221d653d3f20900a68c5cb67c5f6a7))
* **toast:** default to Sonner-style stack mode with hover-to-expand ([30a58c1](https://github.com/thekhegay/ngwr/commit/30a58c13ae263fdeff1d74592fc0b66f7c4951e4))
* **tree:** add WrTreeComponent with single / multi selection + keyboard nav ([0410ac6](https://github.com/thekhegay/ngwr/commit/0410ac6725fd7001dd96c4131beb85781cf4b907))
* **typewriter:** port reactbits TextType as wr-typewriter (dep-free typing loop, CSS cursor) ([6d022d5](https://github.com/thekhegay/ngwr/commit/6d022d53d0d52db6881de19e10c6930bc2e04ca8))
* **typography:** add <wr-typography> with display/heading/body variants + docs ([d33fc38](https://github.com/thekhegay/ngwr/commit/d33fc386602fbf28a84b3755d1341492254cec44))
* **typography:** flowbite scale, list and link variants, opt-in tone ([2416c14](https://github.com/thekhegay/ngwr/commit/2416c146892bf8b35ff554e7855b91cdeb9938f8))
* **utils:** add keyboard helpers, focus utilities, debounce / throttle ([2499d33](https://github.com/thekhegay/ngwr/commit/2499d33637b3ca6c552a7eaecdb21549b97e31f0))
* v7 — rebuild on signals, modular SCSS, new components ([#333](https://github.com/thekhegay/ngwr/issues/333)) ([18b1238](https://github.com/thekhegay/ngwr/commit/18b123873fab2de46fcf1f9ee4e50d932bf77521))
* **validators:** bundled wrvalidators (email, luhn, iban, match, onefield, dates) ([6247ec1](https://github.com/thekhegay/ngwr/commit/6247ec1275c8c31623d2c6b735aced64da9c428a))
* **virtual-scroll:** WrVirtualScroll wrapper over cdk-virtual-scroll-viewport ([35239b5](https://github.com/thekhegay/ngwr/commit/35239b51e7d1930085114d25c1af83690dca2e20))
* **viz:** add BarChart + DonutChart ([4914e65](https://github.com/thekhegay/ngwr/commit/4914e6524f146ae8aa21cbfe797816dd4d89802f))
* **viz:** add CalendarHeatmap ([64da55e](https://github.com/thekhegay/ngwr/commit/64da55e72e60b52de0b41a74c2c268b5f3699c18))
* **viz:** add LineChart with axes + hover tooltip ([1582da4](https://github.com/thekhegay/ngwr/commit/1582da474335b1a09144ef42a5d0ef19ee21699b))
* **viz:** add Sparkline + Gauge ([19fa48a](https://github.com/thekhegay/ngwr/commit/19fa48a7dd157ce381cedda893f8edb874fcfb30))
* **waves:** wave-field background (reactbits port), theme-aware; mount in homepage hero ([64f816e](https://github.com/thekhegay/ngwr/commit/64f816eeffd2de4cb1ab6339ab8f98dfea56f18e))
* **window:** [os] (macos/windows/linux) + [size] + wrwindowmanager docs ([e3a5f79](https://github.com/thekhegay/ngwr/commit/e3a5f790e6150b7d0dba808ab76f1b9f1ed78a82))
* **window:** add draggable resizable wr-window with manager service ([334b131](https://github.com/thekhegay/ngwr/commit/334b131f45616367f54568ee6d57cb3a8fa90af9))
* **window:** chromesize compact + animation toggle + reduced-motion ([61fd437](https://github.com/thekhegay/ngwr/commit/61fd437cd11bde5f2ffb66d068812fdb9e5be63c))
* **window:** config types + wrwindowref class ([5ced2be](https://github.com/thekhegay/ngwr/commit/5ced2be8508df9596369602f7968ddce10b161cc))
* **window:** drag-to-edge snap regions ([f8eebf0](https://github.com/thekhegay/ngwr/commit/f8eebf0e90889aca7e6a5f084e50e64bc4ff1f87))
* **window:** manager.open() programmatic api with ref bridges ([3ec0aa9](https://github.com/thekhegay/ngwr/commit/3ec0aa9fb12ebe9798683f84a7aee6f68aa51eee))
* **window:** modal mode with backdrop, focus trap, escape close ([b5de409](https://github.com/thekhegay/ngwr/commit/b5de409b333803a060b38382df881defc75a0e77))
* **window:** os: 'auto' detection + bigger macos dots with reveal-on-hover glyphs ([d8e7a66](https://github.com/thekhegay/ngwr/commit/d8e7a66c5b1069d68ab5ae939fc76c9f5b17c49e))
* **window:** persist geometry via wrstorage ([93c6e79](https://github.com/thekhegay/ngwr/commit/93c6e795a1aea613ed89347ec3ec8173f18ae039))
* **window:** restorelayout opens missing windows via opener callback ([ab6838d](https://github.com/thekhegay/ngwr/commit/ab6838ddc3a54e327ade55166d8aa25e0b6a3ede))
* **window:** savelayout / restorelayout for multi-window workspaces ([40150b9](https://github.com/thekhegay/ngwr/commit/40150b98e8688abffe7af9d8f89cb83d5347909f))
* **window:** title-extra + status-bar slots and draghandle selector ([a2a0a8b](https://github.com/thekhegay/ngwr/commit/a2a0a8bda8116ef8e30939011d63b34834d5c68b))
* **window:** wr-window-taskbar for minimized windows ([e7c3fdc](https://github.com/thekhegay/ngwr/commit/e7c3fdc8d0cb51215191b421eb469773bc307c45))
* wr-form-field, wr-result presets, ngwr/loading-bar, ngx-mask integration guide ([9c25258](https://github.com/thekhegay/ngwr/commit/9c252581d2bd1a89311dfc9dc2affd19b62fc2c3))

### Bug Fixes

* **animations:** theme-aware block animations — border-glow, spotlight, tilt glare, gradient ring ([e473750](https://github.com/thekhegay/ngwr/commit/e473750fff933da6acd9612f9efe1871634df3b7))
* **aurora:** clamp shader brightness floor — alpha fades the ribbon, killing the black halo ([a0c3873](https://github.com/thekhegay/ngwr/commit/a0c38732dd60ea9f45a8b1c559b5953f61617cb0))
* **aurora:** pastel wash on light — brighter stops + canvas opacity, full strength on dark ([b06b4f2](https://github.com/thekhegay/ngwr/commit/b06b4f2db105867cfa8e438b6f23c1f8a29adefd))
* **border-glow:** drop host CSS border to avoid corner subpixel notch ([7700307](https://github.com/thekhegay/ngwr/commit/7700307eaa82f708b2f962f825d40ea9311c5aa6))
* **border-glow:** drop shadow stack, theme mesh palettes, light-mode cone + bloom fixes ([aa00701](https://github.com/thekhegay/ngwr/commit/aa00701c14d5520643a22097f00d18e9a9229474))
* **button-group:** actually wire shape input + DI provider, group always wins ([03ad7ac](https://github.com/thekhegay/ngwr/commit/03ad7ac2b3c5404075b32e81ba2b043aa38f9d04))
* **button-group:** add border-radius fallback + overflow:hidden for squircle ([2d82b01](https://github.com/thekhegay/ngwr/commit/2d82b01d961691bf5083d21faacb7f787b36975e))
* **button-group:** divider between solid colored segments ([3137c0d](https://github.com/thekhegay/ngwr/commit/3137c0dd61ecd2166df331b3faf191b229dae48a))
* **button-group:** inset squircle children 1px so wrapper ring shows ([db18bbf](https://github.com/thekhegay/ngwr/commit/db18bbfd8d086f9f53b4d3a8744dd94b19a17f5a))
* **button-group:** paint squircle ring on wrapper, strip child borders ([7867812](https://github.com/thekhegay/ngwr/commit/7867812f2ab2c304a18e237b631f1c4bd0383df3))
* **button-group:** squircle clips the wrapper, children stay flat segments ([93b1b88](https://github.com/thekhegay/ngwr/commit/93b1b88c4a5dc7f66c415deb4a9c8b0dab63ebe7))
* **button-group:** squircle ring via wrapper bg + 1px padding (no opaque mask) ([26ce887](https://github.com/thekhegay/ngwr/commit/26ce887ca218f776876d282ea0fdd241da25b6d0))
* **button-group:** use computed [class] binding (host class.* didn't apply) ([1e60832](https://github.com/thekhegay/ngwr/commit/1e608327a74f291949cfe8209455fe20a27e600d))
* **button:** always-on squircle ring, drive colour from --wr-btn-border ([13fcd91](https://github.com/thekhegay/ngwr/commit/13fcd91f82fc1ca2f706642c21b10b6f02473efd))
* **button:** only enable squircle clip when shape="squircle" ([3c88b34](https://github.com/thekhegay/ngwr/commit/3c88b34bce7a3268a885932a4fcf3bd06e6a678b))
* **button:** outlined squircle border — pipe button color tokens through squircle vars ([89cd405](https://github.com/thekhegay/ngwr/commit/89cd405dfe5c60d23a9039d2a71ecbd21dc8bd13))
* **button:** outlined squircle paints a real border ring ([2a326f0](https://github.com/thekhegay/ngwr/commit/2a326f03435030469b29b7678c08cf28cffe1a64))
* **button:** outlined squircle ring uses full-opacity text color, not 40% border token ([8f130c2](https://github.com/thekhegay/ngwr/commit/8f130c2a07391963435a7d6a5a1974d0bdc18411))
* **button:** paint outlined squircle ring via squircle directive composite ([865a9d0](https://github.com/thekhegay/ngwr/commit/865a9d05074457f83691ec6a2390fdba39b29c2b))
* **calendar:** year and month navigation reverted to selected date ([c15f054](https://github.com/thekhegay/ngwr/commit/c15f054222e739aaaaae4c98d8104cf2fdf27f44))
* **circular-text:** drive rotation via WAAPI to preserve angle on hover speed changes ([f0cb922](https://github.com/thekhegay/ngwr/commit/f0cb922e7c91fcbb875fb32a63e1f1c09d158275))
* **circular-text:** proper orbit radius via transform-origin; tighter scramble-text demo radius ([25d8593](https://github.com/thekhegay/ngwr/commit/25d85930cbab3bca58bf25e49b1e33e5aa3e70a4))
* **color-picker:** swatch hairline tracks theme instead of fixed black ([6c4a243](https://github.com/thekhegay/ngwr/commit/6c4a2438d577028e94e5a211852b804c6263eb99))
* **context-menu:** 200ms guard catches the auxclick that closed on open ([fe774f9](https://github.com/thekhegay/ngwr/commit/fe774f9a0c0028cc0b8c5881d77c2a08eb78c7fe))
* **context-menu:** cascade-close descendant submenus on parent dispose ([dcfe798](https://github.com/thekhegay/ngwr/commit/dcfe798e6cc3a07da84eaa495264e2c9d8d53526))
* **context-menu:** chain-aware hover-out close ([0ad4c8c](https://github.com/thekhegay/ngwr/commit/0ad4c8c20643293ac8e99fa429f94b0b81c17080))
* **context-menu:** dispose submenu panes on root close ([bc28d3d](https://github.com/thekhegay/ngwr/commit/bc28d3daa6b090de15b9089939693ee9e7088e58))
* **context-menu:** noop scroll strategy — keep menu open on scroll ([ed2fc25](https://github.com/thekhegay/ngwr/commit/ed2fc2599f5da6bf1ba783a27ad030c7caeb0873))
* **context-menu:** parent submenu stays open when cursor enters child submenu ([8deac4e](https://github.com/thekhegay/ngwr/commit/8deac4eb3b26ca20a0516488e05f29462f75483a))
* **context-menu:** pin overlay pane to viewport so it stays on scroll ([e81e639](https://github.com/thekhegay/ngwr/commit/e81e639c79d4b55b59c5dd43aa0153490cdde0fd))
* **context-menu:** use !important to beat cdk inline position: static ([2255d9b](https://github.com/thekhegay/ngwr/commit/2255d9b44bc69eca15aa2c0b8306ad62fa8308a3))
* **context-menu:** write top/left directly to pane — bypass cdk margin math ([94273dc](https://github.com/thekhegay/ngwr/commit/94273dc79eaabbd171da9e5a6fe3dc4f64cdfe3b))
* counter odometer wrap, context-menu open, tree autofocus, tooltip arrow+speed, toast close-all blink + list-mode demo ([84f4712](https://github.com/thekhegay/ngwr/commit/84f4712b37e99e2f017029f642bd671f939806d8))
* **date-picker:** time panel chrome and lucide stepper chevrons ([937bebd](https://github.com/thekhegay/ngwr/commit/937bebd5cfaec98ba2b9c414ad488ecbbfee2a73))
* **directives:** autosize tracks model writes, autofocus demo focuses directly ([2ad6efd](https://github.com/thekhegay/ngwr/commit/2ad6efdc2cd0db6ca04d21c1e4cd133a4d2c55f3))
* **doc-code:** keep last highlighted html during async re-render (no more flicker on live snippets) ([7417eac](https://github.com/thekhegay/ngwr/commit/7417eace0e34c9c564c6a79a5269927c8a358040))
* **doc-code:** style Shiki <pre> via ::ng-deep (innerHTML-rendered, not encapsulated) ([b2cd909](https://github.com/thekhegay/ngwr/commit/b2cd909035ce1ae98caa3f9d2aab4aec01cd4a4c))
* **doc-code:** switch shiki to github-dark palette in dark mode ([348772b](https://github.com/thekhegay/ngwr/commit/348772b5895f383ec72d8b4634a621aea55d6d90))
* **drag-drop:** preview tracks cursor and hugs the row shape ([d628509](https://github.com/thekhegay/ngwr/commit/d628509766877596c73ee9af41063305569be5ea))
* **eslint:** exempt index.html from prefer-self-closing-tags ([aa21080](https://github.com/thekhegay/ngwr/commit/aa21080bab8e2d7453fed70c4e30d2df64980e69))
* **falling-text:** rename template ref to avoid shadowing the words() signal ([fe2562d](https://github.com/thekhegay/ngwr/commit/fe2562dee88d980a464ac519e2647c7c96c03567))
* **footer:** bind .ngwr-footer to host so border + bg span full width ([a4b97e8](https://github.com/thekhegay/ngwr/commit/a4b97e80164dc02ec08c838777ad380e2f15630f))
* **footer:** full-width content (drop max-width, match header gutter) ([5fe92af](https://github.com/thekhegay/ngwr/commit/5fe92af9295dbb13f050e0c0039e63cb731dda66))
* **footer:** padding lives on __top/__bottom rows, not __inner wrapper ([8fc9504](https://github.com/thekhegay/ngwr/commit/8fc950498cb4c6178202974a75b724c4a1e34e8b))
* **form:** smaller hint text under controls ([baf244d](https://github.com/thekhegay/ngwr/commit/baf244d02048d9ca513502e41bb46ce4afb565e4))
* **header:** active state gray; add gap between nav links ([c98bd08](https://github.com/thekhegay/ngwr/commit/c98bd08de0b786d922528dd8e4c54a1abdcfe8d7))
* **header:** wider nav gap; lighter active pill + medium-tone text ([de0fb56](https://github.com/thekhegay/ngwr/commit/de0fb56837bb283b13b94f4ce854eed66cde8ffa))
* **home:** cycling stylish/accessible/themeable; nowrap icon+angular; flat applications accent ([11310d0](https://github.com/thekhegay/ngwr/commit/11310d0d8eac0c1bd437b2e7f5561fe21eb0213a))
* **home:** drop applications color, swap cycling to stylish/modern/snappy so they fit on line 1 ([0f9b61a](https://github.com/thekhegay/ngwr/commit/0f9b61a12be687716246b7b728f1e530072e0120))
* **home:** motion gallery — aligned head, stagger units bug, theme-aware shiny/glitch, 4 new tiles ([0f42add](https://github.com/thekhegay/ngwr/commit/0f42add860093594010f3a73e3420d61e8762ed0))
* **home:** split-text baseline align; drop gradient tile from motion gallery ([a1c2809](https://github.com/thekhegay/ngwr/commit/a1c2809cb2edd6cb2d08b589facb85adcf60f2b2))
* **home:** swap rotating-text for wr-typewriter (no clipping, cycles words) ([7422a45](https://github.com/thekhegay/ngwr/commit/7422a4584fd0a52d5e7a01df11cd327e591340ca))
* **home:** swap typewriter for wr-split-text on the 'stylish' word ([309b2bd](https://github.com/thekhegay/ngwr/commit/309b2bdf9db55684bd52285278931bc9352ffdd4))
* **home:** team avatar stack — bigger circles, breathable overlap ([0a80783](https://github.com/thekhegay/ngwr/commit/0a80783048bb62d5657310428a0cac1431f45c64))
* **home:** team tile — size avatars, color initials, fix +n chip ([52a84a4](https://github.com/thekhegay/ngwr/commit/52a84a454bd9cf4ecf5e6606b1d412e9c4aa2f16))
* **i18n:** static loader misclassified flat catalogs with all-object values as scope maps ([ea6dbdb](https://github.com/thekhegay/ngwr/commit/ea6dbdb7f57adc8054a1ba87ec192a8d08108eec))
* **icon:** merge root + element-level wr_icons multi-providers ([f758933](https://github.com/thekhegay/ngwr/commit/f7589339055ec107eedf40f7492d2c53aa6b643c))
* image-cropper infinite effect loop, gauge largeArc, heatmap grid layout ([757e25a](https://github.com/thekhegay/ngwr/commit/757e25abf0bdf00f928ebc418bdc917780ee18fd))
* **image-cropper:** fall back to display size when natural dimensions are 0 (SVGs) ([55b4d3f](https://github.com/thekhegay/ngwr/commit/55b4d3fac390a181183dd1ed5a927c5d8b0d70c1))
* **input-number:** bump stepper selector specificity so click overrides land ([e71493c](https://github.com/thekhegay/ngwr/commit/e71493c19213311b8c022e8d94ac069455fcd2ca))
* **input-number:** make stepper dividers follow input-group focus border ([7aded5e](https://github.com/thekhegay/ngwr/commit/7aded5e796754cc07969f4546d67fe92c7472b1c))
* **input:** let button affixes receive clicks so picker triggers fire ([ebe9b17](https://github.com/thekhegay/ngwr/commit/ebe9b171686e12b547a2f9d943e74f0924604403))
* **layout:** footer outside main grid → border spans full viewport; match sidebar color ([1318db3](https://github.com/thekhegay/ngwr/commit/1318db376faa9d8b70ced851bc6d8f2ef66aac71))
* **layout:** revert footer to content column — sidebar runs full height again ([20ca9fd](https://github.com/thekhegay/ngwr/commit/20ca9fdac66cf59a9e0f0acaeb4571040858375e))
* **layout:** sidebar divider via grid pseudo-element so it reaches the footer ([682fe8e](https://github.com/thekhegay/ngwr/commit/682fe8eb9789a1440095def54b1b91b31730e688))
* **lib:** bugs sweep — toolbar/page-header fill, splitter handle, sidebar default icons ([b4db02a](https://github.com/thekhegay/ngwr/commit/b4db02a87ec8a62e5048a16f0b46066768b17724))
* **lib:** drop deprecated allowsignalwrites option from effect calls ([92e1f0d](https://github.com/thekhegay/ngwr/commit/92e1f0d0a20ac344300a780dfcf75e4063dfa9be))
* **lib:** wide components claim the full demo row ([8aaaa08](https://github.com/thekhegay/ngwr/commit/8aaaa08898189207c6ebcea8d688bbdc08e7c018))
* **lightbox:** attach viewer template, not the thumb branch ([5e7ea30](https://github.com/thekhegay/ngwr/commit/5e7ea3034efcfaff64cde4077ad458f5a321e590))
* **lint:** migrate hostlistener to host metadata, drop template ! casts ([2a256ba](https://github.com/thekhegay/ngwr/commit/2a256ba6ad575f5d3fb03bb0dfdd97e0fbbae6cd))
* **logo-loop:** drop prefers-color-scheme override; switch showcase demo to inline ngwr/icon templates ([31c180b](https://github.com/thekhegay/ngwr/commit/31c180bce3207f3f7720fd1a02e94e895a6f67b4))
* **pagination:** square cells at every size, default sm ([db45903](https://github.com/thekhegay/ngwr/commit/db45903c68c43eec286ca2f18c0fee4879b7cdbc))
* **popconfirm:** portal panel component, not the directive class ([aa8ec8c](https://github.com/thekhegay/ngwr/commit/aa8ec8c4931a635f503d7489a316663c76bde595))
* **popover:** keep hover panel open while pointer is over it ([43dbd21](https://github.com/thekhegay/ngwr/commit/43dbd2190c621f14c012e2bc4157a48f3078c5b6))
* punch-list bug batch — chevrons, alert close, compare, ctx menu, odometer, descriptions, footer ([a7c886f](https://github.com/thekhegay/ngwr/commit/a7c886f33fbb54c5eacd2aa235d0e45de41aa3ad))
* **select:** keep context multi signal after dropping the input alias ([d5715ac](https://github.com/thekhegay/ngwr/commit/d5715ac30c846dfd5ed541af79513702de58df8e))
* **select:** resolve trigger label from value + options (was blank for preset values via [(ngModel)]) ([022339f](https://github.com/thekhegay/ngwr/commit/022339f4dc1bd7566fcbbfaedfb89948f53ed1cb))
* **showcase:** alignment demo spans the full demo block ([74c942c](https://github.com/thekhegay/ngwr/commit/74c942cb17f1927d07787fcccba1ecc27ccfd28a))
* **showcase:** aurora demo without dark backdrop ([4916c4e](https://github.com/thekhegay/ngwr/commit/4916c4e593e2f08a6ebdaa363f58d917415c62ee))
* **showcase:** autofocus and autosize demos use ngwr controls ([a6cc5de](https://github.com/thekhegay/ngwr/commit/a6cc5de0eb713d34b8ffb86346f3c9c30b0a78de))
* **showcase:** back-top default icon + sidebar icons (home/folder/cog) registered ([7c604de](https://github.com/thekhegay/ngwr/commit/7c604dee41ca1be8b789c39942ae0b71e0a5c884))
* **showcase:** bento hero — bump to 100vh min-height ([6146916](https://github.com/thekhegay/ngwr/commit/61469166ea07f01e265e3e59a67b08bbcfab3a50))
* **showcase:** bento hero — theme-aware tile shells for light + dark ([0ddcb42](https://github.com/thekhegay/ngwr/commit/0ddcb424369c7981af4aec350d1b242a095d1490))
* **showcase:** bento polish and looping motion gallery ([3ae09e2](https://github.com/thekhegay/ngwr/commit/3ae09e25a6676c09c4a861c4177fc568b4877758))
* **showcase:** bigger icon grid glyphs ([4947e9c](https://github.com/thekhegay/ngwr/commit/4947e9c2861a9c6cfcd536180bfe5d88da1c072b))
* **showcase:** bigger reveal demo box ([2194fd6](https://github.com/thekhegay/ngwr/commit/2194fd69bd0688632c8836a571a01b264a3bde21))
* **showcase:** confetti playground uses wr buttons ([196a889](https://github.com/thekhegay/ngwr/commit/196a889fdb5978a6d022a2515e2278f98350d716))
* **showcase:** demo polish — wr-btn, sticky anchor, full carousel, fill empty/result, chart snippets ([e6b9fb3](https://github.com/thekhegay/ngwr/commit/e6b9fb3f86520b5facecd50e821a3decbb078dd6))
* **showcase:** doc links, back-top runway, qr icon demo ([5c56996](https://github.com/thekhegay/ngwr/commit/5c569969acca6f89105e90d58bf57e2c8ab297ea))
* **showcase:** drag-drop + storage demos use theme tokens for dark mode ([841f15d](https://github.com/thekhegay/ngwr/commit/841f15dc4d019e2ee49acbd80858db99e2e08efe))
* **showcase:** drop unused switch + forms imports from splash-cursor page ([8fd52b6](https://github.com/thekhegay/ngwr/commit/8fd52b6006c3efb81314db52c49b85c388017d54))
* **showcase:** header brand icon dark-mode colors via host-context ([df72050](https://github.com/thekhegay/ngwr/commit/df720505b629608accb265a612a8fad908c98e43))
* **showcase:** map all sections to title categories ([3bbd7b3](https://github.com/thekhegay/ngwr/commit/3bbd7b3fe1c33c012b1f7145104452a01702db3c))
* **showcase:** prefill aurora stop pickers with resolved theme colors ([498655e](https://github.com/thekhegay/ngwr/commit/498655e1e1036837f541e6d75f9297715e8e2155))
* **showcase:** real skeletons in bento and drop dead styles ([29b7b5e](https://github.com/thekhegay/ngwr/commit/29b7b5e23e0eacf0830924135b8b4f796d37d728))
* **showcase:** register document/trash/cog icons on context-menu page ([5671440](https://github.com/thekhegay/ngwr/commit/5671440bc5165d6a63a291fd0bbdb2d0238fd31d))
* **showcase:** scroll box demo, theme segmented, hotkey kbd, autofocus retrigger, bigger icon grid ([677eb9c](https://github.com/thekhegay/ngwr/commit/677eb9c09cc99a87c8ea0edcabc0aa360a203a46))
* **showcase:** scroll-runway for anchor/back-top, taller speed-dial demo ([52a72e6](https://github.com/thekhegay/ngwr/commit/52a72e6dbef814d665cdf7567ba2978f9d77e652))
* **showcase:** see also chips render, bigger title, no hover jitter ([cd6c669](https://github.com/thekhegay/ngwr/commit/cd6c669890b6d9c9b253071aec9828aa5ce0442e))
* **showcase:** tilt card paragraph readable in light mode ([a747bb7](https://github.com/thekhegay/ngwr/commit/a747bb7038a346a12a82317b7a79edc5e61cb877))
* **showcase:** wire Motion sidebar entry ([87beeee](https://github.com/thekhegay/ngwr/commit/87beeeeb5b08b0f77649ab636e369257e368750a))
* **skeleton:** visible placeholder tint in both themes ([7034860](https://github.com/thekhegay/ngwr/commit/7034860d4ca0856a5e4176c9f0998b4d79ee2128))
* **slider:** stretch host to full width by default ([e9b6f33](https://github.com/thekhegay/ngwr/commit/e9b6f3386a1f80d8a27cf9da1d16653eee645044))
* **split-text:** keep descenders inside the overflow mask ([4cc3fab](https://github.com/thekhegay/ngwr/commit/4cc3fabf1d8c22b3bfc8d711c469bf21c26818e8))
* **star-border:** hide idle hover rays (paused keyframe pinned opacity); wider light-mode comet ([ec149ed](https://github.com/thekhegay/ngwr/commit/ec149ed88ac7c2586f5487c71bb0c8c2d9a5f0e6))
* **statistic:** keep literal words intact in countdown format ([7fc8407](https://github.com/thekhegay/ngwr/commit/7fc8407d8cb02c194e04a58c542135ee6de4eb43))
* **styles:** drop forwards for removed image + tag entries; add lightbox ([1be8f81](https://github.com/thekhegay/ngwr/commit/1be8f8124a31b291b363580d67e79d4a43cf0da7))
* tabs scrollbar, progress flex, toast list mode, statistic format, odometer snap ([ebb1595](https://github.com/thekhegay/ngwr/commit/ebb15956370c0671bbdba4849a12ea0c3df6a251))
* **tabs:** active indicator sits on the strip hairline ([05aed09](https://github.com/thekhegay/ngwr/commit/05aed09c8a4cefe628bc140ad661cd8cd6afb240))
* **theme:** align css var fallbacks with light palette defaults ([3cc701d](https://github.com/thekhegay/ngwr/commit/3cc701dcd31bd8084e1310f276982bfd79c21029))
* **theme:** backdrops use --wr-color-backdrop-rgb (always black, theme-stable) ([0bae703](https://github.com/thekhegay/ngwr/commit/0bae703f045c7fc65e32e18dc22d2559fe640b4c))
* **theme:** force corner-shape: round on pill variants (button/input/select) ([0254360](https://github.com/thekhegay/ngwr/commit/02543603a19f40e6cab5a654e822c8477b097313))
* **theme:** lift dark mode border contrast to ~3.5:1 (was ~1.4:1) ([50828d6](https://github.com/thekhegay/ngwr/commit/50828d6d7d75c3a680346fef9b6775eac99e3b31))
* **theme:** override --wr-color-{dark,white}-contrast for dark mode ([f549517](https://github.com/thekhegay/ngwr/commit/f549517d0d775cc4a40cca2b940abdaff7740273))
* **theme:** pair light color with readable contrast in dark mode ([38e962e](https://github.com/thekhegay/ngwr/commit/38e962e19f7bad6a8fce50442d50495447965bed))
* **theme:** pick text-on-color contrast via YIQ luminosity, not HSL lightness ([1052905](https://github.com/thekhegay/ngwr/commit/1052905de55d0604eb3a7c6917818e20d6e0a636))
* **theme:** shadows use backdrop-rgb so they stay dark across themes ([99eba0a](https://github.com/thekhegay/ngwr/commit/99eba0a783ffa7abc7924f5ad4eae12a7f63c604))
* **theme:** skeleton default + speed-dial border + mention demo readable in dark mode ([80ab40b](https://github.com/thekhegay/ngwr/commit/80ab40bb6e1be81e2932a3b28ae41f12c78619d7))
* **theme:** subtler header border + visible github/npm icons in dark mode ([5b15aed](https://github.com/thekhegay/ngwr/commit/5b15aed21a3b31f2b3ffc0354c9af4419ed874fb))
* **timeline:** align dot with time line, add api tables ([b66ef91](https://github.com/thekhegay/ngwr/commit/b66ef910e0f30d69e56df999613c8c8ea95a7789))
* **toast:** close-all full bleed + debounce mouseleave collapse ([13a8553](https://github.com/thekhegay/ngwr/commit/13a85538e362c8b58400154e25065d50df71ef51))
* **toast:** stop overlay wrapper from blocking page clicks ([21bd0e9](https://github.com/thekhegay/ngwr/commit/21bd0e9b6e643fbd64923db369004212e299065f))
* **typography:** list variant owns its padding ([73f886d](https://github.com/thekhegay/ngwr/commit/73f886d8a39d1fa414f909724ab8c013f30badf3))
* **window:** allow signal writes in container sync effects ([272c5a0](https://github.com/thekhegay/ngwr/commit/272c5a0d60e565929e8199762ae8a078ddb70118))
* **window:** container honors os: auto default ([bde46e8](https://github.com/thekhegay/ngwr/commit/bde46e8c20ac99400f116727dc6e4626d9f2c95d))
* **window:** drop modal, fix drag lag, snap hint, hide minimized, restore layout ([53fef3c](https://github.com/thekhegay/ngwr/commit/53fef3c62115b07d168e784023f110a2fe6b4ff9))
* **window:** restored minimized state lands in taskbar ([d5e8f4c](https://github.com/thekhegay/ngwr/commit/d5e8f4cef5c753c2ca2ac9d36cee388535d79f66))
* **window:** singleton by id, manager.findbyid() ([d50e224](https://github.com/thekhegay/ngwr/commit/d50e22453ac86c16210ade0089aef29d07ad05b8))

### Reverts

* **showcase:** drop locale switcher + translated nav labels from header ([e038ff4](https://github.com/thekhegay/ngwr/commit/e038ff4fe504b8ba5ccb005c83b080391ba07eb9))

### Code Refactoring

* **input-number:** rename from number-input + fix stepper clicks ([4ca311c](https://github.com/thekhegay/ngwr/commit/4ca311c87ffc36b836b1b0478ca008a6a7263b74))

## 6.1.1 (2025-11-16)

## 6.1.0 (2025-11-16)

### Bug Fixes

* **ci:** fix typo ([dccfd6e](https://github.com/thekhegay/ngwr/commit/dccfd6e0d3dfd65418b838cfdb7759b00ae042ba))

## 6.0.0 (2025-02-07)

## 5.0.3 (2025-01-24)

## 5.0.2 (2025-01-24)

## 5.0.1 (2025-01-14)

## 5.0.0 (2025-01-14)

## 4.3.0 (2025-01-14)

## 4.2.3 (2024-11-10)

## 4.2.2 (2024-08-20)

### Bug Fixes

* **input:** handle inputValue change ([3b2f6b8](https://github.com/thekhegay/ngwr/commit/3b2f6b8c1b38daa15ef2a2dbc39315f511508bf9))

## 4.2.1 (2024-08-09)

## 4.2.0 (2024-07-25)

### Features

* **icon:** add banks of Kazakhstan icons ([7e7fb06](https://github.com/thekhegay/ngwr/commit/7e7fb06321039aae9fced1e57a0b4d99ee8328d0))
* **icon:** add Yandex.Cloud & Yandex.Tracker ([aecce43](https://github.com/thekhegay/ngwr/commit/aecce43c315d208678d231eb2885105618819f35))
* **icon:** add messengers logos: Discord, Telegram, Whatsapp ([5fceb2d](https://github.com/thekhegay/ngwr/commit/5fceb2db7a06bcf579f27f2662c21d8f7e78b955))
* **icon:** add Chrome ([d8d942d](https://github.com/thekhegay/ngwr/commit/d8d942d8e5605a6d3ae6022ef2d6a04c28703d9f))
* **icon:** add Gitlab logo ([301e328](https://github.com/thekhegay/ngwr/commit/301e328ac214ce03e378a0847869a362b4d801b8))
* **icon:** add social networks: Instagram, VK ([dd8168d](https://github.com/thekhegay/ngwr/commit/dd8168dfc22c7adaef089c3931de860ac933b5b8))

## 4.1.0 (2024-07-22)

## 4.0.1 (2024-07-22)

### Bug Fixes

* **input:** comment ngOnInit ([fa315df](https://github.com/thekhegay/ngwr/commit/fa315df8fba25d09cad85316909f532036872fa3))

## 4.0.0 (2024-07-09)
