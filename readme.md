# Segment Sapling

A framework for managing [Segment](https://segment.com/) tracking plans that makes it easy to integrate with version control, develop and test in a team environment (including automated testing from a build machine), and make advanced edits of the schemas in a code editor.

Table of Contents
=================

 * [Install](#install)
 * [Usage](#usage)
 * [Quick Start](#quick-start)
 * [Manual](#manual)
   * [Tracking Plans](#tracking-plans)
   * [Libraries](#libraries)
   * [Links](#links)
   * [Phases](#phases)
     * [Development](#development)
     * [Testing](#testing)
     * [Production](#production)
   * [Settings](#settings)
   * [Commands](#commands)

## Install

Each team member (or build machine) will need the sapling executable installed. This can be achieved by either downloading from GitHub (no dependencies) or by running (requires [Node](https://nodejs.org/) installed):

```
npm i -g segment-sapling
```

## Usage

You will need both the workspace slug (found by going to the workspace, Settings -> General Settings -> Slug) and a workspace access token (see [here](https://segment.com/docs/config-api/authentication/)). Every command will require these two values. For convenience, you can save those values to your home directory (and prevent having to manually enter them each time) by running:

```
sapling setup --access_token=XX --work_slug=XX
```

For the above command you may omit either value if you don't want it saved.

To start off, you will need a folder on the machine that follows a basic project layout (you can check-out this [starter project](https://github.com/christyharagan/segment-sapling-seed)):

 * ```tps``` folder for putting tracking plan definitions. See the section on [tracking plans](#tracking-plans) for details
 * ```lib``` folder for putting shared library definitions. See the section on [tracking plans](#libraries) for details
 * ```links.ts``` controls which libraries are linked to which tracking plans. See the section on [links](#links)
 * ```settings.ts``` controls the dev/test prefixes for tracking plans in the workspace. See the section on [settings](#settings)

Sapling supports three distinct phases:

 * [Dev](#development): supports development of one or more tracking plans or libraries. Can be developed locally in an editor, in the Segment tracking plan editor UI, or both.
 * [Test](#testing): combines tracking plans and libraries and deploys to the Segment workspace for testing
 * [Prod](#production): combines tracking plans and libraries and deploys to the Segment workspace for production use

## Quick Start

 * Run ```sapling setup --access_token=XX --work_slug=XX``` (providing values for access_token and work_slug that you're targeting)
 * Checkout the [starter project](https://github.com/christyharagan/segment-sapling-seed)
 * Create a folder under ```tps``` and give it the name of a tracking plan
 * Create a folder under ```libs``` and give it the name of an event library
 * Open ```settings.ts``` can under ```dev``` replace the string value with some unique prefix that your development tracking plans will go under in the Segment workspace. Do the same for ```test``` (ensuring the two prefixes are different)
 * Open ```links.ts``` and link the library to the tracking plan (see [links](#links) for details)
 * Run ```sapling checkout```
 * Go to the Segment workspace and add some events to the two newly created plans
 * Run ```sapling checkin```
 * Open the newly created JSON schema files in the folders you created and make advanced edits
 * Run ```sapling test```
 * Go to the Segment workspace and test against the test tracking plan
 * Run ```sapling publish```
 * Now your Segment workspace will have tracking plans you can use for production
 * Run ```sapling clean```
 * Now your Segment workspace will have all dev and test tracking plans removed

## Manual

### Tracking Plans

Tracking plans are created by either:
 * creating a new folder under ```tps```. These are synced to the workspace by running either ```sapling checkout```, ```sapling test```, or ```sapling publish```.
 * creating a tracking plan in the Segment workspace but with the correct dev-prefix (see [Development](#development) for more details). These will be synced to the file-system by running ```sapling checkin```

Events for the tracking plan will be represented under the tracking plan folder as JSON schema files (one per event).

### Libraries

Libraries allow you to define common events that can be shared by many tracking plans.

Libraries are created by either:
 * creating a new folder under ```library```. These are synced to the workspace by running either ```sapling checkout```, ```sapling test```, or ```sapling publish```.
 * creating a tracking plan in the Segment workspace but with the correct lib-prefix (see [Development](#development) for more details). These will be synced to the file-system by running ```sapling checkin```

Events for the library will be represented under the library folder as JSON schema files (one per event).

### Links

To associate one or more libraries with a tracking plan, you edit the ```links.ts``` file. An example usage is:

```ts
link({
  'Tracking Plan A': ['Library C'],
  "Tracking Plan B": ['Library C', 'Library D']
})
```

Since ```links.ts``` is actually a TypeScript file, and all the names of the tracking plans/libraries is strongly typed, you can use auto-complete in the various places to get the correct list of tracking plan/library values. It will also complain if you type in the wrong value.

IMPORTANT NOTE:

If you've added a new library or tracking-plan folder (and not run any other sapling command), then these new instances won't be represented by the editor for the ```links.ts``` file (you won't see them appear in auto-complete, and you'll get error lines if you add them in). To correct this run:

```
sapling refresh
```

It's also important to know that some of the other sapling commands won't work if there are errors in the ```links.ts``` file, so ensuring things are refreshed properly can be important.

### Phases

There are three distinct phases. These enable a team to work on multiple versions of tracking plans concurrently.

#### Development

Each team member may add and modify tracking plans and libraries in the phase. To support this, tracking plans are represented in the Segment workspace with a prefix. This prefix is controlled by the ```settings.ts``` file under the ```dev``` entry. The first string value is the prefix. After this, you can add the names of tracking plans and libraries, if - rather than checking out all instances - you instead want to work on only a select few. Adding no names (the default) will check-out all instances.

To add tracking plans/libraries to the workspace (so as to edit them using the Segment UI), run:

```
sapling checkout
```

Any empty tracking-plan/libraries directories will get created as blank tracking-plans in the Segment workspace, and any with pre-existing JSON schemas will get created with those implemented.

Once editing in the workspace is finished, to save those changes back to the file-system run:

```
sapling checkin
```

Edits can be made directly to the files on the file-system, but be sure to not have checked-out in the workspace, and check-in will overwrite any changes on the file-system. If you have checked-out files and wish to discard any changes made in the workspace, run:

```
sapling clean
```

#### Testing

This phase will combine all libraries with their tracking plans and add to the workspace, under a testing prefix. These deployed versions can be connected to dev/test sources to ensure everything works as expected. The testing prefix is controlled by the ```settings.ts``` file under the ```test``` entry. The first string value is the prefix. After this, you can add the names of tracking plans and libraries, if - rather than checking out all instances - you instead want to test just a few. Adding no names (the default) will check-out all instances.

To deploy the testing tracking plans run:

```
sapling test
```

This will overwrite any existing versions. Testing tracking-plans shouldn't be edited in the Segment UI as these changes won't be saved back to the file-system (use the [development phase](#development) instead).

If you want to remove the testing files, run:

```
sapling clean
```

#### Production

Once a version of the tracking-plans is good to be pushed to production, run:

```
sapling publish
```

This will combine the libraries with tracking plans and publish all tracking-plans to the workspace. No prefix is used, as there can only be one published version. Re-running the command will overwrite old versions.

This command could, for example, be set-up to run on a build machine or a SCM upon commit of a version to the production branch.

### Settings

The ```settings.ts``` file has two settings:

 * dev: The first parameter sets the dev-prefix for the user. Subsequent parameters (if provided) control what tracking-plans/libraries will get checked-out to the Segment workspace (or all if none are provided)
 * test: The first parameter sets the test-prefix for the user. Subsequent parameters (if provided) control what tracking-plans will get deployed to the Segment workspace for testin (or all if none are provided)

### Commands

 All the possible sapling commands (e.g. ```sapling test```)

 * checkout: Add tracking plans and libraries to the Segment Workspace (under the dev prefix) so they can be edited in the Segment UI. This will fail if there are already dev-prefixed tracking-plans in the workspace
 * checkin: Pull all changes from development prefixed tracking-plans in the Segment workspace into the file-system. This will also remove those tracking-plans from the Workspace.
 * test: Add tracking plans (combined with linked libraries) to the Segment Workspace (under the test prefix) so they can be tested against sources. This will overwrite previous versions.
 * publish: Add tracking plans (combined with linked libraries) to the Segment Workspace for production use. This will overwrite previous versions.
 * clean: Remove all dev-prefixed and test-prefixed tracking plans from the workspace
 * refresh: update the list of tracking-plans and libraries for use in the ```links.ts``` file.