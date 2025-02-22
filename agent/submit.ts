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
  | "success"
  | "notWithinTime"
  | "notForThisGrade"
  | "illegalOperation"
  | "alreadySubmitted"
  | "failed"
  | "unknownError"
  | "outOfCapacity"
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
  const illegalOperationKw = "alert('非法操作！');";
  const duplicateSubmissionKw = "alert('此课程已选，不可重复选课！');";
  const successKw = "alert('选课成功');";
  const failedKw = "alert('选课失败');";
  const notForThisGradeKw = "alert('学生不在面向年级内，不可选课！');";
  const outOfCapacityKw = "alert('总容量已满，请选择其它课程！');";
  if (resp.data.includes(notWithinTimeKw)) {
    return "notWithinTime";
  } else if (resp.data.includes(illegalOperationKw)) {
    return "illegalOperation";
  } else if (resp.data.includes(successKw)) {
    return "success";
  } else if (resp.data.includes(duplicateSubmissionKw)) {
    return "alreadySubmitted";
  } else if (resp.data.includes(failedKw)) {
    return "failed";
  } else if (resp.data.includes(notForThisGradeKw)) {
    return "notForThisGrade";
  } else if (resp.data.includes(outOfCapacityKw)) {
    return "outOfCapacity";
  } else {
    return "unknownError";
  }
}
