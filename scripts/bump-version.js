// AIGC START
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const LOCK_PATH = path.join(ROOT, 'package-lock.json');
const VERSION_PATH = path.join(ROOT, 'src', 'version.ts');

function parseVersion(version) {
  const match = String(version || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error('版本号必须符合 SemVer：MAJOR.MINOR.PATCH，例如 1.0.0');
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function formatVersion(parts) {
  return `${parts.major}.${parts.minor}.${parts.patch}`;
}

function bumpVersion(currentVersion, target) {
  const current = parseVersion(currentVersion);
  if (target === 'patch') {
    return formatVersion({ major: current.major, minor: current.minor, patch: current.patch + 1 });
  }
  if (target === 'minor') {
    return formatVersion({ major: current.major, minor: current.minor + 1, patch: 0 });
  }
  if (target === 'major') {
    return formatVersion({ major: current.major + 1, minor: 0, patch: 0 });
  }
  if (/^\d+\.\d+\.\d+$/.test(String(target || ''))) {
    return formatVersion(parseVersion(target));
  }
  throw new Error('用法：node scripts/bump-version.js <patch|minor|major|x.y.z>');
}

function replaceVersionSource(source, nextVersion) {
  if (!/export const APP_VERSION = '[^']+';/.test(source)) {
    throw new Error('未找到 src/version.ts 中的 APP_VERSION 声明');
  }
  return source.replace(/export const APP_VERSION = '[^']+';/, `export const APP_VERSION = '${nextVersion}';`);
}

function updatePackageLock(nextVersion) {
  if (!fs.existsSync(LOCK_PATH)) {
    return;
  }
  const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  lock.version = nextVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = nextVersion;
  }
  fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
}

function run(target) {
  if (!target) {
    throw new Error('用法：node scripts/bump-version.js <patch|minor|major|x.y.z>');
  }
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
  const nextVersion = bumpVersion(packageJson.version, target);
  packageJson.version = nextVersion;
  fs.writeFileSync(PACKAGE_PATH, `${JSON.stringify(packageJson, null, 2)}\n`);
  updatePackageLock(nextVersion);
  const versionSource = fs.readFileSync(VERSION_PATH, 'utf8');
  fs.writeFileSync(VERSION_PATH, replaceVersionSource(versionSource, nextVersion));
  console.log(`version bumped to ${nextVersion}`);
}

if (require.main === module) {
  try {
    run(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  parseVersion,
  bumpVersion,
  replaceVersionSource,
  run
};
// AIGC END
