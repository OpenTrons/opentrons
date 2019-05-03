// This build script is run by `make install`

// Merge all JSON files into a single JSON file, build/labware.json,
// with each filename as a key in the final JSON file.
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const buildDir = process.argv[2]

if (!buildDir) {
  throw new Error(
    'build.js requires a build directory given as an argument. eg `node js/scripts/build.js path/to/build/`'
  )
}

let output = {}

const files = glob.sync(path.join(__dirname, '../../definitions/*.json'))

files.forEach(filename => {
  const contents = require(filename)
  const labwareName = path.parse(filename).name

  output[labwareName] = contents
})

const jsonOutput = JSON.stringify(output)

fs.writeFileSync(path.join(buildDir, 'labware.json'), jsonOutput)
