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

// 表头文字 → 字段名。教务系统选课表列结构经常变，这里按表头名做映射，
// 而不是按固定列索引，避免“Invalid index: N”这类错位。
const HEADER_RULES: Array<[RegExp, string]> = [
  [/课程代码/, "code"],
  [/课程名称/, "name"],
  [/前置课程/, "prerequisite"],
  [/面向对象/, "qualification"],
  [/校区/, "campus"],
  [/上课信息/, "info"],
  [/排课信息/, "schedule-info"],
  [/课程类别/, "type"],
  [/课程性质/, "compulsory"],
  [/开课院系/, "department"],
  [/学分/, "credit"],
  [/学时/, "duration"],
  [/备注信息/, "remark"],
  [/选课要求/, "requirement"],
  [/已选\/容量/, "capacity"],
  [/容量/, "capacity"],
  [/序号/, "number"],
];

function cleanString(src: string): string {
  // remove all the html tags
  return src.replace("<br>", "\n")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, "\n")
    .trim();
}

function normalizeHeader(text: string): string {
  // 去掉排序箭头和空白
  return text.replace(/[↑↓\s]/g, "");
}

// 从表头 <th> 读出一列对应字段名；第一列通常是选择框/序号按钮，返回 "button"。
function buildFieldMap(
  $: cheerio.CheerioAPI,
  // deno-lint-ignore no-explicit-any
  table: any,
): string[] {
  const headerTr = table.find("tr").first();
  const ths = headerTr.find("th").toArray();
  return ths.map((th: any) => {
    const text = normalizeHeader($(th).text());
    if (text === "") return "button";
    for (const [re, field] of HEADER_RULES) {
      if (re.test(text)) return field;
    }
    return "unknown";
  });
}

export function parseAPage(html: string): Array<Course> {
  const $ = cheerio.load(html);
  // find the only tbody with class bot_line
  const table = $("table.bot_line").first();
  const fieldMap = buildFieldMap($, table);
  const trs = table.find("tr").toArray();
  return trs.flatMap((tr) => {
    const tds = $(tr).find("td").toArray();
    // 表头行是 <th>，没有 <td>，跳过
    if (tds.length === 0) return [];
    // deno-lint-ignore no-explicit-any
    const course = {} as any;
    for (let i = 0; i < tds.length; i++) {
      const field = fieldMap[i] ?? "unknown";
      course[field] = cleanString($(tds[i]).html() ?? "");
    }
    try {
      // rwh（选课用的课程标识）放在最后一列的 input 的 id 里，形如 xxx_<rwh>
      const inputId = $(tds[tds.length - 1]).find("input").attr("id");
      course["code"] = inputId?.split("_")[1] ?? course["code"] ?? "";
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
      acc.push(...parseAPage(html));
      return acc;
    }, [] as Array<Course>);
    return acc;
  }, {} as Record<string, Array<Course>>);
}
