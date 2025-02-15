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

type ColPattern = "13" | "14";

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
  } else if (colPattern === "14") {
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
  }
  throw new Error(`Invalid colPattern: ${colPattern}`);
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
      course[th_idx_to_field(i, colPattern)] = cleanString(td!);
    }
    return [course as Course];
  });
}

export function parseCourses(
  htmls: Record<string, Array<string>>,
): Record<string, Array<Course>> {
  return Object.keys(htmls).reduce((acc, key) => {
    acc[key] = htmls[key].reduce((acc, html) => {
      const coursePattern = html.includes("课程性质") ? "14" : "13";
      acc.push(...parseAPage(html, coursePattern));
      return acc;
    }, [] as Array<Course>);
    return acc;
  }, {} as Record<string, Array<Course>>);
}
