type GuestWelcomeState = {
  authLoading: boolean;
  hasUser: boolean;
  eligiblePath: boolean;
  blockedByNotice: boolean;
  dismissedForEntry: boolean;
};

export function isGuestWelcomeEligiblePath(pathname: string) {
  return pathname === "/";
}

export function shouldShowGuestWelcome(state: GuestWelcomeState) {
  return (
    !state.authLoading &&
    !state.hasUser &&
    state.eligiblePath &&
    !state.blockedByNotice &&
    !state.dismissedForEntry
  );
}
