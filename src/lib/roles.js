/** Where each role lands after signing in. */
export const dashboardPath = (role) => {
  if (role === "admin") return "/admin/dashboard";
  if (role === "trainer") return "/trainer/dashboard";
  return "/member/dashboard";
};
