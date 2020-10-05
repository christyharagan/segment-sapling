import { load_cli_settings } from './cli_settings'
import * as path from 'path'
import * as fs from 'fs-extra'
import { listAllTrackingPlans, createTrackingPlan, updateTrackingPlan } from 'segment-typescript-api/cjs/config_api'
import { LIB_DIR, load_project_settings, test_prefix, TPS_DIR } from './project_settings'
import { TrackingPlanCreation } from 'segment-typescript-api/cjs/config_request'
import { refresh } from './refresh'

export async function test(_access_token?: string, _work_slug?: string) {
  const project_settings = await load_project_settings()
  const { access_token, work_slug } = await load_cli_settings(_access_token, _work_slug)
  const segment_tps = await listAllTrackingPlans(access_token, work_slug)

  if (!fs.existsSync(TPS_DIR)) {
    console.error('Cannot find ./tps directory. Are you running sapling from the right place?')
    return
  }

  function add_event(event: [string, string] | undefined, tracking_plan: TrackingPlanCreation, seen_names: { [name: string]: number }) {
    if (event) {
      const [name, content] = event

      if (seen_names[name] === undefined) {
        seen_names[name] = tracking_plan.rules.events ? tracking_plan.rules.events.length : 0
      } else {
        console.warn('There is a conflict for the event called ' + name)

        if (tracking_plan.rules.events) {
          delete tracking_plan.rules.events[seen_names[name]]
          seen_names[name] = tracking_plan.rules.events.length
        } else {
          throw 'Sanity'
        }
      }

      const rules = JSON.parse(content)
      if (!tracking_plan.rules.events) {
        tracking_plan.rules.events = []
      }
      tracking_plan.rules.events.push({
        name,
        rules
      })
    }
  }

  await Promise.all(fs.readdirSync(TPS_DIR).map(async f => {
    if (project_settings.test_schemas.length == 0 || project_settings.test_schemas.find(s => s == f)) {
      const full_f = path.join(TPS_DIR, f)
      if (fs.lstatSync(full_f).isDirectory()) {
        const tp_name = test_prefix(project_settings) + f
        let tracking_plan: TrackingPlanCreation = {
          display_name: tp_name,
          rules: {}
        }
        const seen_names: { [name: string]: number } = {}

        const events = await Promise.all(fs.readdirSync(full_f).map(f => {
          if (path.extname(f).toLowerCase() == '.json') {
            return fs.readFile(path.join(full_f, f), 'utf8').then(c => [f.substring(0, f.length - 5), c] as [string, string])
          } else {
            return Promise.resolve(undefined)
          }
        }))
        const links = project_settings.links[f]
        if (links) {
          const libs = await Promise.all(links.map(async link => {
            const full_f = path.join(LIB_DIR, link)
            if (fs.lstatSync(full_f).isDirectory()) {
              return await Promise.all(fs.readdirSync(full_f).map(f => {
                if (path.extname(f).toLowerCase() == '.json') {
                  return fs.readFile(path.join(full_f, f), 'utf8').then(c => [f.substring(0, f.length - 5), c] as [string, string])
                } else {
                  return Promise.resolve(undefined)
                }
              }))
            } else {
              throw 'links.json is invalid. Cannot find library folder: ' + full_f + '. Try refreshing the project.'
            }
          }))

          libs.forEach(lib => lib.forEach(event => {
            add_event(event, tracking_plan, seen_names)
          }))
        }

        events.forEach(event => {
          add_event(event, tracking_plan, seen_names)
        })

        const existing_tp = segment_tps.tracking_plans.find(tp => tp.display_name == tp_name)
        if (existing_tp) {
          await updateTrackingPlan(access_token, work_slug, existing_tp.name, {
            update_mask: { paths: ['tracking_plan.rules'] },
            tracking_plan
          })
        } else {
          await createTrackingPlan(access_token, work_slug, tracking_plan)
        }
      }
    }
  }))

  refresh()
}