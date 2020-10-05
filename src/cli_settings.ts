import YAML from 'yaml'
import * as fs from 'fs-extra'
import * as os from 'os'
import * as path from 'path'

export type CliSettings = {
  work_slug?: string
  access_token?: string
}

export type AllSettings = {
  work_slug: string
  access_token: string
}

const HOME_DIR = os.homedir()
const SAPLING_DIR = path.join(HOME_DIR, '.sapling')
const SAPLING_SETTINGS_FILE = path.join(SAPLING_DIR, 'settings.yaml')

export async function load_cli_settings(access_token?: string, work_slug?: string): Promise<AllSettings> {
  if (access_token && work_slug) {
    return { access_token, work_slug }
  }
  if (fs.existsSync(SAPLING_SETTINGS_FILE)) {
    let f = await fs.readFile(SAPLING_SETTINGS_FILE, 'utf8')
    const settings = YAML.parse(f)
    access_token = access_token || settings.access_token || ''
    work_slug = work_slug || settings.work_slug || ''
    if (!access_token) {
      throw 'Either provide access_token as a parameter or ensure it is saved via the "sapling setup" first'
    }
    if (!work_slug) {
      throw 'Either provide work_slug as a parameter or ensure it is saved via the "sapling setup" first'
    }
    return { access_token, work_slug }
  } else {
    throw 'Either provide access_token and work_slug as parameters or first run "sapling setup" first'
  }
}

export async function save_settings(settings: CliSettings) {
  await fs.mkdirp(SAPLING_DIR)
  await fs.writeFile(SAPLING_SETTINGS_FILE, YAML.stringify(settings), 'utf8')
}