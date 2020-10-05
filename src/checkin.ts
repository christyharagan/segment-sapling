import * as path from 'path'
import * as fs from 'fs-extra'
import { listAllTrackingPlans, deleteTrackingPlan, getTrackingPlan } from 'segment-typescript-api/cjs/config_api'
import { load_cli_settings } from './cli_settings'
import { dev_prefix, LIB_DIR, lib_prefix, load_project_settings, TPS_DIR } from './project_settings'
import { refresh } from './refresh'

export async function checkin(_access_token?: string, _work_slug?: string) {
  const project_settings = await load_project_settings()
  const { access_token, work_slug } = await load_cli_settings(_access_token, _work_slug)

  const segment_tps = await listAllTrackingPlans(access_token, work_slug)

  segment_tps.tracking_plans.map(async tp => {
    let dir_name = ''
    if (tp.display_name.indexOf(lib_prefix(project_settings)) == 0) {
      dir_name = path.join(LIB_DIR, tp.display_name.substring(lib_prefix(project_settings).length))
    } else if (tp.display_name.indexOf(dev_prefix(project_settings)) == 0) {
      dir_name = path.join(TPS_DIR, tp.display_name.substring(dev_prefix(project_settings).length))
    }
    if (dir_name) {
      await fs.mkdirp(dir_name)
      const full_tp = await getTrackingPlan(access_token, work_slug, tp.name)
      if (full_tp.rules.events) {
        await Promise.all(full_tp.rules.events.map(async e => {
          const event_file_name = path.join(dir_name, e.name + '.json')
          fs.writeFile(event_file_name, JSON.stringify(e.rules, undefined, '  '))
        }))
      }
    }
  })

  for (let i = 0; i < segment_tps.tracking_plans.length; i++) {
    const tp = segment_tps.tracking_plans[i]
    if (tp.display_name.indexOf(dev_prefix(project_settings)) == 0 || tp.display_name.indexOf(lib_prefix(project_settings)) == 0) {
      await deleteTrackingPlan(access_token, work_slug, tp.name)
    }
  }

  refresh()
}