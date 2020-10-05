import * as process from 'process'
import * as path from 'path'
import * as fs from 'fs-extra'
import { ScriptTarget, ModuleResolutionKind, createCompilerHost, createProgram, getPreEmitDiagnostics, CompilerOptions } from 'typescript'
import { refresh } from './refresh'

export const LIB_DIR = path.join(process.cwd(), 'lib')
export const TPS_DIR = path.join(process.cwd(), 'tps')
export const LINKS_FILE = path.join(process.cwd(), 'links.ts')
export const SETTINGS_FILE = path.join(process.cwd(), 'settings.ts')
export const DEF_FILE = path.join(process.cwd(), '_.d.ts')
export const TSCONFIG_FILE = path.join(process.cwd(), 'tsconfig.json')

const options: CompilerOptions = {
  target: ScriptTarget.ES2017,
  strict: true,
  suppressExcessPropertyErrors: false,
  moduleResolution: ModuleResolutionKind.NodeJs,
  esModuleInterop: true,
  noEmitOnError: true
}

export type ProjectSettings = {
  links: { [tp: string]: string[] }
  dev_prefix: string
  dev_schemas: string[]
  test_prefix: string
  test_schemas: string[]
}

export function dev_prefix(project_settings: ProjectSettings) {
  return project_settings.dev_prefix + '/'
}
export function lib_prefix(project_settings: ProjectSettings) {
  return project_settings.dev_prefix + '/lib/'
}
export function test_prefix(project_settings: ProjectSettings) {
  return project_settings.test_prefix + '/'
}

export async function load_project_settings(): Promise<ProjectSettings> {
  if (fs.existsSync(SETTINGS_FILE) && fs.existsSync(LINKS_FILE)) {
    if (!fs.existsSync(TSCONFIG_FILE)) {
      fs.writeFileSync(TSCONFIG_FILE, `{
  "compilerOptions": {
    "target": "es5",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
`, 'utf8')
    }
    if (!fs.existsSync(DEF_FILE)) {
      refresh()
    }
    const host = createCompilerHost(options)
    const output: { links: string, settings: string } = { links: '', settings: '' }
    host.writeFile = (fileName: string, contents: string) => fileName.indexOf('settings.js') >= 0 ? output.settings = contents : fileName.indexOf('links.js') >= 0 ? output.links = contents : undefined

    const program = createProgram([SETTINGS_FILE, LINKS_FILE, DEF_FILE], options, host)
    const emitResult = program.emit()

    let allDiagnostics = getPreEmitDiagnostics(program)
      .concat(emitResult.diagnostics)

    if (allDiagnostics.length == 0) {
      let links: { [tp: string]: string[] } = {}
      let dev_prefix = 'dev'
      let dev_schemas: string[] = []
      let test_prefix = 'test'
      let test_schemas: string[] = []
      eval(`function link(l){
  links = l
}
function dev(p, ...schemas){
  dev_prefix = p
  dev_schemas = schemas
}
function test(p, ...schemas){
  test_prefix = p
  test_schemas = schemas
}
${output.settings}
${output.links}`)

      return {
        links,
        dev_prefix,
        dev_schemas,
        test_prefix,
        test_schemas
      }
    } else {
      throw 'settings.ts and/or links.ts are not valid. Fix these files before continuing'
    }
  } else {
    throw 'Cannot find settings.ts and/or links.ts. Must be in the current working directory.'
  }
}