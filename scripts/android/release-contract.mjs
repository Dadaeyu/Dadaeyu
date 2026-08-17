import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export const ANDROID_RELEASE_CONTRACT = Object.freeze({
  host: "dadaeyu.vercel.app",
  packageName: "com.dadaeyou.app",
  versionCode: 1,
  versionName: "1.0.0",
  signingKeyPath: "../../private/android-signing/dadaeyu-upload.jks",
  compileSdk: 36,
  targetSdk: 36,
  assetLinksRelation: "delegate_permission/common.handle_all_urls",
  assetLinksNamespace: "android_app"
});

const SHA256_FINGERPRINT_PATTERN = /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/u;

export function readAndroidProjectContract(projectRoot) {
  const twaManifest = JSON.parse(
    readFileSync(join(projectRoot, "android-twa/twa-manifest.json"), "utf8")
  );
  const androidGradleSource = readFileSync(
    join(projectRoot, "android-twa/app/build.gradle"),
    "utf8"
  );
  const assetLinksPath = join(projectRoot, "public/.well-known/assetlinks.json");

  return {
    twaManifest: {
      host: twaManifest.host,
      packageId: twaManifest.packageId,
      versionCode: twaManifest.appVersionCode,
      versionName: twaManifest.appVersionName,
      signingKeyPath: twaManifest.signingKey?.path,
      fingerprints: Array.isArray(twaManifest.fingerprints)
        ? twaManifest.fingerprints.map((fingerprint) => fingerprint.value)
        : []
    },
    androidGradle: {
      applicationId: readGradleString(androidGradleSource, /applicationId\s+"([^"]+)"/u),
      versionCode: readGradleInteger(androidGradleSource, /versionCode\s+(\d+)/u),
      versionName: readGradleString(androidGradleSource, /versionName\s+"([^"]+)"/u),
      compileSdk: readGradleInteger(androidGradleSource, /compileSdkVersion\s+(\d+)/u),
      targetSdk: readGradleInteger(androidGradleSource, /targetSdkVersion\s+(\d+)/u)
    },
    assetLinks: existsSync(assetLinksPath) ? JSON.parse(readFileSync(assetLinksPath, "utf8")) : []
  };
}

export function findTrackedAndroidReleaseSecrets(projectRoot) {
  const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
    cwd: projectRoot,
    encoding: "utf8"
  })
    .split("\0")
    .filter(Boolean);

  return trackedFiles.filter(
    (path) =>
      path.startsWith("private/android-signing/") ||
      path.startsWith("private/android-release/") ||
      /(?:^|\/)(?:credentials\.env|local\.properties)$/iu.test(path) ||
      /\.(?:jks|keystore|apk|aab|apks)$/iu.test(path)
  );
}

export function validateAndroidReleaseContract(contract) {
  const errors = [];
  const expected = ANDROID_RELEASE_CONTRACT;
  const twaManifest = contract?.twaManifest ?? {};
  const androidGradle = contract?.androidGradle ?? {};
  const assetLink = Array.isArray(contract?.assetLinks) ? contract.assetLinks[0] : undefined;
  const assetLinkTarget = assetLink?.target ?? {};

  if (twaManifest.host !== expected.host) {
    errors.push(
      `Expected TWA host ${expected.host}, received ${formatReceived(twaManifest.host)}.`
    );
  }

  if (twaManifest.packageId !== expected.packageName) {
    errors.push(
      `Expected Android package ${expected.packageName}, received ${formatReceived(twaManifest.packageId)}.`
    );
  }

  if (twaManifest.versionCode !== expected.versionCode) {
    errors.push(
      `Expected versionCode ${expected.versionCode}, received ${formatReceived(twaManifest.versionCode)}.`
    );
  }

  if (twaManifest.versionName !== expected.versionName) {
    errors.push(
      `Expected versionName ${expected.versionName}, received ${formatReceived(twaManifest.versionName)}.`
    );
  }

  if (twaManifest.signingKeyPath !== expected.signingKeyPath) {
    errors.push(
      `Expected signing key path ${expected.signingKeyPath}, received ${formatReceived(
        twaManifest.signingKeyPath
      )}.`
    );
  }

  if (androidGradle.applicationId !== expected.packageName) {
    errors.push(
      `Expected Gradle applicationId ${expected.packageName}, received ${formatReceived(
        androidGradle.applicationId
      )}.`
    );
  }

  if (androidGradle.versionCode !== expected.versionCode) {
    errors.push(
      `Expected Gradle versionCode ${expected.versionCode}, received ${formatReceived(
        androidGradle.versionCode
      )}.`
    );
  }

  if (androidGradle.versionName !== expected.versionName) {
    errors.push(
      `Expected Gradle versionName ${expected.versionName}, received ${formatReceived(
        androidGradle.versionName
      )}.`
    );
  }

  if (androidGradle.compileSdk !== expected.compileSdk) {
    errors.push(
      `Expected compileSdk ${expected.compileSdk}, received ${formatReceived(androidGradle.compileSdk)}.`
    );
  }

  if (androidGradle.targetSdk !== expected.targetSdk) {
    errors.push(
      `Expected targetSdk ${expected.targetSdk}, received ${formatReceived(androidGradle.targetSdk)}.`
    );
  }

  if (
    !Array.isArray(assetLink?.relation) ||
    !assetLink.relation.includes(expected.assetLinksRelation)
  ) {
    errors.push(`Expected assetlinks[0].relation to include ${expected.assetLinksRelation}.`);
  }

  if (assetLinkTarget.namespace !== expected.assetLinksNamespace) {
    errors.push(
      `Expected assetlinks[0].target.namespace ${expected.assetLinksNamespace}, received ${formatReceived(
        assetLinkTarget.namespace
      )}.`
    );
  }

  if (assetLinkTarget.package_name !== expected.packageName) {
    errors.push(
      `Expected assetlinks[0].target.package_name ${expected.packageName}, received ${formatReceived(
        assetLinkTarget.package_name
      )}.`
    );
  }

  if (!hasSha256Fingerprint(assetLinkTarget.sha256_cert_fingerprints)) {
    errors.push(
      "Expected assetlinks[0].target.sha256_cert_fingerprints to contain SHA-256 fingerprints."
    );
  }

  return errors;
}

function hasSha256Fingerprint(fingerprints) {
  return (
    Array.isArray(fingerprints) &&
    fingerprints.length > 0 &&
    fingerprints.every((fingerprint) => SHA256_FINGERPRINT_PATTERN.test(fingerprint))
  );
}

function readGradleInteger(source, pattern) {
  const match = source.match(pattern);
  return match ? Number.parseInt(match[1], 10) : undefined;
}

function readGradleString(source, pattern) {
  return source.match(pattern)?.[1];
}

function formatReceived(value) {
  return value === undefined ? "undefined" : String(value);
}
