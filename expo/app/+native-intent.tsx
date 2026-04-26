import { Redirect } from "expo-router";

export function redirectSystemPath(path: string, _initial: boolean) {
  console.log("[redirectSystemPath] path", path);
  if (path && path !== "/") {
    return path;
  }
  return <Redirect href="/" />;
}
