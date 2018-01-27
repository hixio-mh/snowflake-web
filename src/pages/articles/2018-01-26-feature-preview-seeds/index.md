---
title: Feature Preview &mdash; Seed/Tree Scraping 
date: 2018-01-12
categories: 
  - spotlight
  - technical
  - scraping
---


Creating a flexible standard way to scrape data for a game has surprisingly been a problem since the very beginning of Snowflake. The initial scraping system was one of the very first parts written, and actually copied a very common model for data collection. A scraper could provide a fixed set of images (Boxarts, Fanarts, etc.), and a fixed set of data (Description, Title), etc., given a search term usually derived from the ROM's filename. The problem was a way to select the most accurate result and how to deal with multiple scrapers, as well as dealing with finding a search result if the file was not properly named. 

Initially the idea was to have each scraper plugin define a 'weight' that would be taken into account when comparing search results for accuracy. However the weight was simply arbitrary and really didn't help much at all, and sometimes made inaccurate results float to the top. 

Databases such as OpenVGDB have compiled information for thousands of games, but rely on hashing and filenames. While CRC hashing is a reliable method for verified dumps, for certain types of systems especially past the 4th generation of consoles, trimming and compression invalidate the hash without compromising ROM content. Disc-based games often were too large to hash in a reasonable time, and now there are emulated games that must be extracted to the filesystem before being able to be run. 

File Signature detection was a strategy to get some more information off of games that can not be hashed quickly or easily, leveraging [Stone](https://stone.snowflakepow.red) mimetypes to determine both executable file types and information about the ROM itself. However, because it was not sufficient to get a full metadata profile of a game, it was used as an auxillary source if the game was determined to be unhashable. The so called 'pipeline' from search term to metadata was still rigid and bloated; while the changes made to the library in the form of Records allowed for metadata beyond the prescribed title, description, author, etc., scrapers were still fixed to this prescribed system. More details about this older approach can be found at the archived article on [heuristic scraping](https://snowflakepowe.red/blog/feature-preview-heuristic-scraping).

## Query Providers

A second attempt at redesigning scrapers came in the form of `QueryProviders` that attempted to generalize the 'getting' of a single metadata. It assumed that all scrapers could be characterized as, excuse the terminology here, *functions* that took in one or more inputs (the search result), and returned a single output. The hope was that these providers would be chained and composed together to form the full picture of what a game was. Providers could specify what existing metadata was required to execute their search, and the single piece of metadata returned would be added to a cache. This repeated until no further providers could execute. 

In many ways this approach was the origin of the term *Seed* in *Seed/Tree* scraping. However, the problem with these providers was that it assumed metadata results lived in a flat structure. Multiple scrapers would have to return the same types and somehow tag them to refer back to when getting additional information, which made writing scrapers an annoying and unpleasant ordeal. Results were chosen to be in the game on a best-guess basis, mostly by trusting that the scraper would return the most relevant result. These problems with this model were quickly apparent, but at the time it was thought that it was 'good enough'. Query Providers and scraping in general were neglected, left aside to be improved at a later time.

## *Seed/Tree*

*Seed/Tree* generalizes the concepts of `QueryProviders`, as well as the previous `ScrapeEngine` together to become a much more powerful tool than just to gather metadata. Scrapers aren't limited to just returning a single result. Not only can they now return multiple pieces of metadata at once, but metadata can have children that are also metadata. This means that when a scraper is asked to provide results for a given search query, they can return all the results for the query, and each result has its own information be it title, description, a URL to an image, whatever. 

*Metadata can have metadata* is the most important concept with *Seed/Tree*. Each piece of metadata can have metadata itself, branching out like a tree; each piece of metadata is called a *Seed* in this terminology, as it "seeds" a tree of its own metadata. A *Seed* is not only a piece of metadata, but has a *type* or a name, that describes what the metadata is. Scrapers can then declare which types of metadata they want to use to "seed" their query and return additional metadata. Essentially, scrapers create new metadata from existing metadata. However the term "*metadata*" here is used very loosely. In *Seed/Tree*, files are also metadata, with the type *file* which are later used to create file records for the resultant game. This allows for Scrapers to download media items such as banners and boxarts and have it conditionally added to the file records for the game. This functionality is not limited to media items, *seed/tree* can also be used to generate auxillary files such as CUE files or extract large ZIPs or ISOs. 

After all scrapers have been run, *cullers* are run that trim the tree and remove inaccurate and excess metadata. Scrapers no longer self-regulate their results, and are at the mercy of one or more cullers that filter out metadata; essentially they work the same as a scraper but in reverse, in that they use metadata to remove other metadata. Finally, a *traverser* traverses the culled tree and produces one or more final results from the metadata in the tree.

For more detailed information about the implementation of  *Seed/Tree*, read through the [pull request documentation](https://github.com/SnowflakePowered/snowflake/pull/262).