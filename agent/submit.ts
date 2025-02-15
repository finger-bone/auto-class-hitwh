import { Axios } from "axios";
import { CourseType, Semester, SemeterToString } from "./adminFetcher.ts";
import * as cheerio from "cheerio";
import { QUERY_LIST_URL, SUBMIT_URL } from "./endpoints.ts";

export async function getToken(
  session: Axios,
  cookies: string,
  courseType: CourseType,
  semester: Semester,
) {
  const formData = new URLSearchParams();
  formData.append("pageXnxq", SemeterToString(semester));
  formData.append("pageXklb", courseType);
  formData.append("pageNo", "1");
  formData.append("pageSize", "20");
  const resp = await session.post(QUERY_LIST_URL, formData, {
    headers: {
      "Cookie": cookies,
    },
  });
  const page$ = cheerio.load(resp.data);
  // find <input type="hidden" id="token" name="token" value="0.6862564138122748">
  const token = page$("input#token").val() as string;
  return token;
}

export async function submitRequest(
  session: Axios,
  cookies: string,
  courseType: CourseType,
  semester: Semester,
  code: string,
): Promise<
  "success" | "notWithinTime" | "alreadySubmitted" | "unknownError"
> {
  const token = await getToken(session, cookies, courseType, semester);
  const formData = new URLSearchParams();
  formData.append("pageXklb", courseType);
  formData.append("pageXnxq", SemeterToString(semester));
  formData.append("rwh", code);
  formData.append("token", token);
  const resp = await session.post(SUBMIT_URL, formData, {
    headers: {
      "Cookie": cookies,
    },
  });
  const notWithinTimeKw = "alert('不在学生选课时间范围内！')";
  // TODO: 教务系统不再时间段内无法测试
  if (resp.data.includes(notWithinTimeKw)) {
    return "notWithinTime";
  } else {
    return "success";
  }
}
