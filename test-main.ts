import axios from "axios";
import {
  getQRCode,
  getQRCodeStatus,
  webvpnLogin,
} from "./agent/webvpnLogin.ts";
import { configureHeaders } from "./agent/configure.ts";
import { fetchCourses } from "./agent/adminFetcher.ts";
import { adminLogin } from "./agent/adminLogin.ts";
import { parseCourses } from "./parser/courseParser.ts";
import { fetchCoursesByPage } from "./agent/adminFetcher.ts";
import { submitRequest } from "./agent/submit.ts";

const session = axios.create({
  withCredentials: true,
});

configureHeaders(session);
const { uuid, qrCodeUrl } = await getQRCode(session);
let loggedIn = false;
while (!loggedIn) {
  const status = await getQRCodeStatus(session, uuid);
  if (status === "confirmed") {
    loggedIn = true;
  }
  console.log(status);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

const cookies = await webvpnLogin(session, uuid);
await adminLogin(session, cookies);
console.log(cookies);
// const cookies = "wengine_vpn_ticketwebvpn_hitwh_edu_cn=17f408fd53b9ba2f; Path=/; Domain=webvpn.hitwh.edu.cn; HttpOnly; refresh=1; Path=/"
const courses = await fetchCourses(session, cookies, ["yy", "xsxk", "szhx"], {
  yearStart: 2022,
  semesterOrder: 2,
});
const parsedCourses = parseCourses(courses);
console.log(parsedCourses);

console.log(
  await submitRequest(session, cookies, "xsxk", {
    yearStart: 2022,
    semesterOrder: 2,
  }, "22WHCS21002"),
);
