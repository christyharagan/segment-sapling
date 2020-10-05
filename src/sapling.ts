#!/usr/bin/env node

import * as yargs from 'yargs'
import { save_settings, CliSettings } from './cli_settings'
import { checkout } from './checkout'
import { checkin } from './checkin'
import { publish } from './publish'
import { refresh } from './refresh'
import { test } from './test'
import { clean } from './clean'

yargs
  .command('setup', 'Setup sapling on your local account', {
    builder: {
      'access_token': {
        description: 'The access token for the workspace',
        string: true,
        alias: 'a',
        required: true
      },
      'work_slug': {
        description: 'The workspace slug',
        string: true,
        alias: 's',
        required: true
      }
    },
    handler: async args => {
      args.access_token as string
      args.work_slug as string

      const settings: CliSettings = {
        access_token: args.access_token as string,
        work_slug: args.work_slug as string
      }
      await save_settings(settings)
    }
  })
  .command('checkin [access_token] [work_slug]', 'Pull the tracking plans from your Segment workspace', args => {
    checkin(args.argv.access_token as string | undefined, args.argv.work_slug as string | undefined)
  })
  .command('checkout [access_token] [work_slug]', 'Push the tracking plans to your Segment workspace', args => {
    checkout(args.argv.access_token as string | undefined, args.argv.work_slug as string | undefined)
  })
  .command('test [access_token] [work_slug]', 'Test the full tracking plans in your Segment workspace', args => {
    test(args.argv.access_token as string | undefined, args.argv.work_slug as string | undefined)
  })
  .command('refresh', 'Refresh the list of tracking plans and libraries', () => {
    refresh()
  })
  .command('publish [access_token] [work_slug]', 'Publish the tracking plans to Segment as production tracking plans', args => {
    publish(args.argv.access_token as string | undefined, args.argv.work_slug as string | undefined)
  })
  .command('clean [access_token] [work_slug]', 'Clean all dev and test tracking plans (for this user) from the Segment workspace', args => {
    clean(args.argv.access_token as string | undefined, args.argv.work_slug as string | undefined)
  })
  .demandCommand()
  .argv