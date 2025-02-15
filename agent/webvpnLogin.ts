import { Axios } from "axios";
import { Buffer } from "node:buffer";
import * as cheerio from "cheerio";
import {
  AUTHORIZATION_URL,
  LOGIN_PAGE_URL,
  LOGIN_SUFFIX,
  QRCODE_FILE,
} from "./endpoints.ts";

export async function getQRCode(
  session: Axios,
): Promise<{ uuid: string; qrCodeUrl: string }> {
  // 获取 token
  const uuidResponse = await session.get(
    `${AUTHORIZATION_URL}/qrCode/getToken?vpn-12-o2-ids.hit.edu.cn&ts=${
      new Date().getTime()
    }`,
  );
  const uuid = uuidResponse.data;

  const qrCodeUrl = `${AUTHORIZATION_URL}/qrCode/getCode?vpn-1&uuid=${uuid}`;
  const qrCodeResponse = await session.get(qrCodeUrl, {
    responseType: "arraybuffer",
  });
  const qrCodeBuffer = Buffer.from(qrCodeResponse.data, "binary");
  await Deno.writeFile(QRCODE_FILE, qrCodeBuffer);
  return { uuid, qrCodeUrl };
}

export async function getQRCodeStatus(session: Axios, uuid: string): Promise<
  "idle" | "scanned" | "expired" | "confirmed"
> {
  const endpoint =
    `${AUTHORIZATION_URL}/qrCode/getStatus.htl?vpn-12-o2-ids.hit.edu.cn&ts=${
      new Date().getTime()
    }&uuid=${uuid}`;
  const response = await session.get(endpoint);
  const data = response.data;
  if (data === 2) {
    return "scanned";
  } else if (data === 1) {
    return "confirmed";
  } else if (data === 3) {
    return "expired";
  }
  return "idle";
}

export async function webvpnLogin(session: Axios, uuid: string) {
  const loginPageResp = await session.get(LOGIN_PAGE_URL);
  const loginPage$ = cheerio.load(loginPageResp.data);
  const execution = loginPage$("input#execution").val() as string;
  const formData = new URLSearchParams();
  formData.append("lt", "");
  formData.append("uuid", uuid);
  formData.append("cllt", "qrLogin");
  formData.append("dllt", "generalLogin");
  formData.append("_eventId", "submit");
  formData.append("rmShown", "1");
  formData.append("execution", execution);
  const cookieResp = await session.get(LOGIN_PAGE_URL);
  const cookies = cookieResp.headers["set-cookie"]!.join("; ");
  const _ = await session.post(
    `${AUTHORIZATION_URL}${LOGIN_SUFFIX}`,
    formData,
    {
      headers: {
        "Cookie": cookies,
      },
    },
  );
  return cookies;
}
