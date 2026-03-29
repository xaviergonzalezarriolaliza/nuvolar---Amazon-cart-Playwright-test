const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function pad(n) { return n < 10 ? '0' + n : String(n) }
function timestamp() {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

const repoRoot = path.resolve(__dirname, '..')
const reportDir = path.join(repoRoot, 'playwright-report')
const src = path.join(reportDir, 'index.html')
if (!fs.existsSync(src)) {
  console.error('No playwright report found at', src)
  process.exit(1)
}
const destName = `playwright-report-${timestamp()}.html`
const dest = path.join(repoRoot, destName)
fs.copyFileSync(src, dest)
console.log('Saved report as', destName)

try {
  // Force-add and commit the timestamped report, then push
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  execSync(`git add -f "${destName}"`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`git commit -m "chore(report): add ${destName}"`, { cwd: repoRoot, stdio: 'inherit' })
  execSync(`git push origin ${branch}`, { cwd: repoRoot, stdio: 'inherit' })
  console.log('Report committed and pushed as', destName)
} catch (e) {
  console.error('Failed to commit/push report:', e.message)
}
