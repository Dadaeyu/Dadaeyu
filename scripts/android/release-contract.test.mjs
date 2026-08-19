import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  findTrackedAndroidReleaseSecrets,
  readAndroidProjectContract,
  validateAndroidReleaseContract
} from "./release-contract.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

const VALID_SHA256_FINGERPRINT =
  "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";

const validContract = {
  twaManifest: {
    host: "dadaeyu.vercel.app",
    packageId: "com.dadaeyou.app",
    versionCode: 2,
    versionName: "1.0.1",
    signingKeyPath: "../../private/android-signing/dadaeyu-upload.jks",
    fingerprints: [VALID_SHA256_FINGERPRINT]
  },
  androidGradle: {
    applicationId: "com.dadaeyou.app",
    versionCode: 2,
    versionName: "1.0.1",
    compileSdk: 36,
    targetSdk: 36
  },
  assetLinks: [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.dadaeyou.app",
        sha256_cert_fingerprints: [VALID_SHA256_FINGERPRINT]
      }
    }
  ]
};

test("Android release contract reports every TWA launch contract drift", () => {
  assert.deepEqual(validateAndroidReleaseContract(validContract), []);

  const errors = validateAndroidReleaseContract({
    twaManifest: {
      host: "example.com",
      packageId: "com.example.app",
      versionCode: 3,
      versionName: "2.0.0",
      signingKeyPath: "android-twa/dadaeyu-upload.jks"
    },
    androidGradle: {
      applicationId: "com.example.app",
      versionCode: 3,
      versionName: "2.0.0",
      compileSdk: 35,
      targetSdk: 35
    },
    assetLinks: [
      {
        relation: ["delegate_permission/common.get_login_creds"],
        target: {
          namespace: "web",
          package_name: "com.example.app",
          sha256_cert_fingerprints: ["not-a-sha256-fingerprint"]
        }
      }
    ]
  });

  assert.deepEqual(errors, [
    "Expected TWA host dadaeyu.vercel.app, received example.com.",
    "Expected Android package com.dadaeyou.app, received com.example.app.",
    "Expected versionCode 2, received 3.",
    "Expected versionName 1.0.1, received 2.0.0.",
    "Expected signing key path ../../private/android-signing/dadaeyu-upload.jks, received android-twa/dadaeyu-upload.jks.",
    "Expected Gradle applicationId com.dadaeyou.app, received com.example.app.",
    "Expected Gradle versionCode 2, received 3.",
    "Expected Gradle versionName 1.0.1, received 2.0.0.",
    "Expected compileSdk 36, received 35.",
    "Expected targetSdk 36, received 35.",
    "Expected assetlinks[0].relation to include delegate_permission/common.handle_all_urls.",
    "Expected assetlinks[0].target.namespace android_app, received web.",
    "Expected assetlinks[0].target.package_name com.dadaeyou.app, received com.example.app.",
    "Expected assetlinks[0].target.sha256_cert_fingerprints to contain SHA-256 fingerprints."
  ]);
});

test("generated Android project matches the TWA package, version, and SDK contract", () => {
  const contract = readAndroidProjectContract(PROJECT_ROOT);

  assert.deepEqual(contract.twaManifest, {
    host: "dadaeyu.vercel.app",
    packageId: "com.dadaeyou.app",
    versionCode: 2,
    versionName: "1.0.1",
    signingKeyPath: "../../private/android-signing/dadaeyu-upload.jks",
    fingerprints: [
      "8A:E2:7B:BB:05:05:25:AB:A6:60:85:75:9F:E4:08:D1:C4:E1:E7:7A:7B:9C:DE:B1:46:0E:73:9E:E1:0C:0B:0C"
    ]
  });
  assert.deepEqual(contract.androidGradle, {
    applicationId: "com.dadaeyou.app",
    versionCode: 2,
    versionName: "1.0.1",
    compileSdk: 36,
    targetSdk: 36
  });
});

test("tracked Android project and Digital Asset Links satisfy the release contract", () => {
  const contract = readAndroidProjectContract(PROJECT_ROOT);

  assert.deepEqual(validateAndroidReleaseContract(contract), []);
  assert.deepEqual(
    contract.twaManifest.fingerprints,
    contract.assetLinks[0].target.sha256_cert_fingerprints
  );
  assert.deepEqual(findTrackedAndroidReleaseSecrets(PROJECT_ROOT), []);
  assert.equal(
    execFileSync("git", ["check-ignore", "private/android-release/checksums.sha256"], {
      cwd: PROJECT_ROOT,
      encoding: "utf8"
    }).trim(),
    "private/android-release/checksums.sha256"
  );
});
