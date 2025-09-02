import * as cheerio from "cheerio";

export type Course = {
  "number": string;
  "code": string;
  "name": string;
  "campus": string;
  "info": string;
  "type": string;
  "department": string;
  "credit": string;
  "duration": string;
  "requirement": string;
  "capacity": string;
};

// 13 栏， 14非体育， 14体育
type ColPattern = "13" | "14NOT-TY" | "14TY";

function th_idx_to_field(idx: number, colPattern: ColPattern): string {
  if (colPattern === "13") {
    switch (idx) {
      case 0:
        return "button";
      case 1:
        return "number";
      case 2:
        return "code";
      case 3:
        return "name";
      case 4:
        return "prerequisite";
      case 5:
        return "qualification";
      case 6:
        return "campus";
      case 7:
        return "info";
      case 8:
        return "type";
      case 9:
        return "department";
      case 10:
        return "credit";
      case 11:
        return "duration";
      case 12:
        return "requirement";
      case 13:
        return "capacity";
    }
    throw new Error(`Invalid index: ${idx}`);
  } else if (colPattern === "14NOT-TY") {
    switch (idx) {
      case 0:
        return "button";
      case 1:
        return "number";
      case 2:
        return "code";
      case 3:
        return "name";
      case 4:
        return "prerequisite";
      case 5:
        return "qualification";
      case 6:
        return "campus";
      case 7:
        return "info";
      case 8:
        return "type";
      case 9:
        return "compulsory";
      case 10:
        return "department";
      case 11:
        return "credit";
      case 12:
        return "duration";
      case 13:
        return "requirement";
      case 14:
        return "capacity";
    }
    throw new Error(`Invalid index: ${idx}`);
  } else if (colPattern === "14TY") {
    switch (idx) {
      case 0:
        return "button";
      case 1:
        return "number";
      case 2:
        return "code";
      case 3:
        return "name";
      case 4:
        return "prerequisite";
      case 5:
        return "qualification";
      case 6:
        return "campus";
      case 7:
        return "info";
      case 8:
        return "schedule-info";
      case 9:
        return "compulsory";
      case 10:
        return "department";
      case 11:
        return "credit";
      case 12:
        return "duration";
      case 13:
        return "requirement";
      case 14:
        return "capacity";
    }
    throw new Error(`Invalid index: ${idx}`);
  }
  throw new Error(`Invalid colPattern: ${colPattern}`);
}

function th_idx_to_field_fallback(idx: number, tdsLength: number) {
  if (tdsLength === 15) {
    return th_idx_to_field(idx, "14NOT-TY");
  } else if (tdsLength === 14) {
    return th_idx_to_field(idx, "13");
  } else {
    if (idx === 0) {
      return "button";
    }
    if (idx === 1) {
      return "number";
    }
    if (idx === 2) {
      return "code";
    }
    if (idx === 3) {
      return "name";
    }
    if (idx === 4) {
      return "prerequisite";
    }
    if (idx === 5) {
      return "qualification";
    }
    if (idx === 6) {
      return "campus";
    }
    if (idx === 7) {
      return "info";
    }
    if (idx === tdsLength - 1) {
      return "capacity";
    }
    if (idx === tdsLength - 2) {
      return "requirement";
    }
    if (idx === tdsLength - 3) {
      return "duration";
    }
    if (idx === tdsLength - 4) {
      return "credit";
    }

    return "unknown";
  }
}

function cleanString(src: string): string {
  // remove all the html tags
  return src.replace("<br>", "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, "\n")
    .trim();
}

export function parseAPage(
  html: string,
  colPattern: ColPattern,
): Array<Course> {
  const $ = cheerio.load(html);
  // find the only tbody with class bot_line
  const tbody = $("table.bot_line").first();
  const trs = tbody.find("tr").toArray();
  return trs.flatMap((tr) => {
    const tds = $(tr).find("td").toArray();
    if (tds.length === 0) return [];
    // deno-lint-ignore no-explicit-any
    const course = {} as any;
    for (let i = 0; i < tds.length; i++) {
      const td = $(tds[i]).html();
      try {
        course[th_idx_to_field(i, colPattern)] = cleanString(td!);
      } catch (e) {
        console.log(`解析时遇到错误：${e} 。\n`);
        console.log(
          `将进入容错模式，之后可能会出现信息缺失。如果之后再出错，请提供 教务系统选课界面截图 ，并开启 issue。\n`,
        );
        course[th_idx_to_field_fallback(i, tds.length)] = cleanString(td!);
      }
    }
    try {
      course["code"] = $(tds[tds.length - 1]).find("input").attr("id")?.split(
        "_",
      )[1];
    } catch {
      return [];
    }
    return [course as Course];
  });
}

export function parseCourses(
  htmls: Record<string, Array<string>>,
): Record<string, Array<Course>> {
  return Object.keys(htmls).reduce((acc, key) => {
    acc[key] = htmls[key].reduce((acc, html) => {
      const coursePattern = (() => {
        if (key === "ty") {
          return "14TY";
        } else {
          return html.includes("课程性质") ? "14NOT-TY" : "13";
        }
      })() as ColPattern;
      acc.push(...parseAPage(html, coursePattern));
      return acc;
    }, [] as Array<Course>);
    return acc;
  }, {} as Record<string, Array<Course>>);
}
