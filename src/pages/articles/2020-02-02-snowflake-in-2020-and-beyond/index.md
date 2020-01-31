---
title: Snowflake in 2020 and Beyond
date: 2020-02-02
categories: 
  - progress_report
  - update
  - technical
  - recap
path: blog/snowflake-in-2020-and-beyond-2020-02-02
layout: post
---

I’ve been working on Snowflake on and off for the [past six years](https://github.com/SnowflakePowered/snowflake/commit/d640ac2220d20f8ebec53eac189527dc998846b7). It’s been a bit of a never-ending journey, but there’s always something new to do so it always seems fresh; although I’m pretty sure I’ve rewritten (at least partially) every subsystem at least twice by now. 

This is a rather long blog post that will probably end up serving as my update for the year, and goes into reasonable detail every feature that I've worked on with Snowflake since the last blog post. I've tried to keep it reasonably understandable as always, but will delve quite deeply into some technical aspects from time to time.

However, since my last blog post was about a year ago, I'll recap with a short explanation of what Snowflake is, and my goals with the project, before jumping into the progress I've made in the past year. If you're already familiar with what Snowflake is, feel free to scroll down past to the first heading ("New Filesystem API").

Snowflake is not an emulator frontend *per se*, but is a framework and library for creating frontends, that pushes the boundaries of what is possible with traditional wrapping frontends that end with calling an executable with command line arguments; as opposed to API-based frontends like RetroArch. However unlike most other frontends that rely on command line arguments, Snowflake goes further with what is possible with a completely black-box approach: rather than adapt the emulator to the frontend as RetroArch does, how can we adapt the frontend to the emulator (and do it *for every emulator*)?

Borrowing a term from DevOps, Snowflake's main feature is the *orchestration* of emulators. Launching a game should be seamless and automatic, and configuration and input options should be configurable within the frontend UI, and without needing to do it for each and every emulator yourself. In other words, a user should never have to see an emulator's own configuration window; everything from per-game settings to input should be tweakable within the frontend's UI.

Furthermore, Snowflake also provides an end-to-end solution with regards to library and file management, handling scraping through a tree-based, best-fit, smart keyword scraping system that is also content-aware, meaning that it tries to glean as much information as possible from the ROM itself, such as internal names, and serial numbers. Hashing is also used, but becomes impractical when game sizes get bigger, and compressed formats such as cISOs or CHDs change the checksum of an untouched dump. ROMs that consist of multiple files, or those that need unpacking or external resources to run are also carefully considered; the traditional examples are multi-track BIN/CUE dumps, but support for examples like RPCS3, where PKGs have to be "installed" before being able to be played, is becoming increasingly relevant. 

Snowflake is also extremely modular and extendable. A large amount of work has gone into tooling that backs the robust plugin system from which Snowflake is built upon. All this is possible by using plugins that handle the idiosyncrasies of each emulator and game console, and the tooling behind it makes it easy to install and develop plugins. Documentation is provided for every public API that Snowflake exposes, and rather than tie in these features to a single UI, Snowflake uses GraphQL to expose features to UX developers that can use it to built anything from a purely command-line text frontend, to a fully featured 10-foot UI, all with the same features. At least, that is the goal.

If all that sounds enticing, well, it has been my dream for the past six years to bring this to reality, and along the way I've made a lot of progress towards this dream. Unfortunately, it's taken a lot longer than I expected, but nevertheless I'm committed to eventually bringing everything I've written about here to fruition. With that out of the way, let's look at some of the things I've been working on for the past year.

# New Filesystem API (Introduced in [PR #291](https://github.com/SnowflakePowered/snowflake/pull/291))

I did actually briefly discuss this in the context of library management last year, but since it is core to the next feature I discuss (the [installation](#installation) API), I'll go into some more detail of what this actually is.

Snowflake makes heavy usage of attaching metadata to individual files by way of unique IDs. Originally this would be very flaky, since unique IDs were assigned based on the full path to the file: once a file moved, all the associated metadata would be inaccessible. This is bad, because Snowflake groups files together by game, and metadata is used to tell save files apart from images, apart from ROM files, etc. The solution for this was to control how files could be moved by **virtualizing the filesystem**. 

Similar in concept to Higan's game folders, everything relating to a game is collected under its own folder, which also contains a small manifest that keeps track of unique IDs for files within that folder. Then, file manipulation is done via an object-oriented API that ensures that unique IDs remain consistent throughout moves and copies. Symbolic link-like objects are also allowed, so metadata can be attached to a file without needing to make a copy of the original file. If a linked file is moved and the link is broken, it can be repaired without losing track of its metadata. 

Paths are also virtualized to be local to a context, such as a game; the raw path is only accessed at the endpoints when needed. This means that instead of manipulating paths like `C:\Users\chyyran\Application Data\Local\Snowflake\games\GAMEID\program\MyGame.ROM`, or `/home/chyyran/.local/share/Snowflake/games/GAMEID/program/MyGame.ROM`, all Snowflake sees is `game:/program/MyGame.ROM`: this is transformed to the full path as late as possible. This turns out to be very useful when generating configuration files, as we will see later on.

This isn't a perfect solution, as users can still mess with the virtualized file system that Snowflake creates outside of the object-oriented API and break metadata associations that way. However, to fix that would err on the side of user-hostility and wouldn't be easily maintainable cross platform. 

## Installation API ([PR #339](https://github.com/SnowflakePowered/snowflake/pull/339))

Why go through all this trouble anyways when raw file paths have worked fine for everyone else? That has to do with the Filesystem API being one of the building blocks of the Installation API (or fully the *Asynchronous Installation Pipelines API*).

Essentially the Installation API allows plugin authors to *describe* how a certain ROM, or certain type of ROM is supposed to be copied, extracted, unpacked, or otherwise installed through the use of **Installers** and **Tasks**. *Installers* describe the sequence of *Tasks* to do when given some files, and return a sequence of *Files* within the virtualized filesystem that represent the completed result. *Tasks* do the core of the IO logic, and use the Filesytem API to do what they do. Think of installers as recipes for how to install a game, and tasks, the steps. The [most basic recipe](https://github.com/SnowflakePowered/snowflake/blob/master/src/Snowflake.Plugin.Installation.BasicInstallers/SingleFileCopyInstaller.cs) is just to copy a ROM from its source to a game's folder. 

Since not all recipes work for all games, an installer can be asked to give a list of what it can work with for a given game console when given a directory or a list of files, before any installation happens.

The technical details are rather interesting and use the new asynchronous streams API in C# that allow for a sequence of asynchronous actions to be yielded (important, since file IO can be slow). The general design of the API was inspired by `do` notation and the `IO` monad in Haskell, but for those that are interested, see the GitHub PR at the header. 

The Installation API is how Snowflake handles multi-file games. One can easily envision an installer that unpacks PKG files for RPCS3, or WUDs for Cemu. Installers can also potentially act as content providers for ROMs, downloading custom texture packs or other resources.

# Syntax-tree based Configuration Serialization API ([PR #376](https://github.com/SnowflakePowered/snowflake/pull/376))

Snowflake orchestrates emulators by generating configuration files that mimick the ones created by the emulators themselves. A template of a configuration file is defined in code, and Snowflake converts that template into a string representation that the emulator understands. This was first achieved using cumbersome string templates that were little more than search and replace. Because it was so cumbersome and prone to break, this was replaced with line-based serializers, which used some more logic to get rid of the search and replace, and generate the configuration file based on a string template that was supposed to fit how a line looked.

There were still some problems with this method. Because the serializer was line based, anything with structure would not be able to be represented. With newer emulators using XML and JSON configurations, the old system simply could not synthesize these types of files without hacky workarounds. While I had intended it to be general, it ended up being too tied into an INI or CFG style of configuration. Also, the old API was too tied into the object model of how Snowflake represented emulator configuration files. I wanted to be able to take an immutable (unchanging) "snapshot" of the current state of the object representation and serialize the snapshot, instead of directly accessing the configuration object (and potentially changing something during the serialization step).

Syntax-tree based serializers are the ultimate solution to this. Different configuration options are organized into *sections*, and many sections are organized into *collections*. The relationship between each section in a collection is defined by a *target*, and each target may have a parent target. Targets form a directed acyclic graph that represent the structure of the configuration file. 

Right before serialization, the graph created by the targets is traversed, and a **syntax tree** is created from the values of the configuration collection. Enum values are also *reified* during this traversal, which means that enums are turned into their proper string representation within the syntax tree, and are reduced to normal strings. Paths are also reified: before, the plugin that handles emulator launching (an *orchestrator*) would have to manually set any paths. Now, paths can be specified virtually, for example a save path could just default to `save:/`, which is then expanded to the actual path where saves are stored by a context passed during the traversal. 

Serializers can then traverse the yielded syntax tree node, and generate a configuration file in a given format.

Input configuration is handled as a special case, since they require external information that potentially changes at every launch. The sections just involving input are first evaluated for each controller into syntax tree nodes. These trees are fed back, and then are attached to targets as specified. Since input mappings are represented as enums, reification removes the need for any special mappings at the serialization stage.

In Snowflake, a section can only have primitive and string values. However, with clever use of targets, arbitrarily nested subsections are now possible, allowing structured configuration formats to be represented. Nested values are structurally represented as nodes with children in the syntax tree, which makes generating XML, JSON, YAML, even BML very easy (as well as traditional INI and CFG based formats).

# Input Enumeration API (Introduced as part of [PR #386](https://github.com/SnowflakePowered/snowflake/pull/386))

Input is always a bit hairy, made doubly so because of how it has to be handled on a per-OS basis. I've rewritten this part from scratch very recently to support the changes in the Orchestration API, and to be a bit more flexible with what types of controllers Snowflake would work with.

The core idea of Snowflake's input handling was the *virtual* and *real* **controller layouts**. The virtual layout was the target layout to map to. For example, if playing an NES game, the virtual layout would be that of an [NES Controller](https://stone.snowflakepowe.red/#/defs/controllers/NES_CONTROLLER). The real layout would be that of an actual device, such as an Xbox One Controller.

This turned out to not be the greatest idea. For one, layouts have to be manually written up. Every different controller would have to have their own layout, and support would have to be manually added to the enumerator. Then, every emulator would have to provide mappings from each real layout to their own format. It was impractical to say the least, but at the time seemed like a good idea: it would guarantee that input configuration was always flawless, for the small subset of controllers that were supported. Keyboard support was also hacked on, since layouts, as it pertains to Snowflake anyways, only supported controller input definitions.

The rewritten input enumeration API gets rid of manually written "real" layouts (virtual layouts are still used), in favour of probing what buttons and axes a particular input device exposes to a particular input driver (such as XInput, DirectInput, or evdev). This is then mappable to a virtual layout to define an *input mapping*. 

One device can expose multiple *instances* depending on each input driver, and each input driver has their own properties, most important being the enumeration order being different. Reasonable defaults are attempted, but this can be overridden on a per-device, per-driver basis.

Keyboard support is handled through a special case driver called `keyboard`, which is always available, and exposes the usual keys of a QWERTY keyboard and 5 button mouse. Devices that want to opt out of Snowflake's input handling (such as Real Wiimotes), can use the special `passthrough` driver that exposes nothing, and is up to the orchestration plugin to handle.

# Orchestration API ([PR #513](https://github.com/SnowflakePowered/snowflake/pull/513))
The Orchestration API is what ties everything together and is basically the beating heart of Snowflake. It's also historically been the iffiest and most poorly designed API, because of all the cross cutting concerns involved. The Orchestration API is responsible for putting the generated configuration files into their right place, making sure everything needed to run a game is where it should be, and finally launching the game itself. It touches nearly every API that comprises Snowflake, which is why it's taken so long to get right.

In fact, a lot of the motivation behind the design of the APIs written about here, and more, was to simplify the steps needed by an "orchestrator" to prepare a game for launch. 

The new API design is focused on being easy to encapsulate what it means to "launch a game". Far from simply passing command line parameters down, an orchestrator needs to handle input devices, and configuration synthesis, as well as save game management. The `IGameEmulation` interface is an abstraction over this inherently stateful operation that is different for every emulator, making it easy to interface with no matter what emulator is being launched.

An `IGameEmulation` implementation has a bunch of hooks that have to be called for the game to launch properly. A working directory is created for each instance that the game is launched under. After, these hooks are called in order to set up the game environment:

1. Check if the game can actually be run. This includes checking for any BIOS files that are required, converting the game into a format the emulator understands, etc. 
2. Fetch the state of the input devices that will be used when playing the game. (Whether they're connected or not, if they use XInput or DirectInput, or evdev on Linux, etc.)
3. Copy or otherwise restore a save game snapshot if any to the working directory. Snowflake provides APIs to manage save games of different types to let them be used across different emulators. For example, you could pick up *Radiant Historia* in melonDS right back where you left off in NO$GBA. Save states are unfortunately not supported.
4. Generate any configuration files for the emulator. This includes getting the current input device state for any devices that will be used for the emulator, and then converting Snowflake's input mappings into an emulator-specific input mapping.
5. Copy or refer to any BIOS files that are necessary to run the game. 
6. Call into the emulator and run the game as configured.
7. When the emulator closes, save a new snapshot of the save memory as a new save game. 
8. Finally, clean up after ourselves by deleting any temporary files and configs. 

Figuring out how to deal with this cleanly while still maintaining flexibility was a huge challenge; particularly how to deal with a variety of input devices, as well as what to do when an emulator closes unexpectedly. With these new updates I've been able to cleanly section off many of the cross cutting concerns, greatly simplifying the work an orchestrator needs to do.

There is still [some work to do here involving GraphQL bindings](https://github.com/SnowflakePowered/snowflake/pull/557), but that's most irrelevant to the core of the effort.

# 2020 and onwards

Last year saw a major upheaval of many of Snowflake's core APIs, particularly with regards to installation and enumeration. With the completion of the Orchestration API, I want to say Snowflake is nearly ready for a 1.0 release; however without a functioning UI, I don't want to call it done just yet. I'm slowly but surely still continuing work on the UI side, and I really want to one day be able to use this thing myself, but an ETA still seems far off. I'm not quite ready to announce anything yet, but keep an eye out at [hydrogen-app.com 😉](https://hydrogen-app.com/). I hope to be able to ship an alpha before year's end, but I've written as much before, and it hasn't turned out well yet; I've been trying to ship every year for the past few years at this point! There's still so much to do with wrapping emulators with orchestrators, more scraping plugins, and of course UI design itself is a fickle beast.

Just by reading this blog post and others like it may make it seem that Snowflake is ridiculously overengineered for what is traditionally seen as just a fancy collection of shortcuts (*Like really, monad-like IO abstractions? In my frontend? DAGs? What is this, blockchain? What type of emulator frontend needs to deal with syntax trees anyways?* ). However, so far, every API that comprises Snowflake was built and rebuilt multiple times after careful consideration of edge cases and functionality over the past six years. 

My goal has always been to push what is possible with just wrapping an executable to get as much "integration" as possible without having to touch the emulators themselves. It's incredibly difficult to keep it simple, stupid, when that means pushing complexity onto the user, and instead push it towards the developer (and thus mainly myself). I have been building Snowflake with general use in mind &mdash; most, if not every public API is documented extensively, and a plethora of tests cover about 80% (and rising) of the codebase to ensure that behaviour doesn't regress between changes (as well as to provide some canned examples of usage). To help manage this complexity on the developer side, I try to make my APIs seem natural to use, although sometimes that means [somewhat](https://github.com/SnowflakePowered/snowflake/blob/master/src/Snowflake.Framework.Tests/Scraping/GroupScraper.cs) [idiosyncratic](https://github.com/SnowflakePowered/snowflake/blob/master/src/Snowflake.Plugin.Installation.BasicInstallers/SingleFileCopyInstaller.cs#L80) [ways](https://github.com/SnowflakePowered/snowflake/blob/master/src/Snowflake.Framework.Tests/Configuration/IVideoConfiguration.cs) of writing C#, hopefully nothing too out of the ordinary though.

Towards the goal of integration, one of my holy grail features is an **overlay much like Steam's or Discord's that can allow frontend UI access within a running game**. I'm still looking into a way to do this well, and in a cross platform way, so I'm still looking for some help with this!
8
