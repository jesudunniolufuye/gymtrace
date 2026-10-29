/** Turns Firebase Auth error codes into messages we can show users. */
export const authErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Invalid credentials. Check your email and password.";
    case "auth/too-many-requests":
      // Firebase throttles repeated failed attempts (NFR5).
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/email-already-in-use":
      return "This email is already registered.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/user-disabled":
      return "This account has been deactivated. Please contact the Fitness Centre front desk.";
    default:
      return fallback;
  }
};
