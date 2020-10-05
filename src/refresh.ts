import * as path from 'path'
import * as fs from 'fs-extra'
import { DEF_FILE, LIB_DIR, TPS_DIR } from './project_settings'

export function refresh() {
  if (!fs.existsSync(TPS_DIR)) {
    console.error('Cannot find ./tps directory. Are you running sapling from the right place?')
    return
  }

  const tps: string[] = []
  const libs: string[] = []

  fs.readdirSync(TPS_DIR).map(f => {
    const full_f = path.join(TPS_DIR, f)
    if (fs.lstatSync(full_f).isDirectory()) {
      tps.push(f)
    }
  })

  if (fs.existsSync(LIB_DIR)) {
    fs.readdirSync(LIB_DIR).map(f => {
      const full_f = path.join(LIB_DIR, f)
      if (fs.lstatSync(full_f).isDirectory()) {
        libs.push(f)
      }
    })
  }

  const defs = `declare type LIBS = ${libs.length == 0 ? 'never' : libs.reduce((all, lib) => `${all} | '${lib}'`, '').substring(3)}
declare type TPS = ${tps.length == 0 ? 'never' : tps.reduce((all, tp) => `${all} | '${tp}'`, '').substring(3)}
/**
 * Specify which Tracking plans are linked with which libraries. Format:
 * 
 * {
 *   "Tracking Plan": ["Library 1", "Library 2"]
 * }
 */
declare function link(_: {
  [TP in TPS]?: LIBS[]
}): void

/**
 * 
 * @param prefix the prefix given to the checkedin schemas for development
 * @param schemas the list of tracking plans and libraries to checkin for development. Empty means all of them.
 */
declare function dev(prefix: string, ...schemas: (LIBS | TPS)[]): void
/**
 * 
 * @param prefix the prefix given to the checkedin schemas for testing
 * @param schemas the list of tracking plans to checkin for testing. Empty means all of them.
 */
declare function test(prefix: string, ...schemas: TPS[]): void`

  fs.writeFileSync(DEF_FILE, defs, 'utf8')
}