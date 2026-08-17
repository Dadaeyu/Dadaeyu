import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { readAndroidProjectContract, validateAndroidReleaseContract } from "./release-contract.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("../../", import.meta.url));

const VALID_SHA256_FINGERPRINT =
  "AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99";

const validContract = {
  twaManifest: {
    host: "dadaeyu.vercel.app",
    packageId: "kr.dadaeyu.app",
    versionCode: 1,
    versionName: "1.0.0"
  },
  androidGradle: {
    compileSdk: 36,
    targetSdk: 36
  },
  assetLinks: [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "kr.dadaeyu.app",
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
      versionCode: 2,
      versionName: "2.0.0"
    },
    androidGradle: {
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
    "Expected Android package kr.dadaeyu.app, received com.example.app.",
    "Expected versionCode 1, received 2.",
    "Expected versionName 1.0.0, received 2.0.0.",
    "Expected compileSdk 36, received 35.",
    "Expected targetSdk 36, received 35.",
    "Expected assetlinks[0].relation to include delegate_permission/common.handle_all_urls.",
    "Expected assetlinks[0].target.namespace android_app, received web.",
    "Expected assetlinks[0].target.package_name kr.dadaeyu.app, received com.example.app.",
    "Expected assetlinks[0].target.sha256_cert_fingerprints to contain SHA-256 fingerprints."
  ]);
});

test("generated Android project matches the TWA package, version, and SDK contract", () => {
  const contract = readAndroidProjectContract(PROJECT_ROOT);

  assert.deepEqual(contract.twaManifest, {
    host: "dadaeyu.vercel.app",
    packageId: "kr.dadaeyu.app",
    versionCode: 1,
    versionName: "1.0.0"
  });
  assert.deepEqual(contract.androidGradle, {
    compileSdk: 36,
    targetSdk: 36
  });
});
