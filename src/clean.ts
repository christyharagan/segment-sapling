import { deleteTrackingPlan, listAllTrackingPlans } from 'segment-typescript-api/cjs/config_api'
import { load_cli_settings } from './cli_settings'
import { dev_prefix, lib_prefix, load_project_settings, test_prefix } from './project_settings'
import { refresh } from './refresh'

export async function clean(_access_token?: string, _work_slug?: string) {
  const project_settings = await load_project_settings()
  const { access_token, work_slug } = await load_cli_settings(_access_token, _work_slug)
  const segment_tps = await listAllTrackingPlans(access_token, work_slug)

  const dev = dev_prefix(project_settings)
  const lib = lib_prefix(project_settings)
  const test = test_prefix(project_settings)

  await Promise.all(segment_tps.tracking_plans.map(async tp => {
    if (tp.display_name.indexOf(dev) == 0 || tp.display_name.indexOf(test) == 0 || tp.display_name.indexOf(lib) == 0) {
      await deleteTrackingPlan(access_token, work_slug, tp.name)
    }
  }))

  refresh()
}