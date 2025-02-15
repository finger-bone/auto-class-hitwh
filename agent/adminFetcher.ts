import { Axios, AxiosError } from "axios";
import * as cheerio from "cheerio";
import { QUERY_LIST_URL } from "./endpoints.ts";

export type CourseType =
  | "yy"
  | "ty"
  | "szhx"
  | "cxyx"
  | "cxsy"
  | "xsyt"
  | "tsk"
  | "xsxk";

export type Semester = {
  "yearStart": number;
  "semesterOrder": 1 | 2 | 3;
};

const MAX_RETRY_COUNT = 3;

export function SemeterToString(semeter: Semester) {
  return `${semeter.yearStart}-${
    semeter.yearStart + 1
  }${semeter.semesterOrder}`;
}

export async function fetchCoursesByPage(
  session: Axios,
  cookies: string,
  courseType: CourseType,
  semester: Semester,
  page: number,
  pageCount: number | undefined = undefined,
): Promise<{ result: string; pageCount: number }> {
  const formData = new URLSearchParams();
  formData.append("pageXnxq", SemeterToString(semester));
  formData.append("pageXklb", courseType);
  formData.append("pageNo", page.toString());
  formData.append("pageSize", "20");
  if (!pageCount) {
    const resp = await session.post(QUERY_LIST_URL, formData, {
      headers: {
        "Cookie": cookies,
      },
    });
    const page$ = cheerio.load(resp.data);
    // find <input type="hidden" id="pageCount" name="pageCount" value="4" />
    let pageCount = Number.parseInt(
      page$("input#pageCount").val() as string,
    ) as number;
    if (!pageCount) {
      pageCount = 1;
    }
    return fetchCoursesByPage(
      session,
      cookies,
      courseType,
      semester,
      page,
      pageCount,
    );
  } else {
    formData.append("pageCount", pageCount.toString());
    const resp = await session.post(QUERY_LIST_URL, formData, {
      headers: {
        "Cookie": cookies,
      },
    });
    return {
      result: resp.data,
      pageCount: pageCount,
    };
  }
}

export async function fetchCourses(
  session: Axios,
  cookies: string,
  courseTypes: Array<CourseType>,
  semester: Semester,
  onEachPage: (page: number, pageCount: number | undefined) => void = (
    ..._
  ) => {},
  onEachType: (type: CourseType) => void = (..._) => {},
): Promise<Record<CourseType, Array<string>>> {
  const result: Record<CourseType, Array<string>> = {
    yy: [],
    ty: [],
    szhx: [],
    cxyx: [],
    cxsy: [],
    xsyt: [],
    tsk: [],
    xsxk: [],
  };
  for (const courseType of courseTypes) {
    onEachType(courseType);
    let page = 1;
    let pageCount: number | undefined = undefined;
    result[courseType] = [];
    do {
      onEachPage(page, pageCount);
      let resp = undefined;
      let retry = 0;
      while (!resp) {
        try {
          resp = await fetchCoursesByPage(
            session,
            cookies,
            courseType,
            semester,
            page,
            pageCount,
          );
        } catch (e) {
          if (e instanceof AxiosError) {
            if (e.response?.status === 404) {
              break;
            }
          }
          retry++;
          if (retry >= MAX_RETRY_COUNT) {
            throw e;
          }
          continue;
        }
      }
      page++;
      if (!resp) break;
      pageCount = resp.pageCount;
      result[courseType].push(resp.result);
    } while (pageCount && page <= pageCount);
  }
  return result;
}
