export const ANDROID_RELEASE_CONTRACT = Object.freeze({
  host: "dadaeyu.vercel.app",
  packageName: "kr.dadaeyu.app",
  versionCode: 1,
  versionName: "1.0.0",
  compileSdk: 36,
  targetSdk: 36,
  assetLinksRelation: "delegate_permission/common.handle_all_urls",
  assetLinksNamespace: "android_app"
});

const SHA256_FINGERPRINT_PATTERN = /^[0-9A-F]{2}(?::[0-9A-F]{2}){31}$/u;

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

function formatReceived(value) {
  return value === undefined ? "undefined" : String(value);
}
