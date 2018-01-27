---
title: Snowflake Progress Report &mdash; January 2018 
date: 2018-01-12
categories: 
  - feature
  - technical
  - scraping
path: blog/progress-report-january-2018
layout: post
---

It's been nearly four years since work began on this current (and longest lasting) incarnation of Snowflake; it seems amazing that even four years later changes are still being made to its core parts. Naive I was that I never expected the project to balloon into what it became four years after the fact, but Snowflake has never been better   today than since conception. 

Much has changed since the last progress report, a combination of distractions, real life, and a lack of time resulted in no new reports written since the beginning of the summer. Rest assured there's been [much work](https://github.com/SnowflakePowered/snowflake/pulls?q=is%3Apr+is%3Aclosed) since June, especially to the older parts of the core framework that were completely rearchitectured. 

## Website and Branding Redesign 

The last time the website was updated was in 2015! The old branding was even older than that, back when I was a wee little designer fiddling  around in Illustrator, all the way back in 2014. Both the website and branding have been updated to feel a bit more cleaner and *current year*.  This new website should feel a little bit more snappier thanks to [Gatsby](https://www.gatsbyjs.org) and Progressive Web Apps. All posts before 2017 have been shoved away from the front page, if you still want to read them, click the ['Blog'](/blog) link on the top of this page.

The [documentation centre](https://docs.snowflakepowe.red) has also been given a facelift to better reflect the current API. It's more or less the same theme as the main website, but it's a bit rough around the edges thanks to the default templates in [DocFX](https://dotnet.github.io/docfx/), the documentation generator, being absolutely terrible to work with. Here you can explore both the C# API documentation to add features to Snowflake, as well as the GraphQL documentation used to write UIs for Snowflake. Hopefully it'll be able to be fixed up some more later on.

## Improved Emulator Wrapping API

Rather than a radical change in how emulators are handled in Snowflake, some small but non trivial changes have been made to the Emulator API. Now named `Snowflake.Execition`, the new framework gives first-class support for save management and process-based (externally located executable) emulators. Rather than a dedicated "Emulator Assembly" type management, process based emulators can be packed as modules and are loaded using the `emulatorapp` loader.

Most of the changes are aimed at simplifying the unnecessary complexity in writing an emulator plugin for Snowflake by giving first-class support for many aspects common to process-based emulators. Testability was also a core factor in redesigning the new API. The act of running an emulator is abstracted as an `EmulatorTask` which may be stopped at any time (kill the process).

Save games are also managed by Snowflake by copying to and from the location where the emulator is indicated to save, and also supports unlimited save slots and multi-file save games such as for Dolphin. Configurations are now handled by a plugin-specific factory class rather than the emulator itself. There have been no changes made to the Configuration API itself besides some additional generic definitions. 

## *Seed/Tree* Scraping

While the Scraping framework was one of the first parts of Snowflake ever written, over time it became neglected and flaws in it quickly became apparent. For one thing it was rigid and only worked for to produce game data. It wasn't clear how to incorporate and accomodate newer features such as File Signature Identification, game and file records, and Shiragame. There was also interest in using the Scraping framework to produce auxillary files such as CUE files for PlayStation rips that have them missing, or to extract or install certain games especially with newer emulators such as RPCS3. 

*Seed/Tree* solves all that by generalizing the concept of scraping and metadata. Compared to the older system it's much more flexible in sorting and organizing the results of scrapers without limiting what they can produce. Scrapers can now return multiple forms of metadata at once and implementing it in an asynchronous way allows for multiple scrapers to be run at once. This allows for more powerful and accurate scraping in Snowflake. 

For a more detailed write-up on *Seed/Tree*, check out the *Seed/Tree* spotlight.

## GraphQL Remoting

GraphQL is a new way of querying services and APIs developed by Facebook that has gained traction across the Javascript and Web programming community. It is cross platform and works with most popular programming languages including C#, Javascript, and even C++. Snowflake uses GraphQL to allow UIs written in whatever language to communicate with the backend. It makes writing glue code a lot easier compared to the older REST-based or WebSocket based methods, and suits Snowflake's complex data models (especially with emulator configuration) much better than cramming everything into a "resource". 

## Code Cleanups and Tooling

The last few weeks saw an overhaul in how to get started developing for Snowflake. Beginning with the modules system, friction was slowly being reduced in how easy it would be to begin contributing. Small but crucial changes to the Plugin framework were made so that plugin provisions would be easy to declare without an external `plugin.json` file. The `Snowflake.Framework.Utility` library was refactored out of the project and its functions merged to where it was needed. 

Most importantly, Snowflake now has a proper build script and CLI tooling that allows modules and plugins to be easily built and installed to the application directory. Using the Snowflake CLI, building, packing, and installing a module can be automated easily. A Cake buildscript automates compiling and installing the myriad of support modules Snowflake requires to do anything besides start up. 


## What's next?

GraphQL has a really neat, *killer* feature called *GraphiQL* that allows people to easily make queries. While I wouldn't call it "user-friendly" at all, it at least makes Snowflake usable beyond test cases. ~~Hence, after I clean up some things, I will finally be releasing an executable package for Snowflake in February, possibly earlier.~~ A release is coming (and actually is already up somewhere...) but I will go into more detail mid-February after exams.

**I stress** that it will be an **early, early alpha**, intended mainly for **developers**. Because many emulators still lack wrappers, only SNES ROMs will be playable, and only through the bsnes implementation in RetroArch. There is no cross-platform support due to the lack of an input manager on Linux. A video will be made showcasing how exactly to do the usual emulator frontend stuff, but it will be **exclusively through GraphQL queries using GraphiQL**. It is **not meant to be user-friendly**, that comes later.

As for the actual user-friendly Material Design UI, I haven't touched that in a while. Thanks to the component nature of React, the previous work is not rendered useless like past iterations with Polymer, but upgrading to the new GraphQL remoting system, as well as React 16 will take some time. Thankfully, GraphQL will help writing emulator configuration components much easier. 

And finally as I mentioned before, I am researching a Linux input manager as well as how to distribution methods. This may lead to a redesign of the [`ILowLevelInputDevice`](https://docs.snowflakepowe.red/api/snowflake.input.device.ilowlevelinputdevice), but this shouldn't matter much at all as the input API is eventually so abstracted using Stone controller layouts that the lower-level implementation details are irrelavent for 99% of users and developers.

Besides wrapping more emulators and scrapers, I don't feel there is a need for any more major architectural changes in Snowflake anymore. Scraping was one of those warts that I've finally gotten rid of, as well Emulator wrappers are now easier to reason able as well. Even the previous package manager *snowball* was partially revived with the `dotnet-snowflake` CLI, despite lacking any network functionality. Of course I make no guarantees, which is why Snowflake still holds an alpha moniker, but for the first time since I've began writingn Snowflake, I feel satisfied with the way things are handled in general.
