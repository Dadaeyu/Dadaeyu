import assert from "node:assert/strict";
import test from "node:test";
import { isGuestWelcomeEligiblePath, shouldShowGuestWelcome } from "./guestWelcome.ts";

test("guest welcome is shown only when a guest enters the home page", () => {
  assert.equal(isGuestWelcomeEligiblePath("/"), true);
  assert.equal(isGuestWelcomeEligiblePath("/map"), false);
  assert.equal(isGuestWelcomeEligiblePath("/course/12"), false);
  assert.equal(isGuestWelcomeEligiblePath("/login"), false);
  assert.equal(isGuestWelcomeEligiblePath("/signup/check-email"), false);
  assert.equal(isGuestWelcomeEligiblePath("/auth/confirm"), false);
  assert.equal(isGuestWelcomeEligiblePath("/privacy"), false);
  assert.equal(isGuestWelcomeEligiblePath("/account-deletion"), false);
});

test("guest welcome waits for auth and notices and stays dismissed during the current home entry", () => {
  const readyGuest = {
    authLoading: false,
    hasUser: false,
    eligiblePath: true,
    blockedByNotice: false,
    dismissedForEntry: false
  };

  assert.equal(shouldShowGuestWelcome(readyGuest), true);
  assert.equal(shouldShowGuestWelcome({ ...readyGuest, authLoading: true }), false);
  assert.equal(shouldShowGuestWelcome({ ...readyGuest, hasUser: true }), false);
  assert.equal(shouldShowGuestWelcome({ ...readyGuest, blockedByNotice: true }), false);
  assert.equal(shouldShowGuestWelcome({ ...readyGuest, dismissedForEntry: true }), false);
  assert.equal(shouldShowGuestWelcome({ ...readyGuest, eligiblePath: false }), false);
});
