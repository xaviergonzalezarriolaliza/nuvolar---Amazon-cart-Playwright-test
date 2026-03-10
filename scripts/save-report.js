const fs = require('fs')
const path = require('path')

function pad(n) { return n < 10 ? '0' + n : String(n) }
function timestamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

const reportDir = path.resolve(__dirname, '..', 'playwright-report')
const src = path.join(reportDir, 'index.html')
if (!fs.existsSync(src)) {
  console.error('No playwright report found at', src)
  process.exit(1)
}
const destName = `playwright-report-${timestamp()}.html`
const dest = path.resolve(__dirname, '..', destName)
fs.copyFileSync(src, dest)
console.log('Saved report as', destName)
