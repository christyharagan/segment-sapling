import * as path from 'path'
import * as fs from 'fs-extra'
import { listAllTrackingPlans, createTrackingPlan } from 'segment-typescript-api/cjs/config_api'
import { load_cli_settings } from './cli_settings'
import { dev_prefix, LIB_DIR, lib_prefix, load_project_settings, TPS_DIR } from './project_settings'
import { refresh } from './refresh'

export async function checkout(_access_token?: string, _work_slug?: string) {
  const project_settings = await load_project_settings()
  const { access_token, work_slug } = await load_cli_settings(_access_token, _work_slug)

  const segment_tps = await listAllTrackingPlans(access_token, work_slug)
  for (let i = 0; i < segment_tps.tracking_plans.length; i++) {
    const tp = segment_tps.tracking_plans[i]
    if (tp.display_name.indexOf(dev_prefix(project_settings)) == 0 || tp.display_name.indexOf(lib_prefix(project_settings)) == 0) {
      console.error('Development tracking plans are already checked-out. Please check-in these plans first.')
      return
    }
  }

  if (!fs.existsSync(TPS_DIR)) {
    console.error('Cannot find ./tps directory. Are you running sapling from the right place?')
    return
  }
  const tps = fs.readdirSync(TPS_DIR).map(f => {
    if (project_settings.dev_schemas.length == 0 || project_settings.dev_schemas.find(s => s == f)) {
      const full_f = path.join(TPS_DIR, f)
      if (fs.lstatSync(full_f).isDirectory()) {
        const events = fs.readdirSync(full_f).map(f => {
          if (path.extname(f).toLowerCase() == '.json') {
            return fs.readFile(path.join(full_f, f), 'utf8').then(c => [f.substring(0, f.length - 5), c] as [string, string])
          } else {
            return Promise.resolve(undefined)
          }
        })
        return [f, Promise.all(events)] as [string, Promise<([string, string] | undefined)[]>]
      }
    }
  })

  const libs = fs.existsSync(LIB_DIR) ?
    fs.readdirSync(LIB_DIR).map(f => {
      if (project_settings.dev_schemas.length == 0 || project_settings.dev_schemas.find(s => s == f)) {
        const full_f = path.join(LIB_DIR, f)
        if (fs.lstatSync(full_f).isDirectory()) {
          const events = fs.readdirSync(full_f).map(f => {
            if (path.extname(f).toLowerCase() == '.json') {
              return fs.readFile(path.join(full_f, f), 'utf8').then(c => [f.substring(0, f.length - 5), c] as [string, string])
            } else {
              return Promise.resolve(undefined)
            }
          })
          return [f, Promise.all(events)] as [string, Promise<([string, string] | undefined)[]>]
        }
      }
    }) : undefined

  let p: Promise<any> = Promise.all(tps).then(tps => {
    tps.forEach(async tp => {
      if (tp) {
        const [name, promise_content] = tp
        const content = await promise_content
        createTrackingPlan(access_token, work_slug, {
          display_name: dev_prefix(project_settings) + name,
          rules: {
            events: content.filter(entry => entry).map(entry => {
              const [name, schema] = entry as [string, string]
              return {
                name,
                rules: JSON.parse(schema)
              }
            })
          }
        })
      }
    })
  })
  if (libs) {
    let q: Promise<any> = Promise.all(libs).then(libs => {
      libs.forEach(async lib => {
        if (lib) {
          const [name, promise_content] = lib
          const content = await promise_content
          createTrackingPlan(access_token, work_slug, {
            display_name: lib_prefix(project_settings) + name,
            rules: {
              events: content.filter(entry => entry).map(entry => {
                const [name, schema] = entry as [string, string]
                return {
                  name,
                  rules: JSON.parse(schema)
                }
              })
            }
          })
        }
      })
    })
    p = Promise.all([p, q]) as Promise<any>
  }

  await p
  refresh()
}