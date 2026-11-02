import './build-core.mjs'
import {build} from 'esbuild'
import {createHash} from 'node:crypto'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
const root=new URL('../',import.meta.url)
const output=await build({
 absWorkingDir:fileURLToPath(root),entryPoints:['index.js'],bundle:true,write:false,
 platform:'node',format:'esm',target:'node22',packages:'external',legalComments:'inline',
 banner:{js:'// dsh-antigravity. MIT license and upstream attribution in LICENSE and UPSTREAM.md.'},
})
const text=output.outputFiles[0].text
const revision=createHash('sha256').update(text).digest('hex').slice(0,12)
// This metadata-only release must not reload the already mounted provider.
if(revision!=='00f902ec8591')throw Error(`Unexpected primary host change: ${revision}`)
const directory=new URL(`dist/host/${revision}/`,root)
await mkdir(directory,{recursive:true})
const path=new URL('index.js',directory)
let previous
try{previous=await readFile(path,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
if(previous!==undefined&&previous!==text)throw Error(`Immutable host release collision: ${revision}`)
if(previous===undefined)await writeFile(path,text,{flag:'wx'})
const displayOutput=await build({
 absWorkingDir:fileURLToPath(root),entryPoints:['model-display-entry.js'],bundle:true,write:false,
 platform:'node',format:'esm',target:'node22',packages:'external',legalComments:'inline',
 banner:{js:'// dsh-antigravity model display metadata only. MIT.'},
})
const displayText=displayOutput.outputFiles[0].text
const displayRevision=createHash('sha256').update(displayText).digest('hex').slice(0,12)
const displayDirectory=new URL(`dist/model-display/${displayRevision}/`,root)
await mkdir(displayDirectory,{recursive:true})
const displayPath=new URL('index.js',displayDirectory)
let previousDisplay
try{previousDisplay=await readFile(displayPath,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
if(previousDisplay!==undefined&&previousDisplay!==displayText)throw Error(`Immutable model display release collision: ${displayRevision}`)
if(previousDisplay===undefined)await writeFile(displayPath,displayText,{flag:'wx'})
const patch=`- insert:\n    - id: antigravity\n      name: ./dist/host/${revision}/index.js\n    - id: antigravity-model-display-${displayRevision}\n      name: ./dist/model-display/${displayRevision}/index.js\n`
const patchPath=new URL('cordis.patch.yml',root)
if(await readFile(patchPath,'utf8')!==patch)await writeFile(patchPath,patch)
console.log(`Antigravity host ${revision}; model display ${displayRevision}`)
