import { Axios } from "axios";
import { ADMIN_LOGIN_URL } from "./endpoints.ts";

export async function adminLogin(session: Axios, cookies: string) {
  const _ = await session.get(ADMIN_LOGIN_URL, {
    headers: {
      "Cookie": cookies,
    },
  });
}
